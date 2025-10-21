import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment, User } from '@/models';

// Get payments count (total or recent)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (parseError) {
      // Invalid JSON in session cookie
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to check role
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user is active
    if (user.status && user.status !== 'Active') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recent'; // 'recent', 'today', 'total'

    let count = 0;
    let filter = {};

    // Base filter to exclude cancelled and refunded payments
    const baseFilter = {
      status: { $nin: ['Cancelled', 'Refunded'] }
    };

    // Build filter based on type
    switch (type) {
      case 'today':
        // Payments created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filter = {
          ...baseFilter,
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        };
        break;
      case 'recent':
        // Payments created in the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filter = {
          ...baseFilter,
          createdAt: {
            $gte: weekAgo
          }
        };
        break;
      case 'total':
      default:
        // All payments (excluding cancelled and refunded)
        filter = baseFilter;
        break;
    }

    // Count payments based on filter
    count = await Payment.countDocuments(filter);

    return NextResponse.json({ 
      count,
      type,
      message: `${type} payments count retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching payments count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments count' },
      { status: 500 }
    );
  }
}
