import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get current session to check if user is impersonating
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: false,
        message: 'No session found',
      }, { status: 401 });
    }

    const currentSession = JSON.parse(sessionCookie.value);

    // Check if this session has original admin info (indicating impersonation)
    if (!currentSession.originalAdmin) {
      return NextResponse.json({
        success: false,
        message: 'No impersonation session found',
      }, { status: 400 });
    }

    // Verify the original admin still exists
    const originalAdmin = await User.findById(currentSession.originalAdmin.userId);
    if (!originalAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Original admin account not found',
      }, { status: 404 });
    }

    const userResponse = {
      _id: originalAdmin._id,
      name: originalAdmin.name,
      email: originalAdmin.email,
      role: originalAdmin.role,
      status: originalAdmin.status,
      isVerified: originalAdmin.isVerified,
      createdAt: originalAdmin.createdAt,
      updatedAt: originalAdmin.updatedAt,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Successfully stopped impersonation',
      user: userResponse,
    });

    // Restore the original admin session (without impersonation data)
    response.cookies.set('session', JSON.stringify({
      userId: originalAdmin._id,
      name: originalAdmin.name,
      email: originalAdmin.email,
      role: originalAdmin.role,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Stop impersonation error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while stopping impersonation',
    }, { status: 500 });
  }
} 