import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Customer } from '@/models';
import { handleSingleFileUpload, UPLOAD_FOLDERS } from '@/lib/upload';

interface CustomerQuery {
  page?: string;
  limit?: string;
  search?: string;
  type?: 'Client' | 'Prospect';
}

interface CustomerFilter {
  $or?: Array<Record<string, { $regex: string; $options: string }>>;
  type?: string;
}

// GET /api/customers - Get all customers with pagination and search
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query: CustomerQuery = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10', 
      search: searchParams.get('search') || '',
      type: searchParams.get('type') as 'Client' | 'Prospect' || undefined,
    };

    const page = parseInt(query.page!);
    const limit = parseInt(query.limit!);
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: CustomerFilter = {};
    
    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    
    if (query.type) {
      filter.type = query.type;
    }

    // Get customers with pagination
    const customers = await Customer
      .find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Customer.countDocuments(filter);

    return NextResponse.json({
      success: true,
      customers,
      totalCount,
      currentPage: page,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch customers',
    }, { status: 500 });
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get user from session cookie
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Invalid session',
      }, { status: 401 });
    }

    const { userId } = sessionData;

    // For now, handle both JSON and form data, but without file uploads in this route
    // File uploads will be handled separately when we implement them fully
    const contentType = request.headers.get('content-type');
    let customerData: Record<string, unknown>;

    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file uploads
      const formData = await request.formData();
      customerData = {};
      
      // Process regular form fields
      formData.forEach((value, key) => {
        if (key !== 'newFiles') {
          customerData[key] = value;
        }
      });

      // Handle file uploads
      const files = formData.getAll('newFiles') as File[];
      if (files && files.length > 0) {
        const attachments = [];
        for (const file of files) {
          try {
            console.log(`📤 Uploading customer file: ${file.name}`);
            const uploadResult = await handleSingleFileUpload(file, UPLOAD_FOLDERS.CUSTOMERS_IMAGES);
            attachments.push({
              name: file.name,
              url: uploadResult.url,
              size: file.size,
              type: file.type
            });
          } catch (uploadError) {
            console.error('Error uploading customer file:', uploadError);
            // Continue with other files
          }
        }
        if (attachments.length > 0) {
          customerData.attachments = attachments;
        }
      }
    } else {
      // Handle JSON data
      customerData = await request.json();
    }

    // Add the user who created this customer
    customerData.createdBy = userId;

    const customer = new Customer(customerData);
    const savedCustomer = await customer.save();

    // Populate the saved customer
    await savedCustomer.populate('createdBy', 'name');

    return NextResponse.json({
      success: true,
      customer: savedCustomer,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create customer',
    }, { status: 500 });
  }
} 