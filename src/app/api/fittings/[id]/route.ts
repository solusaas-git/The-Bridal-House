import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Fitting } from '@/models';

// GET /api/fittings/[id] - Get a single fitting (Reservation with type: 'Fitting')
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const fitting = await Fitting.findOne({ _id: params.id })
      .populate('client', 'firstName lastName phone weddingDate type idNumber')
      .populate({
        path: 'items',
        select: 'name rentalCost category primaryPhoto size',
        populate: { path: 'category', select: 'name' }
      })
      .populate('createdBy', 'name email');

    if (!fitting) {
      return NextResponse.json(
        { success: false, message: 'Fitting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, fitting });
  } catch (error) {
    console.error('Error fetching fitting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch fitting' },
      { status: 500 }
    );
  }
}

// PUT /api/fittings/[id] - Update a fitting
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const body = await request.json();

    const {
      client,
      items,
      fittingDate,
      fittingTime,
      status,
      notes,
      // ignore any unintended fields
    } = body || {};

    const update: any = {};
    if (client) update.client = client;
    if (Array.isArray(items)) update.items = items;
    if (typeof notes === 'string') update.notes = notes;
    if (typeof status === 'string') update.status = status;

    if (fittingDate && fittingTime) {
      const iso = `${fittingDate}T${fittingTime}:00.000Z`;
      update.pickupDate = iso;
      update.returnDate = iso;
    }

    // Enforce type remains 'Fitting'
    // Never allow createdBy changes
    delete update.createdBy;

    const updated = await Fitting.findOneAndUpdate(
      { _id: params.id },
      update,
      { new: true, runValidators: true }
    )
      .populate('client', 'firstName lastName phone weddingDate type idNumber')
      .populate('items', 'name rentalCost category primaryPhoto size')
      .populate('createdBy', 'name email');

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Fitting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, fitting: updated });
  } catch (error) {
    console.error('Error updating fitting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update fitting' },
      { status: 400 }
    );
  }
}

// DELETE /api/fittings/[id] - Delete a fitting
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const params = await context.params;
    const deleted = await Fitting.findOneAndDelete({ _id: params.id });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Fitting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Fitting deleted successfully' });
  } catch (error) {
    console.error('Error deleting fitting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete fitting' },
      { status: 500 }
    );
  }
}

