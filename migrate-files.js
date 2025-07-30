/**
 * Simple Migration Script for Vercel Blob Storage
 * 
 * Usage:
 * BLOB_READ_WRITE_TOKEN=your_token_here node migrate-files.js
 */

const fs = require('fs');
const path = require('path');

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
    console.log('BLOB_READ_WRITE_TOKEN=your_token_here node migrate-files.js');
    return;
  }

  console.log('🚀 Starting migration to Vercel Blob Storage...');
  
  // Import Vercel Blob (dynamic import for Node.js compatibility)
  const { put } = await import('@vercel/blob');
  
  // Find the file to migrate
  const costsDir = path.join(process.cwd(), 'public', 'uploads', 'costs');
  
  if (!fs.existsSync(costsDir)) {
    console.log('❌ No costs directory found');
    return;
  }
  
  const files = fs.readdirSync(costsDir);
  console.log(`📁 Found ${files.length} files in costs directory`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const filename of files) {
    try {
      const filePath = path.join(costsDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Get file extension for MIME type
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      console.log(`📤 Uploading: uploads/costs/${filename}`);
      
      // Create File object
      const file = new File([fileBuffer], filename, { type: mimeType });
      
      // Upload to Vercel Blob with the same path structure
      const blob = await put(`uploads/costs/${filename}`, file, {
        access: 'public',
        contentType: mimeType,
      });
      
      console.log(`✅ Successfully uploaded: ${blob.url}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to upload ${filename}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n🎉 Migration Complete!');
  console.log(`📊 Summary:`);
  console.log(`   Successful uploads: ${successCount}`);
  console.log(`   Failed uploads: ${errorCount}`);
  
  if (successCount > 0) {
    console.log('\n✅ Your files are now available in Vercel Blob Storage!');
    console.log('🔗 You can view them in your Vercel dashboard under Storage → Blob');
  }
}

// Run the migration
migrateFiles().catch(console.error); 