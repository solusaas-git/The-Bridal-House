/**
 * Production Files Migration Script for Vercel Blob Storage
 * 
 * This script migrates ALL your production files to Vercel Blob Storage
 * while maintaining the exact same folder structure.
 * 
 * Usage:
 * BLOB_READ_WRITE_TOKEN=your_token_here node migrate-production-files.js
 */

const fs = require('fs');
const path = require('path');

// Your production folder structure
const FOLDERS_TO_MIGRATE = [
  'uploads/customers/images',
  'uploads/customers/documents',
  'uploads/products',
  'uploads/payment'
];

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // Skip system files like .DS_Store
      if (!file.startsWith('.')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function migrateFiles() {
  // Check if token is provided
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('❌ Please provide your BLOB_READ_WRITE_TOKEN');
    console.log('');
    console.log('📋 How to get your token:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your "The Bridal House" project');
    console.log('3. Go to Settings → Environment Variables');
    console.log('4. Find BLOB_READ_WRITE_TOKEN and copy its value');
    console.log('');
    console.log('🚀 Then run:');
    console.log('BLOB_READ_WRITE_TOKEN=your_token_here node migrate-production-files.js');
    return;
  }

  console.log('🚀 Starting migration of ALL production files to Vercel Blob Storage...');
  console.log('');
  
  // Import Vercel Blob (dynamic import for Node.js compatibility)
  const { put } = await import('@vercel/blob');
  
  // Start from the main project directory (one level up from nextjs-app)
  const mainProjectDir = path.join(process.cwd(), '..');
  
  let totalFiles = 0;
  let successfulUploads = 0;
  let failedUploads = 0;
  
  for (const folder of FOLDERS_TO_MIGRATE) {
    const folderPath = path.join(mainProjectDir, folder);
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folder} - Skipping...`);
      continue;
    }
    
    console.log(`📁 Processing folder: ${folder}`);
    
    try {
      // Get all files in the folder (including subdirectories)
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
          const relativePath = path.relative(mainProjectDir, filePath)
                                   .replace(/\\/g, '/'); // Convert Windows paths to Unix
          
          console.log(`   📤 Uploading: ${relativePath}`);
          
          // Read the file
          const fileBuffer = fs.readFileSync(filePath);
          const filename = path.basename(relativePath);
          const mimeType = getMimeType(filename);
          
          // Create File object from buffer
          const file = new File([fileBuffer], filename, { type: mimeType });
          
          // Upload to Vercel Blob maintaining the exact path structure
          const blob = await put(relativePath, file, {
            access: 'public',
            contentType: mimeType,
          });
          
          console.log(`   ✅ Success: ${blob.url}`);
          successfulUploads++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 150));
          
        } catch (error) {
          failedUploads++;
          const relativePath = path.relative(mainProjectDir, filePath);
          console.error(`   ❌ Failed to upload ${relativePath}:`, error.message);
        }
      }
      
      console.log(`   ✅ Completed folder: ${folder}`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error processing folder ${folder}:`, error.message);
    }
  }
  
  // Summary
  console.log('🎉 Migration Complete!');
  console.log('📊 Summary:');
  console.log(`   Total files found: ${totalFiles}`);
  console.log(`   Successful uploads: ${successfulUploads}`);
  console.log(`   Failed uploads: ${failedUploads}`);
  
  if (successfulUploads > 0) {
    console.log('');
    console.log('✅ Your production files are now available in Vercel Blob Storage!');
    console.log('🔗 You can view them in your Vercel dashboard under Storage → Blob');
    console.log('');
    console.log('📁 Folder structure maintained:');
    FOLDERS_TO_MIGRATE.forEach(folder => {
      console.log(`   - ${folder}/`);
    });
  }
  
  if (failedUploads > 0) {
    console.log('');
    console.log('⚠️  Some files failed to upload. You can retry the script to upload failed files.');
  }
}

// First, let's do a dry run to show what will be migrated
async function dryRun() {
  console.log('🔍 Dry run - Production files that will be migrated:');
  console.log('');
  
  const mainProjectDir = path.join(process.cwd(), '..');
  let totalFiles = 0;
  
  for (const folder of FOLDERS_TO_MIGRATE) {
    const folderPath = path.join(mainProjectDir, folder);
    
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folder}`);
      continue;
    }
    
    const files = getAllFiles(folderPath);
    console.log(`📁 ${folder}: ${files.length} files`);
    
    // Show first few files as examples
    files.slice(0, 3).forEach(filePath => {
      const relativePath = path.relative(mainProjectDir, filePath)
                               .replace(/\\/g, '/');
      console.log(`   - ${relativePath}`);
    });
    
    if (files.length > 3) {
      console.log(`   ... and ${files.length - 3} more files`);
    }
    
    totalFiles += files.length;
    console.log('');
  }
  
  console.log(`📊 Total files to migrate: ${totalFiles}`);
  console.log('');
  console.log('🚀 To start migration, run:');
  console.log('BLOB_READ_WRITE_TOKEN=your_token_here node migrate-production-files.js migrate');
}

// Check command line arguments
const command = process.argv[2];

if (command === 'migrate') {
  // Run the actual migration
  migrateFiles().catch(console.error);
} else {
  // Run dry run by default
  dryRun().catch(console.error);
} 