import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Reservation } from '@/models';
import { updateReservationPaymentStatus } from '@/utils/reservation';

// GET - Get a single reservation by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const reservation = await Reservation.findById(params.id)
      .populate('client', 'firstName lastName email phone weddingDate idNumber')
      .populate('items', 'name rentalCost category primaryPhoto')
      .populate('createdBy', 'name email');

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reservation
    });

  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch reservation', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update a reservation
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const body = await request.json();
    
    // Remove createdBy from update data - it should never be modified after creation
    delete body.createdBy;

    const updatedReservation = await Reservation.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('client', 'firstName lastName email phone weddingDate idNumber')
      .populate('items', 'name rentalCost category primaryPhoto')
      .populate('createdBy', 'name email');

    if (!updatedReservation) {
      return NextResponse.json(
        { success: false, message: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Update payment status if total amount changed
    try {
      await updateReservationPaymentStatus(params.id);
    } catch (error) {
      console.error('Error updating reservation payment status after update:', error);
      // Don't fail the update if payment status update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    });

  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update reservation', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}

// DELETE - Delete a reservation
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const deletedReservation = await Reservation.findByIdAndDelete(params.id);

    if (!deletedReservation) {
      return NextResponse.json(
        { success: false, message: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reservation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete reservation', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 