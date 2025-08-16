import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval, User } from '@/models';

// Get pending approvals count
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

    let count = 0;

    // If user is admin or manager, count all pending approvals
    const userRole = user.role?.toLowerCase();
    if (userRole === 'admin' || userRole === 'manager') {
      count = await Approval.countDocuments({ status: 'pending' });
    } else {
      // For non-admin/manager users, return 0
      count = 0;
    }

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching approvals count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals count' },
      { status: 500 }
    );
  }
} 