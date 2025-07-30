import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Customer } from '@/models';
import { handleSingleFileUpload, getCustomerUploadFolder } from '@/lib/upload';

// GET /api/customers/[id] - Get a customer by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    const customer = await Customer.findById(id).populate('createdBy', 'name');

    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch customer',
    }, { status: 500 });
  }
}

// PUT /api/customers/[id] - Update a customer by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    // For now, handle both JSON and form data, but without file uploads in this route
    const contentType = request.headers.get('content-type');
    let updateData: Record<string, unknown>;

    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file uploads
      const formData = await request.formData();
      updateData = {};
      
      // Process regular form fields
      formData.forEach((value, key) => {
        if (key !== 'newFiles') {
          updateData[key] = value;
        }
      });

      // Handle new file uploads
      const files = formData.getAll('newFiles') as File[];
      if (files && files.length > 0) {
        const newAttachments = [];
        for (const file of files) {
          try {
            console.log(`📤 Uploading customer file: ${file.name}`);
            const uploadResult = await handleSingleFileUpload(file, getCustomerUploadFolder(file));
            newAttachments.push({
              name: file.name,
              link: uploadResult.url,  // Changed from 'url' to 'link' to match customer model
              size: file.size
            });
          } catch (uploadError) {
            console.error('Error uploading customer file:', uploadError);
            // Continue with other files
          }
        }
        
        // Merge with existing attachments if any
        if (newAttachments.length > 0) {
          const existingCustomer = await Customer.findById(id);
          const existingAttachments = existingCustomer?.attachments || [];
          updateData.attachments = [...existingAttachments, ...newAttachments];
        }
      }
    } else {
      // Handle JSON data
      updateData = await request.json();
    }

    // Handle attachments from approval requests
    if (updateData.attachments && Array.isArray(updateData.attachments)) {
      // The attachments are already uploaded and contain the file paths
      // Just use them as is
      console.log('Processing attachments from approval:', updateData.attachments);
      
      // Get existing customer to merge attachments if needed
      const existingCustomer = await Customer.findById(id);
      const existingAttachments = existingCustomer?.attachments || [];
      
      // If there are deleted attachments, we need to handle that
      if ((updateData as any).deletedAttachments && Array.isArray((updateData as any).deletedAttachments)) {
        // Remove deleted attachments from existing ones
        const finalAttachments = existingAttachments.filter((existingFile: any) => 
          !(updateData as any).deletedAttachments.some((deletedFile: any) => deletedFile.link === existingFile.link)
        );
        
        // Add new attachments
        updateData.attachments = [...finalAttachments, ...updateData.attachments];
      } else {
        // Simple case: just replace with new attachments
        updateData.attachments = updateData.attachments;
      }
    }

    // Remove createdBy from update data - it should never be modified after creation
    delete updateData.createdBy;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!updatedCustomer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update customer',
    }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Delete a customer by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;

    const deletedCustomer = await Customer.findByIdAndDelete(id);

    if (!deletedCustomer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete customer',
    }, { status: 500 });
  }
} 