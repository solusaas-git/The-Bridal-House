import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = path.extname(originalName);
    const fileName = `${timestamp}-${originalName}`;
    
    // Create file path
    const filePath = path.join(uploadsDir, fileName);
    
    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);
    
    // Return the file path relative to uploads directory
    const relativePath = fileName;
    
    return NextResponse.json({
      success: true,
      filePath: relativePath,
      originalName: originalName,
      size: file.size
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 