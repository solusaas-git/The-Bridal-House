import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { UserPreferences } from '@/models';

// GET /api/user-preferences/language - Get user's language preference
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
    
    const language = preferences?.language || 'en'; // Default to English

    return NextResponse.json({
      success: true,
      language,
    });
  } catch (error) {
    console.error('Error fetching language preference:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}

// PUT /api/user-preferences/language - Save user's language preference
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { language } = await request.json();

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

    if (!language || !['en', 'fr'].includes(language)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid language. Must be "en" or "fr"',
      }, { status: 400 });
    }

    // Find existing preferences or create new ones
    let preferences = await UserPreferences.findOne({ userId });
    
    if (!preferences) {
      // Create new preferences with defaults
      preferences = new UserPreferences({
        userId,
        language,
        columnPreferences: {
          customers: {
            id: true,
            firstName: true,
            lastName: true,
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
        },
      });
    } else {
      // Update existing preferences
      preferences.language = language;
    }
    
    // Save the preferences
    await preferences.save();

    return NextResponse.json({
      success: true,
      message: 'Language preference saved successfully',
      language,
    });
  } catch (error) {
    console.error('Error saving language preference:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}