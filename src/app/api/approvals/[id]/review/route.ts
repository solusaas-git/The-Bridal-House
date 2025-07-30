import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Approval, User, Customer, Product, Payment, Reservation } from '@/models';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { action, comment } = await request.json(); // action: 'approve' or 'reject'

    const user = await User.findById(session.userId);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const approval = await Approval.findById(id);
    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: 'Approval already reviewed' },
        { status: 400 }
      );
    }

    approval.status = action === 'approve' ? 'approved' : 'rejected';
    approval.reviewedBy = session.userId;
    approval.reviewedAt = new Date();
    approval.reviewComment = comment;

    await approval.save();

    // If approved, execute the action
    if (action === 'approve') {
      try {
        await executeApprovedAction(approval);
      } catch (executeError) {
        console.error('Error executing approved action:', executeError);
        // Revert approval status
        approval.status = 'pending';
        approval.reviewedBy = undefined;
        approval.reviewedAt = undefined;
        approval.reviewComment = undefined;
        await approval.save();
        
        return NextResponse.json(
          { error: 'Failed to execute approved action' },
          { status: 500 }
        );
      }
    }

    await approval.populate('requestedBy', 'name email');
    await approval.populate('reviewedBy', 'name email');

    return NextResponse.json({
      message: `Request has been ${action === 'approve' ? 'approved and executed' : 'rejected'}`,
      approval,
    });
  } catch (error) {
    console.error('Error reviewing approval:', error);
    return NextResponse.json(
      { error: 'Failed to review approval' },
      { status: 500 }
    );
  }
}

// Helper function to execute approved actions
async function executeApprovedAction(approval: any) {
  if (approval.actionType === 'delete') {
    switch (approval.resourceType) {
      case 'customer':
        await Customer.findByIdAndDelete(approval.resourceId);
        break;
      case 'item':
        await Product.findByIdAndDelete(approval.resourceId);
        break;
      case 'payment':
        await Payment.findByIdAndDelete(approval.resourceId);
        break;
      case 'reservation':
        await Reservation.findByIdAndDelete(approval.resourceId);
        break;
    }
  } else if (approval.actionType === 'edit') {
    // For edit actions, use only the changed fields from newData
    const fieldsToUpdate = approval.newData || {};
    
    // Only proceed if there are fields to update
    if (Object.keys(fieldsToUpdate).length > 0) {
      switch (approval.resourceType) {
        case 'customer':
          await Customer.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
        case 'item':
          await Product.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
        case 'payment':
          await Payment.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
        case 'reservation':
          await Reservation.findByIdAndUpdate(
            approval.resourceId, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
          );
          break;
      }
    }
  }
} 