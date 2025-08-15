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
      
      const uploadResults = await handleMultipleFileFields(formData, 'product');

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

      // Parse client-provided lists of existing media to keep
      const existingSecondaryImagesRaw = formData.get('existingSecondaryImages') as string | null;
      const existingVideoUrlsRaw = formData.get('existingVideoUrls') as string | null;
      let keptSecondaryImages: string[] | undefined;
      let keptVideoUrls: string[] | undefined;

      try {
        keptSecondaryImages = existingSecondaryImagesRaw ? JSON.parse(existingSecondaryImagesRaw) : undefined;
      } catch {
        keptSecondaryImages = undefined;
      }
      try {
        keptVideoUrls = existingVideoUrlsRaw ? JSON.parse(existingVideoUrlsRaw) : undefined;
      } catch {
        keptVideoUrls = undefined;
      }

      // Handle file deletions when files are replaced
      const primary = uploadResults['product_primaryPhoto'] || uploadResults['primaryPhoto'];
      if (primary && primary.length > 0) {
        // Delete old primary photo if it exists
        if (currentProduct.primaryPhoto) {
          try {
            await deleteFromVercelBlob(currentProduct.primaryPhoto);
            console.log(`✅ Deleted old primary photo: ${currentProduct.primaryPhoto}`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete old primary photo:`, deleteError);
          }
        }
        updateData.primaryPhoto = (primary[0].pathname || primary[0].url);
      }

      // Merge secondary images: keep selected existing + append new uploads
      const secondary = uploadResults['product_secondaryImages'] || uploadResults['secondaryImages'];
      if (secondary || typeof keptSecondaryImages !== 'undefined') {
        const newSecondary = (secondary || []).map((img: any) => img.pathname || img.url);
        const currentSecondary: string[] = Array.isArray(currentProduct.secondaryImages) ? currentProduct.secondaryImages : [];
        const kept = Array.isArray(keptSecondaryImages) ? keptSecondaryImages : currentSecondary;

        // Delete only removed ones
        const toDelete = currentSecondary.filter((path) => !kept.includes(path));
        if (toDelete.length > 0) {
          console.log(`🗑️ Deleting ${toDelete.length} removed secondary images`);
          for (const oldImage of toDelete) {
            try {
              await deleteFromVercelBlob(oldImage);
              console.log(`✅ Deleted secondary image: ${oldImage}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete secondary image:`, deleteError);
            }
          }
        }

        updateData.secondaryImages = [...kept, ...newSecondary];
      }

      // Merge videos similarly
      const vids = uploadResults['product_videos'] || uploadResults['videos'];
      if (vids || typeof keptVideoUrls !== 'undefined') {
        const newVideos = (vids || []).map((video: any) => video.pathname || video.url);
        const currentVideos: string[] = Array.isArray(currentProduct.videoUrls) ? currentProduct.videoUrls : [];
        const keptVideos = Array.isArray(keptVideoUrls) ? keptVideoUrls : currentVideos;

        const toDeleteVideos = currentVideos.filter((path) => !keptVideos.includes(path));
        if (toDeleteVideos.length > 0) {
          console.log(`🗑️ Deleting ${toDeleteVideos.length} removed videos`);
          for (const oldVideo of toDeleteVideos) {
            try {
              await deleteFromVercelBlob(oldVideo);
              console.log(`✅ Deleted video: ${oldVideo}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete video:`, deleteError);
            }
          }
        }

        updateData.videoUrls = [...keptVideos, ...newVideos];
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