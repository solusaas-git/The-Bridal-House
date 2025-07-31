import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get current session to verify admin privileges
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No session found',
      }, { status: 401 });
    }

    const currentSession = JSON.parse(sessionCookie.value);
    const currentUser = await User.findById(currentSession.userId);

    // Only admins can impersonate other users
    if (!currentUser || currentUser.role !== 'Admin') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Admin access required',
      }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required for impersonation',
      }, { status: 400 });
    }

    // Find the user to impersonate
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        message: 'Target user not found',
      }, { status: 404 });
    }

    // Prevent self-impersonation (optional - you might want to allow this)
    if (String(currentUser._id) === String(targetUser._id)) {
      return NextResponse.json({
        success: false,
        message: 'Cannot impersonate yourself',
      }, { status: 400 });
    }

    const userResponse = {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      isVerified: targetUser.isVerified,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    };

    const response = NextResponse.json({
      success: true,
      message: `Successfully impersonating ${targetUser.name}`,
      user: userResponse,
      impersonatedBy: {
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
      }
    });

    // Set the new session cookie with impersonated user's data
    // Include original admin info for potential restoration
    response.cookies.set('session', JSON.stringify({
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      // Store original admin info for restoration
      originalAdmin: {
        userId: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      }
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred during impersonation',
    }, { status: 500 });
  }
} 