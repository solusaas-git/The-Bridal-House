import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment, getFileTypeFromExtension } from '@/models';
import { handleSingleFileUpload, type UploadedFile } from '@/lib/upload';
import { updateReservationPaymentStatus } from '@/utils/reservation';

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
  status?: 'Pending' | 'Completed' | 'Cancelled' | 'Refunded';
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

    // Search by customer name, reference, or note
    if (query.search) {
      // Use aggregation to search in populated client fields
      const searchRegex = { $regex: query.search, $options: 'i' };
      searchFilters.$or = [
        { reference: searchRegex },
        { note: searchRegex },
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
        const dateFromObj = new Date(query.dateFrom);
        dateFromObj.setHours(0, 0, 0, 0); // Start of day
        (searchFilters.paymentDate as Record<string, unknown>).$gte = dateFromObj;
      }
      if (query.dateTo) {
        const dateToObj = new Date(query.dateTo);
        dateToObj.setHours(23, 59, 59, 999); // End of day
        (searchFilters.paymentDate as Record<string, unknown>).$lte = dateToObj;
      }
    }

    // If there's a search term, use aggregation to search in customer names
    let payments;
    let totalCount;

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      
      // Build the aggregation pipeline with proper typing
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'customers',
            localField: 'client',
            foreignField: '_id',
            as: 'clientInfo'
          }
        },
        {
          $lookup: {
            from: 'reservations',
            localField: 'reservation',
            foreignField: '_id',
            as: 'reservationInfo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdByInfo'
          }
        },
        {
          $match: {
            $and: [
              // Apply other filters (excluding $or which we handle separately)
              ...(Object.keys(searchFilters).filter(key => key !== '$or').map(key => ({ [key]: searchFilters[key] }))),
              // Apply search filter
              {
                $or: [
                  { reference: searchRegex },
                  { note: searchRegex },
                  { 'clientInfo.firstName': searchRegex },
                  { 'clientInfo.lastName': searchRegex },
                  { 
                    $expr: { 
                      $regexMatch: { 
                        input: { 
                          $concat: [
                            { $ifNull: [{ $arrayElemAt: ['$clientInfo.firstName', 0] }, ''] },
                            ' ',
                            { $ifNull: [{ $arrayElemAt: ['$clientInfo.lastName', 0] }, ''] }
                          ]
                        }, 
                        regex: query.search, 
                        options: 'i' 
                      } 
                    } 
                  }
                ]
              }
            ]
          }
        },
        {
          $addFields: {
            client: { $arrayElemAt: ['$clientInfo', 0] },
            reservation: { $arrayElemAt: ['$reservationInfo', 0] },
            createdBy: { $arrayElemAt: ['$createdByInfo', 0] }
          }
        },
        {
          $project: {
            clientInfo: 0,
            reservationInfo: 0,
            createdByInfo: 0
          }
        },
        {
          $sort: { paymentDate: -1, createdAt: -1 }
        }
      ];

      // Get total count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Payment.aggregate(countPipeline);
      totalCount = countResult.length > 0 ? countResult[0].total : 0;

      // Get paginated results
      const resultPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
      payments = await Payment.aggregate(resultPipeline);
    } else {
      // Use regular query without aggregation when no search term
      totalCount = await Payment.countDocuments(searchFilters);
      
      payments = await Payment
        .find(searchFilters)
        .populate('client', 'firstName lastName email phone')
        .populate('reservation', 'reservationNumber eventDate')
        .populate('createdBy', 'name email')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

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
        status: formData.get('status') as PaymentFormData['status'] || 'Completed',
        reference: formData.get('reference') as string || '',
        note: formData.get('note') as string || '',
      };

      // Combine date and time, preserving exact input time (append Z)
      const paymentDateTime = paymentData.paymentTime 
        ? `${paymentData.paymentDate}T${paymentData.paymentTime}:00.000Z`
        : `${paymentData.paymentDate}T00:00:00.000Z`;

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

      const newPayment = new Payment({
        ...paymentData,
        paymentDate: paymentDateTime, // Use the combined date and time
        amount: parseFloat(paymentData.amount),
        attachments: paymentAttachments,
        createdBy,
      });

      const savedPayment = await newPayment.save();

      // Update reservation payment status and remaining balance
      try {
        await updateReservationPaymentStatus(savedPayment.reservation);
      } catch (error) {
        console.error('Error updating reservation payment status:', error);
        // Don't fail the payment creation if reservation update fails
      }

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

      // Combine date and time, preserving exact input time (append Z)
      const paymentDateTime = paymentData.paymentTime 
        ? `${paymentData.paymentDate}T${paymentData.paymentTime}:00.000Z`
        : `${paymentData.paymentDate}T00:00:00.000Z`;

      const newPayment = new Payment({
        ...paymentData,
        paymentDate: paymentDateTime, // Use the combined date and time
        amount: parseFloat(paymentData.amount),
        createdBy,
      });

      const savedPayment = await newPayment.save();

      // Update reservation payment status and remaining balance
      try {
        await updateReservationPaymentStatus(savedPayment.reservation);
      } catch (error) {
        console.error('Error updating reservation payment status:', error);
        // Don't fail the payment creation if reservation update fails
      }

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