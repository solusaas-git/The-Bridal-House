/**
 * Migration Script: Upload existing production files to Vercel Blob Storage
 * 
 * This script helps you migrate your existing production files from local storage
 * to Vercel Blob storage while maintaining the exact same folder structure.
 * 
 * IMPORTANT: Run this script AFTER deploying to Vercel and setting up environment variables
 */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');

// Your existing folder structure (mirrors the folders in your uploads directory)
const FOLDERS_TO_MIGRATE = [
  'uploads/customers/images',
  'uploads/customers/documents',
  'uploads/products/images', 
  'uploads/products/videos',
  'uploads/products/documents',
  'uploads/payment',
  'uploads/costs'
];

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.heic': 'image/heic',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload a single file to Vercel Blob
 */
async function uploadFileToVercelBlob(localFilePath, relativePath) {
  try {
    console.log(`📤 Uploading: ${relativePath}`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(localFilePath);
    const filename = path.basename(relativePath);
    const mimeType = getMimeType(filename);
    
    // Create File object from buffer
    const file = new File([fileBuffer], filename, { type: mimeType });
    
    // Upload to Vercel Blob maintaining the exact path structure
    const blob = await put(relativePath, file, {
      access: 'public',
      contentType: mimeType,
    });
    
    console.log(`✅ Successfully uploaded: ${blob.url}`);
    return blob;
    
  } catch (error) {
    console.error(`❌ Failed to upload ${relativePath}:`, error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateFiles() {
  console.log('🚀 Starting migration to Vercel Blob Storage...\n');
  
  // Check if BLOB_READ_WRITE_TOKEN is available
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is required!');
    console.log('Please set this in your .env.local file or Vercel environment variables.');
    process.exit(1);
  }
  
  let totalFiles = 0;
  let successfulUploads = 0;
  let failedUploads = 0;
  
  for (const folder of FOLDERS_TO_MIGRATE) {
    const folderPath = path.join(process.cwd(), 'public', folder);
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folder} - Skipping...`);
      continue;
    }
    
    console.log(`\n📁 Processing folder: ${folder}`);
    
    try {
      // Get all files in the folder
      const files = getAllFiles(folderPath);
      
      if (files.length === 0) {
        console.log(`   No files found in ${folder}`);
        continue;
      }
      
      console.log(`   Found ${files.length} files to upload`);
      totalFiles += files.length;
      
      // Upload each file
      for (const filePath of files) {
        try {
          // Create relative path maintaining folder structure
          const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath)
                                   .replace(/\\/g, '/'); // Convert Windows paths to Unix
          
          await uploadFileToVercelBlob(filePath, relativePath);
          successfulUploads++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          failedUploads++;
          console.error(`   ❌ Failed to upload: ${filePath}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing folder ${folder}:`, error.message);
    }
  }
  
  // Summary
  console.log(`\n🎉 Migration Complete!`);
  console.log(`📊 Summary:`);
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Successful uploads: ${successfulUploads}`);
  console.log(`   Failed uploads: ${failedUploads}`);
  
  if (failedUploads > 0) {
    console.log(`\n⚠️  Some files failed to upload. Please check the logs above and retry.`);
  } else {
    console.log(`\n✅ All files successfully migrated to Vercel Blob Storage!`);
  }
}

/**
 * Dry run - just list files that would be uploaded
 */
async function dryRun() {
  console.log('🔍 Dry run - Files that would be migrated:\n');
  
  let totalFiles = 0;
  
  for (const folder of FOLDERS_TO_MIGRATE) {
    const folderPath = path.join(process.cwd(), 'public', folder);
    
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folder}`);
      continue;
    }
    
    const files = getAllFiles(folderPath);
    console.log(`📁 ${folder}: ${files.length} files`);
    
    files.forEach(filePath => {
      const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath)
                               .replace(/\\/g, '/');
      console.log(`   - ${relativePath}`);
    });
    
    totalFiles += files.length;
    console.log('');
  }
  
  console.log(`📊 Total files to migrate: ${totalFiles}`);
}

// Run the script
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  
  if (isDryRun) {
    dryRun().catch(console.error);
  } else {
    migrateFiles().catch(console.error);
  }
}

module.exports = { migrateFiles, dryRun }; 