import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment } from '@/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const params = await context.params;
    const customerId = params.id;
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const payments = await Payment.find({ client: customerId })
      .populate('client', 'firstName lastName email phone')
      .populate('reservation', 'reservationNumber eventDate pickupDate returnDate type total')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payments by customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch payments', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 