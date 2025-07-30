import { NextRequest, NextResponse } from 'next/server';
import { uploadToVercelBlob } from '@/lib/vercel-blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine upload directory based on request or default to general uploads
    const uploadDir = formData.get('uploadDir') as string || 'uploads/general';
    
    console.log(`📤 Uploading file via uploads API: ${file.name} to ${uploadDir}`);
    
    // Upload to Vercel Blob storage
    const result = await uploadToVercelBlob(file, uploadDir);
    
    return NextResponse.json({
      success: true,
      url: result.url,
      pathname: result.pathname,
      originalName: file.name,
      size: file.size,
      contentType: result.contentType
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 