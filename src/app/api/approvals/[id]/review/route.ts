import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval, User, Customer, Product, Payment, Reservation, Cost } from '@/models';
import { put, del } from '@vercel/blob';
import { list } from '@vercel/blob';

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
      
      // Skip if attachment already has a proper URL (not from general folder)
      if (!filePath || !filePath.includes('uploads/general/')) {
        movedAttachments.push(attachment);
        continue;
      }

      // Extract filename from the general path
      const generalPath = filePath;
      const filename = generalPath.split('/').pop();
      
      if (!filename) {
        console.warn('Could not extract filename from:', generalPath);
        movedAttachments.push(attachment);
        continue;
      }

      // Find the file in Vercel Blob
      const sourceBlob = blobs.find(blob => blob.pathname.includes(filename) || blob.pathname.endsWith(filename));
      
      if (!sourceBlob) {
        console.warn('File not found in Vercel Blob:', filename);
        movedAttachments.push(attachment);
        continue;
      }

      // Determine target folder based on resource type
      const targetFolder = getResourceUploadFolder(resourceType);
      
      // Generate new filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = filename.split('.').pop();
      const baseName = filename.replace(/\.[^/.]+$/, '');
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

      // Update attachment with new URL
      movedAttachments.push({
        ...attachment,
        link: newUrl,
        url: newUrl // Add both fields for compatibility
      });

      console.log(`✅ Moved file from ${generalPath} to ${targetPath}`);
    } catch (error) {
      console.error('Error moving attachment:', attachment, error);
      // Keep original attachment if move fails
      movedAttachments.push(attachment);
    }
  }

  return movedAttachments;
}

// Helper function to get the correct upload folder for each resource type
function getResourceUploadFolder(resourceType: string): string {
  switch (resourceType) {
    case 'customer':
      return 'uploads/customers/documents';
    case 'payment':
      return 'uploads/payment';
    case 'item':
    case 'product':
      return 'uploads/products';
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
      console.log('🔄 Moving attachments for approval:', approval._id);
      try {
        const movedAttachments = await moveAttachmentsToResourceFolder(
          fieldsToUpdate.attachments,
          approval.resourceType
        );
        fieldsToUpdate.attachments = movedAttachments;
        console.log('✅ Attachments moved successfully');
      } catch (error) {
        console.error('❌ Error moving attachments:', error);
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