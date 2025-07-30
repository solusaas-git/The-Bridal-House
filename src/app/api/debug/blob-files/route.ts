import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing all files in Vercel Blob...');
    
    const { blobs } = await list();
    
    const fileList = blobs.map(blob => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    }));

    console.log(`📁 Found ${fileList.length} files in Vercel Blob`);
    
    // Group by folder for easier reading
    const folderGroups = fileList.reduce((acc, file) => {
      const folderPath = file.pathname.split('/').slice(0, -1).join('/');
      if (!acc[folderPath]) acc[folderPath] = [];
      acc[folderPath].push(file);
      return acc;
    }, {} as Record<string, typeof fileList>);

    return NextResponse.json({
      success: true,
      totalFiles: fileList.length,
      folderGroups,
      allFiles: fileList
    });

  } catch (error) {
    console.error('Error listing Vercel Blob files:', error);
    return NextResponse.json({ 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 