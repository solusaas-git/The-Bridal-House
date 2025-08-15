import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Fitting, Customer } from '@/models';

// GET /api/fittings - List all fittings (type: Fitting)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = (searchParams.get('search') || '').trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const statusParam = searchParams.get('status');
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Status filter
    if (statusParam) {
      const arr = statusParam.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length > 0) query.status = { $in: arr };
    }

    // Date range on pickupDate
    if (startDate || endDate) {
      query.pickupDate = {};
      if (startDate) query.pickupDate.$gte = new Date(startDate);
      if (endDate) query.pickupDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      if (Object.keys(query.pickupDate).length === 0) delete query.pickupDate;
    }

    // Search by client name/phone
    if (search) {
      const customerQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
      const matching = await Customer.find(customerQuery).select('_id');
      const ids = matching.map(c => c._id);
      query.client = { $in: ids };
    }

    const [items, total] = await Promise.all([
      Fitting.find(query)
        .populate('client', 'firstName lastName phone weddingDate type')
        .populate('items', 'name primaryPhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Fitting.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      fittings: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching fittings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch fittings' }, { status: 500 });
  }
}

// POST /api/fittings - Create a new fitting
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get session user ID
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      client, // customer id (Prospect preferred)
      items = [], // array of product ids
      fittingDate, // yyyy-MM-dd
      fittingTime, // HH:mm
      status = 'Confirmed',
      notes = '',
    } = body || {};

    if (!client) {
      return NextResponse.json({ success: false, message: 'Client is required' }, { status: 400 });
    }
    if (!fittingDate || !fittingTime) {
      return NextResponse.json({ success: false, message: 'Fitting date and time are required' }, { status: 400 });
    }

    // Validate client exists
    const c = await Customer.findById(client);
    if (!c) {
      return NextResponse.json({ success: false, message: 'Client not found' }, { status: 404 });
    }

    // Build ISO for pickup and return (same moment for fitting)
    const iso = `${fittingDate}T${fittingTime}:00.000Z`;

    const doc = await Fitting.create({
      client,
      items,
      pickupDate: iso,
      returnDate: iso,
      status,
      notes,
      createdBy: userId,
    });

    await doc.populate('client', 'firstName lastName type');

    return NextResponse.json({ success: true, fitting: doc }, { status: 201 });
  } catch (error) {
    console.error('Error creating fitting:', error);
    return NextResponse.json({ success: false, message: 'Failed to create fitting' }, { status: 500 });
  }
}

