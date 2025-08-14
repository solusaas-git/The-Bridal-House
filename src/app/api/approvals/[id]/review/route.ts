import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval, User, Customer, Product, Payment, Reservation, Cost, getFileTypeFromExtension } from '@/models';
import { put, del } from '@vercel/blob';
import { list } from '@vercel/blob';

// Normalize reservation fields coming from approvals UI to DB-friendly shapes
function normalizeReservationUpdate(update: any) {
  if (!update || typeof update !== 'object') return update;
  const normalized: any = { ...update };

  // Ensure items is an array of ObjectId strings
  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.map((item: any) => {
      if (typeof item === 'string') return item; // already an id
      if (item && typeof item === 'object') {
        return item.id || item._id || String(item);
      }
      return item;
    });
  }

  // Normalize client to id string
  if (normalized.client && typeof normalized.client === 'object') {
    normalized.client = normalized.client._id || normalized.client.id || normalized.client;
  }

  // Parse numeric fields that may arrive as strings
  const numericFields = [
    'additionalCost',
    'securityDepositAmount',
    'advanceAmount',
    'itemsTotal',
    'subtotal',
    'total',
  ];
  for (const field of numericFields) {
    if (field in normalized && normalized[field] !== null && normalized[field] !== undefined) {
      const value = normalized[field];
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (!Number.isNaN(num)) normalized[field] = num;
    }
  }

  // Normalize date-time fields to preserve exact input time by appending Z if missing
  const dateTimeFields = ['pickupDate', 'returnDate', 'availabilityDate'];
  for (const field of dateTimeFields) {
    const val = normalized[field];
    if (typeof val === 'string') {
      // If it's a combined ISO-like without timezone, add seconds/ms and Z
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
        normalized[field] = `${val}:00.000Z`;
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) {
        normalized[field] = `${val}.000Z`;
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(val) && !val.endsWith('Z')) {
        normalized[field] = `${val}Z`;
      }
    }
  }

  return normalized;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action, comment } = await request.json(); // action: 'approve' or 'reject'

    const user = await User.findById(session.userId);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const approval = await Approval.findById(id);
    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: 'Approval already reviewed' },
        { status: 400 }
      );
    }

    approval.status = action === 'approve' ? 'approved' : 'rejected';
    approval.reviewedBy = session.userId;
    approval.reviewedAt = new Date();
    approval.reviewComment = comment;

    await approval.save();

    // If approved, execute the action
    if (action === 'approve') {
      try {
        await executeApprovedAction(approval);
      } catch (executeError) {
        console.error('Error executing approved action:', executeError);
        // Revert approval status
        approval.status = 'pending';
        approval.reviewedBy = undefined;
        approval.reviewedAt = undefined;
        approval.reviewComment = undefined;
        await approval.save();
        
        return NextResponse.json(
          { error: 'Failed to execute approved action' },
          { status: 500 }
        );
      }
    }

    await approval.populate('requestedBy', 'name email');
    await approval.populate('reviewedBy', 'name email');

    return NextResponse.json({
      message: `Request has been ${action === 'approve' ? 'approved and executed' : 'rejected'}`,
      approval,
    });
  } catch (error) {
    console.error('Error reviewing approval:', error);
    return NextResponse.json(
      { error: 'Failed to review approval' },
      { status: 500 }
    );
  }
}

// Helper function to move files from general folder to resource-specific folder
async function moveAttachmentsToResourceFolder(attachments: any[], resourceType: string): Promise<any[]> {
  if (!attachments || attachments.length === 0) return attachments;

  const { blobs } = await list();
  const movedAttachments = [];

  for (const attachment of attachments) {
    try {
      // Check both 'link' and 'url' fields for the file path
      const filePath = attachment.link || attachment.url;
      
      // Skip if attachment already has a proper URL (not from approval folder)
      if (!filePath || !filePath.includes('approvals/')) {
        movedAttachments.push(attachment);
        continue;
      }

      // Extract filename from the approval path
      const approvalPath = filePath;
      const filename = approvalPath.split('/').pop();
      
      if (!filename) {
        console.warn('Could not extract filename from:', approvalPath);
        movedAttachments.push(attachment);
        continue;
      }

      // Decode URL encoded filename for comparison
      const decodedFilename = decodeURIComponent(filename);

      // Find the file in Vercel Blob - try both encoded and decoded versions
      const sourceBlob = blobs.find(blob => 
        blob.pathname.includes(filename) || 
        blob.pathname.includes(decodedFilename) ||
        blob.pathname.endsWith(filename) || 
        blob.pathname.endsWith(decodedFilename) ||
        blob.url.includes(filename) ||
        blob.url.includes(decodedFilename)
      );
      
      if (!sourceBlob) {
        console.warn('File not found in Vercel Blob:', filename);
        movedAttachments.push(attachment);
        continue;
      }

      // Determine target folder based on resource type and file type
      const targetFolder = getResourceUploadFolder(resourceType, filename);
      
      // Generate new filename with timestamp to avoid conflicts
      // Use decoded filename for cleaner file names
      const timestamp = Date.now();
      const fileExtension = decodedFilename.split('.').pop();
      const baseName = decodedFilename.replace(/\.[^/.]+$/, '');
      const newFilename = `${timestamp}-${baseName}.${fileExtension}`;
      const targetPath = `${targetFolder}/${newFilename}`;

      // Download the file content
      const response = await fetch(sourceBlob.url);
      const fileBuffer = await response.arrayBuffer();

      // Upload to new location
      const { url: newUrl } = await put(targetPath, fileBuffer, {
        access: 'public',
      });

      // Delete the old file
      await del(sourceBlob.url);

      // Update attachment with new URL while preserving all original fields
      // Handle different attachment schemas across models
      const updatedAttachment: any = {
        ...attachment, // Preserve all original fields
        link: newUrl,  // Customer model uses 'link'
        url: newUrl,   // Payment and Cost models use 'url'
      };

      // Ensure required fields are present with fallbacks
      if (!updatedAttachment.name) {
        updatedAttachment.name = decodedFilename || 'Unknown';
      }
      if (!updatedAttachment.size) {
        // If size is missing, try to get it from the fetched file or set a default
        try {
          const fileSize = parseInt(response.headers.get('content-length') || '0');
          updatedAttachment.size = fileSize || 0;
        } catch {
          updatedAttachment.size = 0;
        }
      }
      if (!updatedAttachment.type) {
        // Infer type from file extension
        updatedAttachment.type = getFileTypeFromExtension(decodedFilename || updatedAttachment.name || '');
      }
      if (!updatedAttachment.uploadedAt) {
        updatedAttachment.uploadedAt = new Date();
      }



      movedAttachments.push(updatedAttachment);

      console.log(`✅ Moved file from ${approvalPath} to ${targetPath}`);
    } catch (error) {
      console.error('Error moving attachment:', attachment, error);
      // Keep original attachment if move fails, but ensure required fields
      const fallbackName = attachment.name || 'Unknown';
      const fallbackAttachment = {
        ...attachment,
        name: fallbackName,
        url: attachment.url || attachment.link || '',
        size: attachment.size || 0,
        type: attachment.type || getFileTypeFromExtension(fallbackName),
        uploadedAt: attachment.uploadedAt || new Date()
      };

      movedAttachments.push(fallbackAttachment);
    }
  }

  return movedAttachments;
}


// Helper function to get the correct production upload folder for each resource type and file type
function getResourceUploadFolder(resourceType: string, filename: string): string {
  // Determine file type from extension
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  
  let fileType = 'documents'; // Default
  if (imageExts.includes(extension)) {
    fileType = 'images';
  } else if (videoExts.includes(extension)) {
    fileType = 'videos';
  }

  switch (resourceType) {
    case 'customer':
      return `uploads/customers/${fileType}`;
    case 'payment':
      return 'uploads/payment';
    case 'item':
    case 'product':
      return `uploads/products/${fileType}`;
    case 'reservation':
      return 'uploads/reservations';
    case 'cost':
      return 'uploads/costs';
    default:
      return 'uploads/general';
  }
}

// Helper function to execute approved actions
async function executeApprovedAction(approval: any) {
  if (approval.actionType === 'delete') {
    switch (approval.resourceType) {
      case 'customer':
        await Customer.findByIdAndDelete(approval.resourceId);
        break;
      case 'item':
      case 'product':
        await Product.findByIdAndDelete(approval.resourceId);
        break;
      case 'payment':
        // Get payment before deletion to update reservation status
        const paymentToDelete = await Payment.findById(approval.resourceId);
        await Payment.findByIdAndDelete(approval.resourceId);
        // Update reservation payment status after deleting a payment
        if (paymentToDelete?.reservation) {
          const { updateReservationPaymentStatus } = await import('@/utils/reservation');
          await updateReservationPaymentStatus(paymentToDelete.reservation.toString());
        }
        break;
      case 'reservation':
        await Reservation.findByIdAndDelete(approval.resourceId);
        break;
      case 'cost':
        await Cost.findByIdAndDelete(approval.resourceId);
        break;
    }
  } else if (approval.actionType === 'edit') {
    // For edit actions, use only the changed fields from newData
    let fieldsToUpdate = approval.newData || {};
    
    // Move attachments from general folder to resource-specific folder if needed
    if (fieldsToUpdate.attachments) {
      try {
        const movedAttachments = await moveAttachmentsToResourceFolder(
          fieldsToUpdate.attachments,
          approval.resourceType
        );
        fieldsToUpdate.attachments = movedAttachments;
      } catch (error) {
        console.error('Error moving attachments:', error);
        // Continue with original attachments if move fails
      }
    }
    
    // Only proceed if there are fields to update
    if (Object.keys(fieldsToUpdate).length > 0) {
      switch (approval.resourceType) {
        case 'customer':
          await Customer.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
        case 'item':
        case 'product':
          await Product.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
        case 'payment':
          // Special handling for attachments to merge with existing ones
          if (fieldsToUpdate.attachments || fieldsToUpdate.deletedAttachments) {
            const currentPayment = await Payment.findById(approval.resourceId);
            const currentAttachments = currentPayment?.attachments || [];
            const newAttachments = fieldsToUpdate.attachments || [];  // Only new attachments now
            const deletedAttachments = fieldsToUpdate.deletedAttachments || [];
            
            // Filter out deleted attachments from current ones
            const remainingCurrentAttachments = currentAttachments.filter((current: any) => 
              !deletedAttachments.some((deleted: any) => 
                (current.url || current.link) === (deleted.url || deleted.link)
              )
            );
            
            // Combine remaining current + new attachments (no duplication)
            const combinedAttachments = [...remainingCurrentAttachments, ...newAttachments];
            
            fieldsToUpdate.attachments = combinedAttachments;
            
            // Remove deletedAttachments from the update data as it's not a valid field
            delete fieldsToUpdate.deletedAttachments;
          }
          
          const updatedPayment = await Payment.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          // Update reservation payment status when editing a payment
          if (updatedPayment?.reservation) {
            const { updateReservationPaymentStatus } = await import('@/utils/reservation');
            await updateReservationPaymentStatus(updatedPayment.reservation);
          }
          break;
        case 'reservation':
          // Convert UI-friendly shapes (items as objects with {id,name,image}) to DB schema
          fieldsToUpdate = normalizeReservationUpdate(fieldsToUpdate);
          const updatedReservation = await Reservation.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          // Update reservation payment status when editing a reservation
          if (updatedReservation?._id) {
            const { updateReservationPaymentStatus } = await import('@/utils/reservation');
            await updateReservationPaymentStatus(updatedReservation._id.toString());
          }
          break;
        case 'cost':
          // Special handling for attachments to merge with existing ones
          if (fieldsToUpdate.attachments || fieldsToUpdate.deletedAttachments) {
            const currentCost = await Cost.findById(approval.resourceId);
            const currentAttachments = currentCost?.attachments || [];
            const newAttachments = fieldsToUpdate.attachments || [];  // Only new attachments now
            const deletedAttachments = fieldsToUpdate.deletedAttachments || [];
            
            // Filter out deleted attachments from current ones
            const remainingCurrentAttachments = currentAttachments.filter((current: any) => 
              !deletedAttachments.some((deleted: any) => 
                (current.url || current.link) === (deleted.url || deleted.link)
              )
            );
            
            // Combine remaining current + new attachments (no duplication)
            const combinedAttachments = [...remainingCurrentAttachments, ...newAttachments];
            
            fieldsToUpdate.attachments = combinedAttachments;
            
            // Remove deletedAttachments from the update data as it's not a valid field
            delete fieldsToUpdate.deletedAttachments;
          }
          
          await Cost.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
      }
    }
  } else if (approval.actionType === 'create') {
    // For create actions, use the full data from newData
    let dataToCreate = approval.newData || {};
    
    // Move attachments from general folder to resource-specific folder if needed
    if (dataToCreate.attachments) {
      console.log('🔄 Moving attachments for new resource creation:', approval._id);
      try {
        const movedAttachments = await moveAttachmentsToResourceFolder(
          dataToCreate.attachments,
          approval.resourceType
        );
        dataToCreate.attachments = movedAttachments;
        console.log('✅ Attachments moved successfully for new resource');
      } catch (error) {
        console.error('❌ Error moving attachments for new resource:', error);
        // Continue with original attachments if move fails
      }
    }
    
    // Create the new resource
    if (Object.keys(dataToCreate).length > 0) {
      switch (approval.resourceType) {
        case 'customer':
          await Customer.create(dataToCreate);
          break;
        case 'item':
        case 'product':
          await Product.create(dataToCreate);
          break;
        case 'payment':
          const newPayment = await Payment.create(dataToCreate);
          // Update reservation payment status when creating a payment
          if (newPayment.reservation) {
            const { updateReservationPaymentStatus } = await import('@/utils/reservation');
            await updateReservationPaymentStatus(newPayment.reservation);
          }
          break;
        case 'reservation':
          await Reservation.create(dataToCreate);
          break;
        case 'cost':
          await Cost.create(dataToCreate);
          break;
      }
    }
  }
} 