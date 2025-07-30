import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Settings } from '@/models';

// GET /api/settings - Get all settings
export async function GET() {
  try {
    await connectDB();

    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({
        currency: 'DH',
        currencyCode: 'MAD',
        currencyPosition: 'after'
      });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { message: 'Error fetching settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(body);
    } else {
      Object.assign(settings, body);
    }
    
    await settings.save();

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { message: 'Error updating settings' },
      { status: 500 }
    );
  }
} 