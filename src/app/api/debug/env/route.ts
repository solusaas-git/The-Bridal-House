import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check critical environment variables
    const envStatus = {
      BLOB_READ_WRITE_TOKEN: {
        exists: !!process.env.BLOB_READ_WRITE_TOKEN,
        length: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
        preview: process.env.BLOB_READ_WRITE_TOKEN ? 
          `${process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20)}...` : 
          'NOT SET'
      },
      DB_URI: {
        exists: !!process.env.DB_URI,
        preview: process.env.DB_URI ? 
          `mongodb://...@${process.env.DB_URI.split('@')[1]?.split('/')[0] || 'unknown'}` : 
          'NOT SET'
      },
      NEXTAUTH_SECRET: {
        exists: !!process.env.NEXTAUTH_SECRET,
        length: process.env.NEXTAUTH_SECRET?.length || 0
      },
      NEXTAUTH_URL: {
        exists: !!process.env.NEXTAUTH_URL,
        value: process.env.NEXTAUTH_URL || 'NOT SET'
      },
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    };

    // Check if we're in Vercel environment
    const isVercel = !!process.env.VERCEL;
    
    return NextResponse.json({
      success: true,
      environment: {
        isVercel,
        platform: isVercel ? 'Vercel' : 'Local/Other',
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      },
      envVariables: envStatus,
      recommendations: {
        blobToken: !envStatus.BLOB_READ_WRITE_TOKEN.exists ? 
          'MISSING: Add BLOB_READ_WRITE_TOKEN in Vercel dashboard → Settings → Environment Variables' :
          'OK: Blob token is set',
        mongodb: !envStatus.DB_URI.exists ? 
          'MISSING: Add DB_URI in Vercel dashboard' :
          'OK: DB URI is set',
        auth: !envStatus.NEXTAUTH_SECRET.exists ?
          'MISSING: Add NEXTAUTH_SECRET in Vercel dashboard' :
          'OK: NextAuth secret is set'
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check environment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 