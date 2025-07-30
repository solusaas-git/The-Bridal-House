import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment } from '@/models';
import { handleSingleFileUpload, type UploadedFile } from '@/lib/upload';

interface PaymentQuery {
  page?: string;
  limit?: string;
  search?: string;
  customer?: string;
  reservation?: string;
  paymentMethod?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface PaymentFormData {
  client: string;
  reservation: string;
  paymentDate: string;
  paymentTime?: string;
  amount: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType: 'Advance' | 'Security' | 'Final' | 'Other';
  reference?: string;
  note?: string;
  attachments?: Array<{
    name: string;
    size: number;
    url: string;
  }>;
}

// GET /api/payments - Get all payments with pagination and filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query: PaymentQuery = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
      search: searchParams.get('search') || '',
      customer: searchParams.get('customer') || '',
      reservation: searchParams.get('reservation') || '',
      paymentMethod: searchParams.get('paymentMethod') || '',
      paymentType: searchParams.get('paymentType') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
    };

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;

    // Build search filters
    const searchFilters: Record<string, unknown> = {};

    // Search by customer name or reference
    if (query.search) {
      searchFilters.$or = [
        { reference: { $regex: query.search, $options: 'i' } },
        { note: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Filter by customer
    if (query.customer) {
      searchFilters.client = query.customer;
    }

    // Filter by reservation
    if (query.reservation) {
      searchFilters.reservation = query.reservation;
    }

    // Filter by payment method
    if (query.paymentMethod) {
      searchFilters.paymentMethod = query.paymentMethod;
    }

    // Filter by payment type
    if (query.paymentType) {
      searchFilters.paymentType = query.paymentType;
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      searchFilters.paymentDate = {};
      if (query.dateFrom) {
        (searchFilters.paymentDate as Record<string, unknown>).$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (searchFilters.paymentDate as Record<string, unknown>).$lte = new Date(query.dateTo);
      }
    }

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(searchFilters);

    // Fetch payments with population
    const payments = await Payment
      .find(searchFilters)
      .populate('client', 'firstName lastName email phone')
      .populate('reservation', 'reservationNumber eventDate')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      payments,
      totalCount,
      currentPage: page,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch payments',
    }, { status: 500 });
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get session user ID
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const createdBy = session.userId;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with file uploads
      const formData = await request.formData();
      
      const paymentData: PaymentFormData = {
        client: formData.get('client') as string || '',
        reservation: formData.get('reservation') as string || '',
        paymentDate: formData.get('paymentDate') as string || new Date().toISOString(),
        paymentTime: formData.get('paymentTime') as string || '00:00',
        amount: formData.get('amount') as string || '0',
        paymentMethod: formData.get('paymentMethod') as PaymentFormData['paymentMethod'] || 'Cash',
        paymentType: formData.get('paymentType') as PaymentFormData['paymentType'] || 'Advance',
        reference: formData.get('reference') as string || '',
        note: formData.get('note') as string || '',
      };

      // Combine date and time
      const paymentDateTime = paymentData.paymentTime 
        ? `${paymentData.paymentDate}T${paymentData.paymentTime}`
        : paymentData.paymentDate;

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
        name: file.originalname,
        size: file.size,
        url: file.path.replace(/^uploads/, ''),
      }));

      const newPayment = new Payment({
        ...paymentData,
        paymentDate: paymentDateTime, // Use the combined date and time
        amount: parseFloat(paymentData.amount),
        attachments: paymentAttachments,
        createdBy,
      });

      const savedPayment = await newPayment.save();

      // Populate the saved payment
      const populatedPayment = await Payment.findById(savedPayment._id)
        .populate('client', 'firstName lastName email phone')
        .populate('reservation', 'reservationNumber eventDate')
        .populate('createdBy', 'name email');

      return NextResponse.json({
        success: true,
        message: 'Payment created successfully',
        payment: populatedPayment,
      });
    } else {
      // Handle JSON data
      const paymentData: PaymentFormData = await request.json();

      // Combine date and time
      const paymentDateTime = paymentData.paymentTime 
        ? `${paymentData.paymentDate}T${paymentData.paymentTime}`
        : paymentData.paymentDate;

      const newPayment = new Payment({
        ...paymentData,
        paymentDate: paymentDateTime, // Use the combined date and time
        amount: parseFloat(paymentData.amount),
        createdBy,
      });

      const savedPayment = await newPayment.save();

      // Populate the saved payment
      const populatedPayment = await Payment.findById(savedPayment._id)
        .populate('client', 'firstName lastName email phone')
        .populate('reservation', 'reservationNumber eventDate')
        .populate('createdBy', 'name email');

      return NextResponse.json({
        success: true,
        message: 'Payment created successfully',
        payment: populatedPayment,
      });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create payment',
    }, { status: 500 });
  }
} 