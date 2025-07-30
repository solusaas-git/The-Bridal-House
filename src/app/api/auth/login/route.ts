import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required.',
      }, { status: 400 });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials.',
      }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials.',
      }, { status: 400 });
    }

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
    });

    response.cookies.set('session', JSON.stringify({
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred during login',
    }, { status: 500 });
  }
} 