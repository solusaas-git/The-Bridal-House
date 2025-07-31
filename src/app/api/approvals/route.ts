import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval, User, Customer, Product, Payment, Reservation } from '@/models';

// Get all approvals (admin only)
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

    // Check if user is admin or manager
    const user = await User.findById(session.userId);
    const userRole = user?.role?.toLowerCase();
    if (!user || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json(
        { error: 'Manager or Admin access required' },
        { status: 403 }
      );
    }

    const approvals = await Approval.find({})
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

// Create approval request
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

    const body = await request.json();
    const { actionType, resourceType, resourceId, originalData, newData, reason } = body;
    
    // Get the original data if not provided
    let currentOriginalData = originalData;
    
    if (!currentOriginalData) {
      let resource;
      
      switch (resourceType) {
        case 'customer':
          resource = await Customer.findById(resourceId);
          break;
        case 'item':
          resource = await Product.findById(resourceId);
          break;
        case 'payment':
          resource = await Payment.findById(resourceId);
          break;
        case 'reservation':
          resource = await Reservation.findById(resourceId);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid resource type' },
            { status: 400 }
          );
      }

      if (!resource) {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        );
      }
      currentOriginalData = resource.toObject();
    }

    // Validate that newData contains changes for edit operations
    if (actionType === 'edit' && (!newData || Object.keys(newData).length === 0)) {
      return NextResponse.json(
        { error: 'No changes detected to approve' },
        { status: 400 }
      );
    }

    const approval = new Approval({
      requestedBy: session.userId,
      actionType,
      resourceType,
      resourceId,
      originalData: currentOriginalData,
      newData: actionType === 'edit' ? newData : undefined,
      reason,
    });

    await approval.save();
    await approval.populate('requestedBy', 'name email');

    return NextResponse.json({
      message: `Your request has been submitted for approval. ${actionType === 'edit' ? `${Object.keys(newData || {}).length} field(s) will be updated.` : ''}`,
      approval,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating approval:', error);
    return NextResponse.json(
      { error: 'Failed to create approval request' },
      { status: 500 }
    );
  }
} 