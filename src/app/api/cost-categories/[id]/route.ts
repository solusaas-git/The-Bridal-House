import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CostCategory, User } from '@/models';

// Get single cost category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const costCategory = await CostCategory.findById(id);

    if (!costCategory) {
      return NextResponse.json(
        { error: 'Cost category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      costCategory
    });
  } catch (error) {
    console.error('Error fetching cost category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost category' },
      { status: 500 }
    );
  }
}

// Update cost category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage settings
    const user = await User.findById(session.userId);
    if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { name, description, color, isActive } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if another category already exists with this name
    const existingCategory = await CostCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    const costCategory = await CostCategory.findByIdAndUpdate(
      id,
      {
        name,
        description,
        color,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!costCategory) {
      return NextResponse.json(
        { error: 'Cost category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cost category updated successfully',
      costCategory
    });
  } catch (error) {
    console.error('Error updating cost category:', error);
    return NextResponse.json(
      { error: 'Failed to update cost category' },
      { status: 500 }
    );
  }
}

// Delete cost category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get session from cookies
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage settings
    const user = await User.findById(session.userId);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const costCategory = await CostCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!costCategory) {
      return NextResponse.json(
        { error: 'Cost category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cost category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cost category:', error);
    return NextResponse.json(
      { error: 'Failed to delete cost category' },
      { status: 500 }
    );
  }
} 