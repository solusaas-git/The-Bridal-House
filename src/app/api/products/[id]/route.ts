import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Product } from '@/models';
import { handleMultipleFileFields } from '@/lib/upload';

interface ProductUpdateData {
  name?: string;
  rentalCost?: number;
  buyCost?: number;
  sellPrice?: number;
  size?: number;
  category?: string;
  subCategory?: string;
  quantity?: number;
  status?: 'Draft' | 'Published';
  primaryPhoto?: string;
  secondaryImages?: string[];
  videoUrls?: string[];
}

// GET /api/products/[id] - Get product by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const params = await context.params;

    const product = await Product.findById(params.id)
      .populate('category', 'name')
      .populate('createdBy', 'username');

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { message: 'Error fetching product' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const params = await context.params;

    const contentType = request.headers.get('content-type');
    let updateData: ProductUpdateData = {};

    if (contentType?.includes('multipart/form-data')) {
      // Handle file uploads for updates
      const { primaryPhoto, secondaryImages, videos, formData } = 
        await handleMultipleFileFields(request, 'uploads/products');

      // Extract form data
      updateData = {
        name: formData.get('name') as string,
        rentalCost: Number(formData.get('rentalCost')),
        buyCost: formData.get('buyCost') ? Number(formData.get('buyCost')) : undefined,
        sellPrice: formData.get('sellPrice') ? Number(formData.get('sellPrice')) : undefined,
        size: formData.get('size') ? Number(formData.get('size')) : undefined,
        category: formData.get('category') as string,
        subCategory: formData.get('subCategory') as string,
        quantity: Number(formData.get('quantity') || 0),
        status: formData.get('status') as 'Draft' | 'Published',
      };

      // Update file URLs if new files were uploaded
      if (primaryPhoto) {
        updateData.primaryPhoto = primaryPhoto.url;
      }

      if (secondaryImages.length > 0) {
        updateData.secondaryImages = secondaryImages.map(img => img.url);
      }

      if (videos.length > 0) {
        updateData.videoUrls = videos.map(video => video.url);
      }
    } else {
      // Handle JSON updates (no file uploads)
      updateData = await request.json();
    }

    const product = await Product.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }

    await product.populate('category', 'name');
    await product.populate('createdBy', 'username');

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { message: 'Error updating product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const params = await context.params;

    const product = await Product.findByIdAndDelete(params.id);

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }

    // TODO: Delete associated files from filesystem
    // You might want to add a utility function to clean up uploaded files

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { message: 'Error deleting product' },
      { status: 500 }
    );
  }
} 