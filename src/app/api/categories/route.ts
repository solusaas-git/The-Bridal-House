import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Category } from '@/models';

// GET /api/categories - Get all categories
export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find().sort({ name: 1 });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { message: 'Error fetching categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const category = new Category(body);
    const savedCategory = await category.save();

    return NextResponse.json(savedCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { message: 'Error creating category' },
      { status: 500 }
    );
  }
} 