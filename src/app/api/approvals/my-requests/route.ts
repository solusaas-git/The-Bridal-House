import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval } from '@/models';

// Get approvals for current user
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
    
    const approvals = await Approval.find({ requestedBy: session.userId })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('Error fetching user approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch your requests' },
      { status: 500 }
    );
  }
} 