import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment, getFileTypeFromExtension } from '@/models';
import { handleSingleFileUpload, type UploadedFile } from '@/lib/upload';
import { deleteFromVercelBlob } from '@/lib/vercel-blob';
import { updateReservationPaymentStatus } from '@/utils/reservation';

interface PaymentUpdateData {
  client?: string;
  reservation?: string;
  paymentDate?: string;
  paymentTime?: string;
  amount?: string | number; // Allow both string and number
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType?: 'Advance' | 'Security' | 'Final' | 'Other';
  reference?: string;
  note?: string;
  attachments?: Array<{
    name: string;
    size: number;
    url: string;
  }>;
}

// GET /api/payments/[id] - Get payment by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    const payment = await Payment
      .findById(id)
      .populate('client', 'firstName lastName email phone address')
      .populate({
        path: 'reservation',
        select: 'reservationNumber eventDate eventTime eventLocation items',
        populate: {
          path: 'items',
          select: 'name primaryPhoto rentalCost size'
        }
      })
      .populate('createdBy', 'name email');

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: 'Payment not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch payment',
    }, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update payment
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with file uploads
      const formData = await request.formData();
      
      const updateData: PaymentUpdateData = {
        client: formData.get('client') as string || undefined,
        reservation: formData.get('reservation') as string || undefined,
        paymentDate: formData.get('paymentDate') as string || undefined,
        paymentTime: formData.get('paymentTime') as string || undefined,
        amount: formData.get('amount') as string || undefined,
        paymentMethod: formData.get('paymentMethod') as PaymentUpdateData['paymentMethod'] || undefined,
        paymentType: formData.get('paymentType') as PaymentUpdateData['paymentType'] || undefined,
        reference: formData.get('reference') as string || undefined,
        note: formData.get('note') as string || undefined,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof PaymentUpdateData] === undefined) {
          delete updateData[key as keyof PaymentUpdateData];
        }
      });

      // Handle existing attachments
      const existingAttachments = formData.get('existingAttachments');
      if (existingAttachments) {
        try {
          const parsedExisting = JSON.parse(existingAttachments as string);
          
          // Get current payment to find deleted attachments
          const currentPayment = await Payment.findById(id);
          const currentAttachments = currentPayment?.attachments || [];
          
          // Find attachments that were deleted (exist in DB but not in form data)
          const deletedAttachments = currentAttachments.filter((currentAtt: any) => 
            !parsedExisting.some((existingAtt: any) => existingAtt.url === currentAtt.url)
          );
          
          // Delete files from Vercel Blob storage
          if (deletedAttachments.length > 0) {
            console.log(`🗑️ Deleting ${deletedAttachments.length} removed payment attachment files`);
            for (const deletedAtt of deletedAttachments) {
              try {
                if (deletedAtt.url) {
                  await deleteFromVercelBlob(deletedAtt.url);
                  console.log(`✅ Deleted payment file: ${deletedAtt.name}`);
                }
              } catch (deleteError) {
                console.error(`❌ Failed to delete payment file: ${deletedAtt.name}`, deleteError);
                // Continue with other deletions
              }
            }
          }
          
          updateData.attachments = parsedExisting;
        } catch {
          updateData.attachments = [];
        }
      }

      // Handle file uploads
      const files = formData.getAll('attachments') as File[];
      const attachments: UploadedFile[] = [];

      for (const file of files) {
        if (file instanceof File && file.size > 0) {
          const uploadedFile = await handleSingleFileUpload(file, 'uploads/payment');
          attachments.push(uploadedFile);
        }
      }

      const paymentAttachments = attachments.map((file: UploadedFile) => ({
        name: file.name,
        size: file.size,
        url: file.url,
        type: getFileTypeFromExtension(file.name),
        uploadedAt: new Date()
      }));

      // Combine date and time if both are provided
      if (updateData.paymentDate && updateData.paymentTime) {
        updateData.paymentDate = `${updateData.paymentDate}T${updateData.paymentTime}`;
        delete updateData.paymentTime; // Remove the separate time field
      }

      // Add attachments if any were uploaded
      if (paymentAttachments.length > 0) {
        updateData.attachments = paymentAttachments;
      }

      // Convert amount to number if provided
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount.toString());
      }

      const updatedPayment = await Payment.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('client', 'firstName lastName email phone address')
        .populate({
          path: 'reservation',
          select: 'reservationNumber eventDate eventTime eventLocation items',
          populate: {
            path: 'items',
            select: 'name primaryPhoto rentalCost size'
          }
        })
        .populate('createdBy', 'name email');

      if (!updatedPayment) {
        return NextResponse.json({
          success: false,
          message: 'Payment not found',
        }, { status: 404 });
      }

      // Update reservation payment status and remaining balance
      try {
        await updateReservationPaymentStatus(updatedPayment.reservation);
      } catch (error) {
        console.error('Error updating reservation payment status:', error);
        // Don't fail the payment update if reservation update fails
      }

      return NextResponse.json({
        success: true,
        message: 'Payment updated successfully',
        payment: updatedPayment,
      });
    } else {
      // Handle JSON data
      const updateData: PaymentUpdateData = await request.json();

      // Convert amount to number if provided
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount.toString());
      }

      const updatedPayment = await Payment.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('client', 'firstName lastName email phone address')
        .populate({
          path: 'reservation',
          select: 'reservationNumber eventDate eventTime eventLocation items',
          populate: {
            path: 'items',
            select: 'name primaryPhoto rentalCost size'
          }
        })
        .populate('createdBy', 'name email');

      if (!updatedPayment) {
        return NextResponse.json({
          success: false,
          message: 'Payment not found',
        }, { status: 404 });
      }

      // Update reservation payment status and remaining balance
      try {
        await updateReservationPaymentStatus(updatedPayment.reservation);
      } catch (error) {
        console.error('Error updating reservation payment status:', error);
        // Don't fail the payment update if reservation update fails
      }

      return NextResponse.json({
        success: true,
        message: 'Payment updated successfully',
        payment: updatedPayment,
      });
    }
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update payment',
    }, { status: 500 });
  }
}

// DELETE /api/payments/[id] - Delete payment
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    const deletedPayment = await Payment.findByIdAndDelete(id);

    if (!deletedPayment) {
      return NextResponse.json({
        success: false,
        message: 'Payment not found',
      }, { status: 404 });
    }

    // Update reservation payment status and remaining balance after deletion
    try {
      await updateReservationPaymentStatus(deletedPayment.reservation);
    } catch (error) {
      console.error('Error updating reservation payment status after deletion:', error);
      // Don't fail the payment deletion if reservation update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete payment',
    }, { status: 500 });
  }
} 