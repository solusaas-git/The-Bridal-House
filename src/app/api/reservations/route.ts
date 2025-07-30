import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Reservation, Customer } from '@/models';

// GET - Get all reservations
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateColumn = searchParams.get('dateColumn') || 'pickupDate';
    
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};
    
    // Text search with client and product information
    if (search) {
      // First, find customers that match the search term
      const customerQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
      
      const matchingCustomers = await Customer.find(customerQuery).select('_id');
      const customerIds = matchingCustomers.map(customer => customer._id);
      
      // Then find reservations for those customers
      query.client = { $in: customerIds };
    }

    // Date filtering
    if (startDate || endDate) {
      query.$and = query.$and || [];
      const dateFilter: any = {};
      
      if (startDate && endDate) {
        // Filter for date range
        if (dateColumn === 'weddingDate') {
          // For wedding date, we need to look in the populated client field
          // This will be handled after population
        } else {
          dateFilter[dateColumn] = {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          };
        }
      } else if (startDate) {
        // Filter for dates >= startDate
        if (dateColumn !== 'weddingDate') {
          dateFilter[dateColumn] = { $gte: new Date(startDate) };
        }
      } else if (endDate) {
        // Filter for dates <= endDate
        if (dateColumn !== 'weddingDate') {
          dateFilter[dateColumn] = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
        }
      }
      
      if (Object.keys(dateFilter).length > 0) {
        const queryWithAnd = query as { $and?: unknown[] };
        if (!queryWithAnd.$and) queryWithAnd.$and = [];
        queryWithAnd.$and.push(dateFilter);
      }
    }



    // Get reservations with pagination
    let reservations = await Reservation.find(query)
      .populate('client', 'firstName lastName email phone weddingDate idNumber')
      .populate('items', 'name rentalCost category primaryPhoto')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Handle wedding date filtering (post-population filtering)
    if ((startDate || endDate) && dateColumn === 'weddingDate') {
      reservations = reservations.filter(reservation => {
        const client = reservation.client as any;
        if (!client?.weddingDate) return false;
        
        const weddingDate = new Date(client.weddingDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
        
        if (start && end) {
          return weddingDate >= start && weddingDate <= end;
        } else if (start) {
          return weddingDate >= start;
        } else if (end) {
          return weddingDate <= end;
        }
        return true;
      });
    }

    // Get total count for pagination (need to recalculate if we did post-filtering)
    let total: number;
    if ((startDate || endDate) && dateColumn === 'weddingDate') {
             // For wedding date filtering, we need to count after population
       const allReservations = await Reservation.find(query)
         .populate('client', 'firstName lastName email phone weddingDate idNumber')
         .populate('items', 'name rentalCost category primaryPhoto');
      
      const filteredAll = allReservations.filter(reservation => {
        const client = reservation.client as any;
        if (!client?.weddingDate) return false;
        
        const weddingDate = new Date(client.weddingDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
        
        if (start && end) {
          return weddingDate >= start && weddingDate <= end;
        } else if (start) {
          return weddingDate >= start;
        } else if (end) {
          return weddingDate <= end;
        }
        return true;
      });
      
      total = filteredAll.length;
    } else {
      total = await Reservation.countDocuments(query);
    }
    
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      reservations,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch reservations', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create a new reservation
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    // Get session user ID
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    // Create new reservation
    const newReservation = new Reservation({
      ...body,
      createdBy: userId
    });

    const savedReservation = await newReservation.save();
    
    // Populate the saved reservation
    const reservationData = await Reservation.findById(savedReservation._id)
      .populate('client', 'firstName lastName email phone weddingDate')
      .populate('items', 'name rentalCost category')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      reservation: reservationData
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create reservation', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 