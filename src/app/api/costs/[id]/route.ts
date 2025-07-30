import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Cost, User, CostCategory } from '@/models';
import { handleSingleFileUpload } from '@/lib/upload';

// Get single cost
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cost = await Cost.findById(id)
      .populate('category', 'name color')
      .populate({
        path: 'relatedReservation',
        populate: [
          { path: 'client', select: 'firstName lastName' },
          { path: 'items', select: 'name primaryPhoto category' }
        ]
      })
      .populate('relatedProduct', 'name primaryPhoto')
      .populate('createdBy', 'name email');

    if (!cost) {
      return NextResponse.json(
        { error: 'Cost not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cost
    });
  } catch (error) {
    console.error('Error fetching cost:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost' },
      { status: 500 }
    );
  }
}

// Update cost
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let costData: Record<string, unknown> = {};
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with file uploads)
      const formData = await request.formData();
      
      // Extract cost data
      costData = {
        date: formData.get('date') as string,
        category: formData.get('category') as string,
        amount: parseFloat(formData.get('amount') as string),
        relatedReservation: formData.get('relatedReservation') as string || null,
        relatedProduct: formData.get('relatedProduct') as string || null,
        notes: formData.get('notes') as string
      };

      // Extract existing attachments
      const existingAttachments = formData.get('existingAttachments');
      if (existingAttachments) {
        costData.existingAttachments = JSON.parse(existingAttachments as string);
      }

      // Extract new files
      const fileEntries = formData.getAll('newAttachments');
      files = fileEntries.filter(entry => entry instanceof File) as File[];
    } else {
      // Handle JSON data
      costData = await request.json();
    }

    // Validate required fields
    if (!costData.date || !costData.category || !costData.amount) {
      return NextResponse.json(
        { error: 'Date, category, and amount are required' },
        { status: 400 }
      );
    }

    // Validate category exists
    const category = await CostCategory.findById(costData.category);
    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Handle file uploads for new attachments
    const newAttachments = [];
    for (const file of files) {
      try {
        const uploadResult = await handleSingleFileUpload(file, 'uploads/costs');
        newAttachments.push({
          name: file.name,
          url: uploadResult.url,
          size: file.size,
          type: file.type
        });
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with other files
      }
    }

    // Combine existing and new attachments
    const existingAttachments = Array.isArray(costData.existingAttachments) ? costData.existingAttachments : [];
    const allAttachments = [
      ...existingAttachments,
      ...newAttachments
    ];

    // Update cost
    const cost = await Cost.findByIdAndUpdate(
      id,
      {
        ...costData,
        attachments: allAttachments
      },
      { new: true, runValidators: true }
    );

    if (!cost) {
      return NextResponse.json(
        { error: 'Cost not found' },
        { status: 404 }
      );
    }

    // Populate the updated cost
    await cost.populate('category', 'name color');
    await cost.populate('relatedReservation', 'pickupDate returnDate');
    await cost.populate('relatedProduct', 'name primaryPhoto');
    await cost.populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Cost updated successfully',
      cost
    });
  } catch (error) {
    console.error('Error updating cost:', error);
    return NextResponse.json(
      { error: 'Failed to update cost' },
      { status: 500 }
    );
  }
}

// Delete cost
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete
    const user = await User.findById(session.userId);
    if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const cost = await Cost.findByIdAndDelete(id);

    if (!cost) {
      return NextResponse.json(
        { error: 'Cost not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cost deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cost:', error);
    return NextResponse.json(
      { error: 'Failed to delete cost' },
      { status: 500 }
    );
  }
} 