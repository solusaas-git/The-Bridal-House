import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Category } from '@/models';

// PUT /api/categories/[id]/subcategories/[name] - Update subcategory name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    await connectDB();

    const { id: categoryId, name } = await params;
    const oldName = decodeURIComponent(name);
    const body = await request.json();
    const { name: newName } = body;

    if (!newName || !newName.trim()) {
      return NextResponse.json(
        { message: 'New subcategory name is required' },
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

    if (!category.subCategories || !category.subCategories.includes(oldName)) {
      return NextResponse.json(
        { message: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Check if new name already exists
    if (category.subCategories.includes(newName.trim()) && newName.trim() !== oldName) {
      return NextResponse.json(
        { message: 'Subcategory with this name already exists' },
        { status: 400 }
      );
    }

    // Update subcategory name
    const index = category.subCategories.indexOf(oldName);
    category.subCategories[index] = newName.trim();

    await category.save();

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return NextResponse.json(
      { message: 'Error updating subcategory' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id]/subcategories/[name] - Delete subcategory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    await connectDB();

    const { id: categoryId, name } = await params;
    const subcategoryName = decodeURIComponent(name);

    const category = await Category.findById(categoryId);

    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    if (!category.subCategories || !category.subCategories.includes(subcategoryName)) {
      return NextResponse.json(
        { message: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Remove subcategory
    category.subCategories = category.subCategories.filter(sub => sub !== subcategoryName);

    await category.save();

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { message: 'Error deleting subcategory' },
      { status: 500 }
    );
  }
} 