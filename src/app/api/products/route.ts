import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Product } from '@/models';
import { handleMultipleFileFields } from '@/lib/upload';

interface ProductQuery {
  $or?: Array<Record<string, { $regex: string; $options: string }>>;
  category?: string;
  subCategory?: string;
}

interface ProductFormData {
  name: string;
  rentalCost: number;
  buyCost?: number;
  sellPrice?: number;
  size?: number;
  category: string;
  subCategory: string;
  quantity: number;
  status: 'Draft' | 'Published';
  createdBy: string;
  primaryPhoto?: string;
  secondaryImages?: string[];
  videoUrls?: string[];
}

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subCategory = searchParams.get('subCategory') || '';

    // Build query
    const query: ProductQuery = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (subCategory) {
      query.subCategory = subCategory;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { message: 'Error fetching products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get session user ID
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Handle file uploads
    const formData = await request.formData();
    const uploadResults = await handleMultipleFileFields(formData);

    // Extract form data
    const productData: ProductFormData = {
      name: formData.get('name') as string,
      rentalCost: Number(formData.get('rentalCost')),
      buyCost: formData.get('buyCost') ? Number(formData.get('buyCost')) : undefined,
      sellPrice: formData.get('sellPrice') ? Number(formData.get('sellPrice')) : undefined,
      size: formData.get('size') ? Number(formData.get('size')) : undefined,
      category: formData.get('category') as string,
      subCategory: formData.get('subCategory') as string,
      quantity: Number(formData.get('quantity') || 0),
      status: formData.get('status') as 'Draft' | 'Published' || 'Draft',
      createdBy: userId,
    };

    // Add file URLs to product data
    if (uploadResults.primaryPhoto && uploadResults.primaryPhoto.length > 0) {
      const f = uploadResults.primaryPhoto[0];
      // Prefer pathname (uploads/...) so our /api/uploads proxy can resolve it
      productData.primaryPhoto = f.pathname || f.url;
    }

    if (uploadResults.secondaryImages && uploadResults.secondaryImages.length > 0) {
      productData.secondaryImages = uploadResults.secondaryImages.map(img => img.pathname || img.url);
    }

    if (uploadResults.videos && uploadResults.videos.length > 0) {
      productData.videoUrls = uploadResults.videos.map(video => video.pathname || video.url);
    }

    const product = new Product(productData);
    await product.save();
    await product.populate('category');
    await product.populate('createdBy');

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { message: 'Error creating product' },
      { status: 500 }
    );
  }
} 