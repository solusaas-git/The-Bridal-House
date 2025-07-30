import { uploadToVercelBlob, uploadMultipleToVercelBlob, UPLOAD_FOLDERS, UploadResult } from './vercel-blob';

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

/**
 * Handle single file upload using Vercel Blob storage
 * Maintains the same folder structure as before
 */
export async function handleSingleFileUpload(
  file: File, 
  uploadDir: string
): Promise<UploadedFile> {
  try {
    console.log(`📤 Uploading single file to: ${uploadDir}`);
    
    // Upload to Vercel Blob
    const result = await uploadToVercelBlob(file, uploadDir);
    
    return {
      name: file.name,
      url: result.url,
      size: file.size,
      type: file.type
    };
    
  } catch (error) {
    console.error('❌ Single file upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle multiple file uploads using Vercel Blob storage
 */
export async function handleMultipleFileUpload(
  files: File[], 
  uploadDir: string
): Promise<UploadedFile[]> {
  try {
    console.log(`📤 Uploading ${files.length} files to: ${uploadDir}`);
    
    // Upload all files to Vercel Blob
    const results = await uploadMultipleToVercelBlob(files, uploadDir);
    
    return results.map((result, index) => ({
      name: files[index].name,
      url: result.url,
      size: files[index].size,
      type: files[index].type
    }));
    
  } catch (error) {
    console.error('❌ Multiple file upload error:', error);
    throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle file uploads with multiple field types (for approval system)
 * Maintains exact same API as before but uses Vercel Blob storage
 */
export async function handleMultipleFileFields(
  formData: FormData
): Promise<{ [fieldName: string]: UploadedFile[] }> {
  try {
    const results: { [fieldName: string]: UploadedFile[] } = {};
    
    // Process each field in the form data
    for (const [fieldName, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        
        // Determine upload directory based on field name (maintain same logic)
        let uploadDir: string = UPLOAD_FOLDERS.CUSTOMERS_IMAGES; // default
        
        if (fieldName.includes('customer')) {
          uploadDir = fieldName.includes('document') 
            ? UPLOAD_FOLDERS.CUSTOMERS_DOCUMENTS 
            : UPLOAD_FOLDERS.CUSTOMERS_IMAGES;
        } else if (fieldName.includes('product')) {
          if (fieldName.includes('video')) {
            uploadDir = UPLOAD_FOLDERS.PRODUCTS_VIDEOS;
          } else if (fieldName.includes('document')) {
            uploadDir = UPLOAD_FOLDERS.PRODUCTS_DOCUMENTS;
          } else {
            uploadDir = UPLOAD_FOLDERS.PRODUCTS_IMAGES;
          }
        } else if (fieldName.includes('payment')) {
          uploadDir = UPLOAD_FOLDERS.PAYMENTS;
        } else if (fieldName.includes('cost')) {
          uploadDir = UPLOAD_FOLDERS.COSTS;
        }
        
        // Upload the file
        const uploadedFile = await handleSingleFileUpload(value, uploadDir);
        
        // Group by field name
        if (!results[fieldName]) {
          results[fieldName] = [];
        }
        results[fieldName].push(uploadedFile);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Multiple field upload error:', error);
    throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload files for the approval system
 * Maintains the same interface but uses Vercel Blob storage
 */
export async function uploadFilesForApproval(
  files: File[], 
  resourceType: string,
  resourceId?: string
): Promise<UploadedFile[]> {
  try {
    // Determine upload directory based on resource type
    let uploadDir: string = UPLOAD_FOLDERS.CUSTOMERS_IMAGES; // default
    
    switch (resourceType) {
      case 'customer':
        uploadDir = UPLOAD_FOLDERS.CUSTOMERS_IMAGES;
        break;
      case 'product':
        uploadDir = UPLOAD_FOLDERS.PRODUCTS_IMAGES;
        break;
      case 'payment':
        uploadDir = UPLOAD_FOLDERS.PAYMENTS;
        break;
      case 'cost':
        uploadDir = UPLOAD_FOLDERS.COSTS;
        break;
      default:
        uploadDir = UPLOAD_FOLDERS.CUSTOMERS_IMAGES;
    }
    
    console.log(`📤 Uploading ${files.length} files for approval (${resourceType})`);
    
    return await handleMultipleFileUpload(files, uploadDir);
    
  } catch (error) {
    console.error('❌ Approval file upload error:', error);
    throw new Error(`Failed to upload approval files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determine the correct upload folder for customer files based on file type
 */
export function getCustomerUploadFolder(file: File): string {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check if it's an image
  if (fileType.startsWith('image/') || 
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'].some(ext => fileName.endsWith(ext))) {
    return UPLOAD_FOLDERS.CUSTOMERS_IMAGES;
  }
  
  // Everything else goes to documents folder
  return UPLOAD_FOLDERS.CUSTOMERS_DOCUMENTS;
}

/**
 * Determine the correct upload folder for product files based on file type
 */
export function getProductUploadFolder(file: File): string {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check if it's an image
  if (fileType.startsWith('image/') || 
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'].some(ext => fileName.endsWith(ext))) {
    return UPLOAD_FOLDERS.PRODUCTS_IMAGES;
  }
  
  // Check if it's a video
  if (fileType.startsWith('video/') || 
      ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'].some(ext => fileName.endsWith(ext))) {
    return UPLOAD_FOLDERS.PRODUCTS_VIDEOS;
  }
  
  // Everything else goes to documents folder
  return UPLOAD_FOLDERS.PRODUCTS_DOCUMENTS;
}

// Export folder constants for backward compatibility
export { UPLOAD_FOLDERS }; 