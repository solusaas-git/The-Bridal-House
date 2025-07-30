import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Product, Category } from '@/models';
import { handleMultipleFileFields } from '@/lib/upload';
import { deleteFromVercelBlob } from '@/lib/vercel-blob';

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
      const formData = await request.formData();
      
      // Get current product to find files that will be replaced
      const currentProduct = await Product.findById(params.id);
      if (!currentProduct) {
        return NextResponse.json(
          { message: 'Product not found' },
          { status: 404 }
        );
      }
      
      const uploadResults = await handleMultipleFileFields(formData);

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

      // Handle file deletions when files are replaced
      if (uploadResults.primaryPhoto && uploadResults.primaryPhoto.length > 0) {
        // Delete old primary photo if it exists
        if (currentProduct.primaryPhoto) {
          try {
            await deleteFromVercelBlob(currentProduct.primaryPhoto);
            console.log(`✅ Deleted old primary photo: ${currentProduct.primaryPhoto}`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete old primary photo:`, deleteError);
          }
        }
        updateData.primaryPhoto = uploadResults.primaryPhoto[0].url;
      }

      if (uploadResults.secondaryImages && uploadResults.secondaryImages.length > 0) {
        // Delete old secondary images if they exist
        if (currentProduct.secondaryImages && currentProduct.secondaryImages.length > 0) {
          console.log(`🗑️ Deleting ${currentProduct.secondaryImages.length} old secondary images`);
          for (const oldImage of currentProduct.secondaryImages) {
            try {
              await deleteFromVercelBlob(oldImage);
              console.log(`✅ Deleted old secondary image: ${oldImage}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete old secondary image:`, deleteError);
            }
          }
        }
        updateData.secondaryImages = uploadResults.secondaryImages.map(img => img.url);
      }

      if (uploadResults.videos && uploadResults.videos.length > 0) {
        // Delete old videos if they exist
        if (currentProduct.videoUrls && currentProduct.videoUrls.length > 0) {
          console.log(`🗑️ Deleting ${currentProduct.videoUrls.length} old videos`);
          for (const oldVideo of currentProduct.videoUrls) {
            try {
              await deleteFromVercelBlob(oldVideo);
              console.log(`✅ Deleted old video: ${oldVideo}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete old video:`, deleteError);
            }
          }
        }
        updateData.videoUrls = uploadResults.videos.map(video => video.url);
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