import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Cost, CostCategory, getFileTypeFromExtension } from '@/models';
import { handleSingleFileUpload } from '@/lib/upload';

// Get all costs with filtering and pagination
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter query
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.notes = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0); // Start of day
        (filter.date as Record<string, unknown>).$gte = startDateObj;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        (filter.date as Record<string, unknown>).$lte = endDateObj;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get costs with population
    const costs = await Cost.find(filter)
      .populate('category', 'name color')
      .populate('relatedReservation', 'pickupDate returnDate')
      .populate('relatedProduct', 'name primaryPhoto')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Cost.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      costs,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

// Create new cost
export async function POST(request: NextRequest) {
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
        relatedReservation: formData.get('relatedReservation') as string || undefined,
        relatedProduct: formData.get('relatedProduct') as string || undefined,
        notes: formData.get('notes') as string,
        createdBy: session.userId
      };

      // Extract files
      const fileEntries = formData.getAll('attachments');
      files = fileEntries.filter(entry => entry instanceof File) as File[];
    } else {
      // Handle JSON data
      const jsonData = await request.json();
      costData = {
        ...jsonData,
        createdBy: session.userId
      };
    }

    // Validate required fields
    if (!costData.date || !costData.category || !costData.amount) {
      return NextResponse.json(
        { error: 'Date, category, and amount are required' },
        { status: 400 }
      );
    }

    // Validate category exists
    const categoryExists = await CostCategory.findById(costData.category);
    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Handle file uploads
    const attachments = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await handleSingleFileUpload(file, 'uploads/costs');
          attachments.push({
            name: file.name,
            url: uploadResult.url,
            size: file.size,
            type: getFileTypeFromExtension(file.name),
            uploadedAt: new Date()
          });
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // Continue with other files
        }
      }
    }

    // Create cost with minimal data first
    const costDataToSave: any = {
      date: costData.date,
      category: costData.category,
      amount: costData.amount,
      notes: costData.notes,
      createdBy: costData.createdBy,
      attachments: attachments // Include attachments in the initial data
    };

    // Add optional fields only if they exist
    if (costData.relatedReservation) {
      costDataToSave.relatedReservation = costData.relatedReservation;
    }
    if (costData.relatedProduct) {
      costDataToSave.relatedProduct = costData.relatedProduct;
    }

    const cost = new Cost(costDataToSave);
    
    // Remove the separate attachments setting since it's now included in costDataToSave
    // if (attachments.length > 0) {
    //   cost.attachments = attachments;
    //   console.log('Attachments set on cost object:', cost.attachments);
    // }

    await cost.save();

    // Populate the created cost
    await cost.populate('category', 'name color');
    await cost.populate('relatedReservation', 'pickupDate returnDate');
    await cost.populate('relatedProduct', 'name primaryPhoto');
    await cost.populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Cost created successfully',
      cost
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating cost:', error);
    return NextResponse.json(
      { error: 'Failed to create cost' },
      { status: 500 }
    );
  }
} 