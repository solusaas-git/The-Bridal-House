import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { UserPreferences } from '@/models';

// Default widget preferences
const getDefaultWidgetPreferences = () => {
  return [
    'stats',
    'pickups', 
    'returns',
    'quickActions',
    'systemHealth'
  ];
};

// GET /api/user-preferences/widgets - Get widget preferences
export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
    
    if (!preferences || !preferences.widgetPreferences) {
      // Return default preferences
      const defaultPreferences = getDefaultWidgetPreferences();
      return NextResponse.json({
        success: true,
        widgetPreferences: defaultPreferences,
        isDefault: true,
      });
    }

    return NextResponse.json({
      success: true,
      widgetPreferences: preferences.widgetPreferences,
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching widget preferences:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch preferences',
    }, { status: 500 });
  }
}

// PUT /api/user-preferences/widgets - Save widget preferences
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { widgetVisibility } = await request.json();

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

    if (!Array.isArray(widgetVisibility)) {
      return NextResponse.json({
        success: false,
        message: 'widgetVisibility must be an array',
      }, { status: 400 });
    }

    // Find existing preferences
    let preferences = await UserPreferences.findOne({ userId });
    
    if (!preferences) {
      // Create new preferences
      preferences = new UserPreferences({
        userId,
        widgetPreferences: widgetVisibility,
      });
    } else {
      // Update widget preferences
      preferences.widgetPreferences = widgetVisibility;
    }
    
    // Save the preferences
    await preferences.save();

    return NextResponse.json({
      success: true,
      message: 'Widget preferences saved successfully',
    });
  } catch (error) {
    console.error('Error saving widget preferences:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save preferences',
    }, { status: 500 });
  }
}
