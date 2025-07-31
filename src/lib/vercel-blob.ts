import { put, del, list } from '@vercel/blob';

// Maintain the same folder structure as your current system
export const UPLOAD_FOLDERS = {
  // Production folders
  CUSTOMERS_IMAGES: 'uploads/customers/images',
  CUSTOMERS_DOCUMENTS: 'uploads/customers/documents', 
  PRODUCTS_IMAGES: 'uploads/products/images',
  PRODUCTS_VIDEOS: 'uploads/products/videos',
  PRODUCTS_DOCUMENTS: 'uploads/products/documents',
  PAYMENTS: 'uploads/payment',
  COSTS: 'uploads/costs',
  
  // Approval folders (mirror the production structure)
  APPROVALS_CUSTOMERS_IMAGES: 'approvals/customers/images',
  APPROVALS_CUSTOMERS_DOCUMENTS: 'approvals/customers/documents',
  APPROVALS_PRODUCTS_IMAGES: 'approvals/products/images', 
  APPROVALS_PRODUCTS_VIDEOS: 'approvals/products/videos',
  APPROVALS_PRODUCTS_DOCUMENTS: 'approvals/products/documents',
  APPROVALS_PAYMENTS: 'approvals/payments',
  APPROVALS_RESERVATIONS: 'approvals/reservations',
  APPROVALS_COSTS: 'approvals/costs',
  APPROVALS_GENERAL: 'approvals/general'
} as const;

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

/**
 * Upload a single file to Vercel Blob storage
 * Maintains the same folder structure as the existing system
 */
export async function uploadToVercelBlob(
  file: File, 
  folder: string,
  filename?: string
): Promise<UploadResult> {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is not set');
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is missing. Please add it in Vercel dashboard → Settings → Environment Variables');
    }

    // Generate filename if not provided (same pattern as existing system)
    const finalFilename = filename || `${Date.now()}-${file.name}`;
    
    // Create the full path maintaining folder structure
    const pathname = `${folder}/${finalFilename}`;
    
    console.log(`📤 Uploading to Vercel Blob: ${pathname}`);
    console.log(`📁 File size: ${file.size} bytes`);
    console.log(`🏷️  File type: ${file.type}`);
    
    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    });
    
    console.log(`✅ Upload successful: ${blob.url}`);
    
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      contentDisposition: `inline; filename="${finalFilename}"`
    };
    
  } catch (error) {
    console.error('❌ Vercel Blob upload error:', error);
    
    // Provide specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
        throw new Error('Missing Vercel Blob token. Please check environment variables.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Network error during upload. Please try again.');
      }
      if (error.message.includes('size')) {
        throw new Error('File too large for upload. Please choose a smaller file.');
      }
    }
    
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple files maintaining the same structure
 */
export async function uploadMultipleToVercelBlob(
  files: File[], 
  folder: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadToVercelBlob(file, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFromVercelBlob(url: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting from Vercel Blob: ${url}`);
    await del(url);
    console.log(`✅ Delete successful: ${url}`);
  } catch (error) {
    console.error('❌ Vercel Blob delete error:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List files in a specific folder (useful for migration)
 */
export async function listFilesInFolder(folder: string) {
  try {
    const { blobs } = await list({
      prefix: folder,
    });
    return blobs;
  } catch (error) {
    console.error('❌ Vercel Blob list error:', error);
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to maintain backward compatibility with existing upload paths
 * Converts old file system paths to Vercel Blob URLs
 */
export function convertLocalPathToVercelBlob(localPath: string): string {
  // Remove leading slash and 'public/' if present
  const cleanPath = localPath.replace(/^\/?(public\/)?/, '');
  
  // For existing files, you'll need to migrate them to Vercel Blob
  // This function helps map old paths to new structure
  return `/api/uploads/${cleanPath}`;
}

/**
 * Migration helper: Upload existing local files to Vercel Blob
 * Use this to migrate your production files
 */
export async function migrateLocalFileToVercelBlob(
  localFilePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    // Maintain the same path structure
    const pathname = localFilePath.replace(/^\/?(public\/)?/, '');
    
    console.log(`🔄 Migrating file: ${localFilePath} -> ${pathname}`);
    
    // Create a File object from buffer
    const file = new File([fileBuffer], pathname, { type: contentType });
    
    // Upload to Vercel Blob maintaining the exact path
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: contentType,
    });
    
    console.log(`✅ Migration successful: ${blob.url}`);
    
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: contentType,
      contentDisposition: `inline; filename="${pathname.split('/').pop()}"`
    };
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw new Error(`Failed to migrate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 