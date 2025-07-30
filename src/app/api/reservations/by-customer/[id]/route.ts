import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Reservation } from '@/models';

// GET - Get reservations by customer ID
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

    // Fetch reservations for the specified customer
    const reservations = await Reservation.find({ client: customerId })
      .populate('client', 'firstName lastName email phone weddingDate idNumber')
      .populate('items', 'name rentalCost category primaryPhoto')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({
      success: true,
      reservations
    });

  } catch (error) {
    console.error('Error fetching reservations by customer:', error);
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