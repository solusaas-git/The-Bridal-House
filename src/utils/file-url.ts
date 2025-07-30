/**
 * Utility to handle file URLs and ensure they work with both 
 * legacy local paths and new Vercel Blob URLs
 */

export function normalizeFileUrl(filePath: string | undefined | null): string | null {
  if (!filePath) return null;
  
  // If already a full URL (Vercel Blob), return as-is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // For legacy local paths, use the uploads API proxy
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
  
  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  // Remove 'uploads/' prefix if present since our API expects it without
  const pathWithoutUploads = cleanPath.startsWith('uploads/') ? cleanPath.slice(8) : cleanPath;
  
  return `${backendUrl}/api/uploads/${pathWithoutUploads}`;
}

/**
 * Get appropriate file type for display purposes
 */
export function getFileType(fileName: string): string {
  if (!fileName) return 'file';
  
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension)) return 'image';
  if (['pdf'].includes(extension)) return 'pdf';
  if (['doc', 'docx'].includes(extension)) return 'document';
  if (['txt'].includes(extension)) return 'text';
  if (['mov', 'mp4', 'avi', 'mkv'].includes(extension)) return 'video';
  
  return 'file';
}

/**
 * Check if a file path is a legacy local path that needs conversion
 */
export function isLegacyPath(filePath: string): boolean {
  return !filePath.startsWith('http') && 
         (filePath.includes('uploads/') || filePath.startsWith('/'));
} 