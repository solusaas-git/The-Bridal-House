import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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

    // Construct absolute path to uploads directory in the nextjs-app folder
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const absoluteFilePath = path.join(uploadsDir, requestedPath);

    // Check if file exists
    if (!existsSync(absoluteFilePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file stats
    const fileStats = await stat(absoluteFilePath);
    
    if (!fileStats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Read the file
    const fileBuffer = await readFile(absoluteFilePath);
    
    // Get file extension to determine content type
    const ext = path.extname(absoluteFilePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Set appropriate content type based on file extension
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Return the file with appropriate headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': fileStats.size.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    };

    // Add additional headers for PDF files to ensure proper iframe display
    if (ext === '.pdf') {
      responseHeaders['Content-Disposition'] = 'inline';
      responseHeaders['X-Content-Type-Options'] = 'nosniff';
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 