import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Category } from '@/models';

// GET /api/categories/[id] - Get category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { message: 'Error fetching category' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    
    const category = await Category.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { message: 'Error updating category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    await Category.findByIdAndDelete(id);
    
    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { message: 'Error deleting category' },
      { status: 500 }
    );
  }
} 