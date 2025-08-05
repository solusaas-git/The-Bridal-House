import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { UserPreferences } from '@/models';

// Default column preferences for different pages
const getDefaultPreferences = (page: string) => {
  const defaultPreferences: Record<string, Record<string, boolean>> = {
    customers: {
      id: true,
      firstName: true, // Changed from 'name'
      lastName: true,  // Changed from 'false'
      address: false,
      idNumber: false,
      phone: true,
      weddingDate: true,
      weddingTime: false,
      weddingLocation: false,
      weddingCity: true,
      type: false,
      createdAt: true,
      updatedAt: false,
      createdBy: false,
      actions: true,
    },
    payments: {
      id: true,
      customer: true,
      reservation: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      paymentType: true,
      reference: true,
      note: true,
      attachments: true,
      createdBy: false,
      actions: true,
    },
    reservations: {
      id: true,
      client: true,
      weddingDate: true,
      items: true,
      type: true,
      pickupDate: true,
      returnDate: true,
      status: true,
      totalCost: true,
      balance: true,
      createdAt: false,
      createdBy: false,
      actions: true,
    },
    products: {
      id: true,
      name: true,
      category: true,
      subCategory: true,
      rentalCost: true,
      buyCost: true,
      sellPrice: true,
      size: true,
      quantity: true,
      status: true,
      createdAt: false,
      updatedAt: false,
      createdBy: false,
      actions: true,
    },
  };
  return defaultPreferences[page] || {};
};

// GET /api/user-preferences/columns/[page] - Get column preferences for a specific page
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ page: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { page } = params;

    // Get user from session cookie
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Invalid session',
      }, { status: 401 });
    }

    const { userId } = sessionData;
    const preferences = await UserPreferences.findOne({ userId });
    
    if (!preferences || !preferences.columnPreferences[page]) {
      // Return default preferences for the page
      const defaultPreferences = getDefaultPreferences(page);
      return NextResponse.json({
        success: true,
        columnPreferences: defaultPreferences,
        isDefault: true,
      });
    }

    return NextResponse.json({
      success: true,
      columnPreferences: preferences.columnPreferences[page],
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching column preferences:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch preferences',
    }, { status: 500 });
  }
}

// PUT /api/user-preferences/columns/[page] - Save column preferences for a specific page
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ page: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { page } = params;
    const { columnVisibility } = await request.json();

    // Get user from session cookie
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Invalid session',
      }, { status: 401 });
    }

    const { userId } = sessionData;

    if (!columnVisibility) {
      return NextResponse.json({
        success: false,
        message: 'columnVisibility is required',
      }, { status: 400 });
    }

    // Find existing preferences
    let preferences = await UserPreferences.findOne({ userId });
    
    if (!preferences) {
      // Create new preferences with defaults
      preferences = new UserPreferences({
        userId,
        columnPreferences: {
          customers: getDefaultPreferences('customers'),
        },
      });
    } else {
      // Ensure columnPreferences object exists
      if (!preferences.columnPreferences) {
        preferences.columnPreferences = {};
      }
    }

    // Update the column preferences for the specific page
    preferences.columnPreferences[page] = columnVisibility;
    
    // Mark the nested object as modified for Mongoose
    preferences.markModified('columnPreferences');
    
    // Save the preferences
    await preferences.save();

    return NextResponse.json({
      success: true,
      message: 'Column preferences saved successfully',
    });
  } catch (error) {
    console.error('Error saving column preferences:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save preferences',
    }, { status: 500 });
  }
} 