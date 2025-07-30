import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Category } from '@/models';

// GET /api/categories/[id]/subcategories - Get subcategories for a specific category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: categoryId } = await params;
    const category = await Category.findById(categoryId);

    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    // Convert subcategory strings to objects with _id and name
    const subcategories = (category.subCategories || []).map((subcat: string) => ({
      _id: subcat, // Use the subcategory name as ID since products store subcategory as string
      name: subcat
    }));

    return NextResponse.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { message: 'Error fetching subcategories' },
      { status: 500 }
    );
  }
}

// POST /api/categories/[id]/subcategories - Add subcategory to category
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: categoryId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Subcategory name is required' },
        { status: 400 }
      );
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if subcategory already exists
    if (category.subCategories && category.subCategories.includes(name.trim())) {
      return NextResponse.json(
        { message: 'Subcategory already exists' },
        { status: 400 }
      );
    }

    // Add subcategory
    if (!category.subCategories) {
      category.subCategories = [];
    }
    category.subCategories.push(name.trim());

    await category.save();

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return NextResponse.json(
      { message: 'Error adding subcategory' },
      { status: 500 }
    );
  }
} 