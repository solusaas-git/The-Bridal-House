import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get session from cookie
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

    // Find user by ID from session
    const user = await User.findById(sessionData.userId).select('-password');

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred',
    }, { status: 500 });
  }
} 