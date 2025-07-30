import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Clear the session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred during logout',
    }, { status: 500 });
  }
} 