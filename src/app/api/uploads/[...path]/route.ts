import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// Cache blob list for 5 minutes to improve performance
let cachedBlobs: { blobs: any[], timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedBlobs() {
  const now = Date.now();
  
  if (!cachedBlobs || (now - cachedBlobs.timestamp) > CACHE_DURATION) {
    console.log('🔄 Refreshing blob cache...');
    const { blobs } = await list();
    cachedBlobs = { blobs, timestamp: now };
  }
  
  return cachedBlobs.blobs;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const filePath = params.path;
    
    if (!filePath || filePath.length === 0) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    // Construct the file path - join the path segments
    const requestedPath = filePath.join('/');
    
    // Security: prevent directory traversal
    if (requestedPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    console.log(`🔍 Looking for file: ${requestedPath} in Vercel Blob`);

    // Get cached blob list
    const blobs = await getCachedBlobs();
    
    // Find the file that matches the requested path
    const matchingBlob = blobs.find(blob => {
      // Check if the pathname matches the requested path
      return blob.pathname === requestedPath || 
             blob.pathname === `uploads/${requestedPath}` ||
             blob.pathname.endsWith(`/${requestedPath}`) ||
             blob.pathname.includes(requestedPath);
    });

    if (!matchingBlob) {
      console.log(`❌ File not found in Vercel Blob: ${requestedPath}`);
      console.log(`Available files:`, blobs.map(b => b.pathname).slice(0, 10));
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log(`✅ Found file in Vercel Blob: ${matchingBlob.pathname} -> redirecting to ${matchingBlob.url}`);

    // Redirect to the Vercel Blob URL instead of proxying
    return NextResponse.redirect(matchingBlob.url);

  } catch (error) {
    console.error('Error serving file from Vercel Blob:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 