import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CostCategory, User } from '@/models';

// Get all cost categories
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

    const costCategories = await CostCategory.find({ isActive: true })
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      costCategories
    });
  } catch (error) {
    console.error('Error fetching cost categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost categories' },
      { status: 500 }
    );
  }
}

// Create new cost category
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

    // Check if user has permission to manage settings
    const user = await User.findById(session.userId);
    if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { name, description, color } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingCategory = await CostCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    const costCategory = new CostCategory({
      name,
      description,
      color: color || '#3B82F6'
    });

    await costCategory.save();

    return NextResponse.json({
      success: true,
      message: 'Cost category created successfully',
      costCategory
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating cost category:', error);
    return NextResponse.json(
      { error: 'Failed to create cost category' },
      { status: 500 }
    );
  }
} 