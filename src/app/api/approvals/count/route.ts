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

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to check role
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let count = 0;

    // If user is admin, count all pending approvals
    if (user.role === 'Admin') {
      count = await Approval.countDocuments({ status: 'pending' });
    } else {
      // For non-admin users, count pending approvals they can review
      // This would depend on your permission system
      // For now, we'll return 0 for non-admin users
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