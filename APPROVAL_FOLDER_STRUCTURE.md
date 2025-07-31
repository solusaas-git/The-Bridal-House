# Approval Folder Structure

## Overview

The approval system now uses a **structured folder hierarchy** that mirrors the production upload folders, ensuring consistency and better organization of pending approval files.

## Folder Structure

### Production Folders
```
uploads/
├── customers/
│   ├── images/        # Customer profile images, ID scans
│   └── documents/     # Customer contracts, documents
├── products/
│   ├── images/        # Product photos
│   ├── videos/        # Product videos
│   └── documents/     # Product specifications, catalogs
├── payment/           # Payment receipts, bank transfers
├── reservations/      # Reservation-related files
└── costs/             # Cost receipts, invoices
```

### Approval Folders (NEW)
```
approvals/
├── customers/
│   ├── images/        # Customer images pending approval
│   └── documents/     # Customer documents pending approval
├── products/
│   ├── images/        # Product images pending approval
│   ├── videos/        # Product videos pending approval
│   └── documents/     # Product documents pending approval
├── payments/          # Payment attachments pending approval
├── reservations/      # Reservation files pending approval
├── costs/             # Cost attachments pending approval
└── general/           # Fallback for unknown types
```

## File Flow

### 1. Employee Upload (to Approval Folders)
```
Employee uploads → approvals/{resource}/{type}/
```

**Examples:**
- Customer image → `approvals/customers/images/`
- Product video → `approvals/products/videos/`
- Payment receipt → `approvals/payments/`
- Cost invoice → `approvals/costs/`

### 2. Admin Approval (move to Production Folders)
```
Admin approves → uploads/{resource}/{type}/
```

**Examples:**
- `approvals/customers/images/photo.jpg` → `uploads/customers/images/photo.jpg`
- `approvals/products/videos/demo.mp4` → `uploads/products/videos/demo.mp4`
- `approvals/payments/receipt.pdf` → `uploads/payment/receipt.pdf`

## File Type Detection

Files are automatically categorized based on their extension:

### Images
- **Extensions**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`, `.ico`
- **Folder**: `{resource}/images/`

### Videos  
- **Extensions**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv`
- **Folder**: `{resource}/videos/`

### Documents (Default)
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- **Folder**: `{resource}/documents/`

## Implementation Details

### ApprovalHandler.tsx
```typescript
// Determines approval upload directory
const getApprovalUploadDir = (resourceType: string, fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  let fileType = 'documents'; // Default
  if (imageExts.includes(extension)) fileType = 'images';
  else if (videoExts.includes(extension)) fileType = 'videos';

  switch (resourceType) {
    case 'customer': return `approvals/customers/${fileType}`;
    case 'product': return `approvals/products/${fileType}`;
    case 'payment': return 'approvals/payments';
    case 'cost': return 'approvals/costs';
    default: return 'approvals/general';
  }
};
```

### Approval Execution
```typescript
// Moves files from approval folders to production folders
const targetFolder = getResourceUploadFolder(resourceType, filename);

// Example transformations:
// approvals/customers/images/photo.jpg → uploads/customers/images/photo.jpg
// approvals/products/videos/demo.mp4 → uploads/products/videos/demo.mp4
// approvals/payments/receipt.pdf → uploads/payment/receipt.pdf
```

## Benefits

1. **✅ Consistency**: Approval folders mirror production structure
2. **✅ Organization**: Files are pre-categorized by type during approval
3. **✅ Clarity**: Easy to understand where files will end up after approval
4. **✅ Maintenance**: Easier to manage and clean up approval files
5. **✅ Scalability**: Easy to add new resource types or file categories

## Vercel Blob Integration

Updated `UPLOAD_FOLDERS` constant includes all approval paths:

```typescript
export const UPLOAD_FOLDERS = {
  // Production folders
  CUSTOMERS_IMAGES: 'uploads/customers/images',
  CUSTOMERS_DOCUMENTS: 'uploads/customers/documents',
  PRODUCTS_IMAGES: 'uploads/products/images',
  // ... etc
  
  // Approval folders  
  APPROVALS_CUSTOMERS_IMAGES: 'approvals/customers/images',
  APPROVALS_CUSTOMERS_DOCUMENTS: 'approvals/customers/documents',
  APPROVALS_PRODUCTS_IMAGES: 'approvals/products/images',
  // ... etc
} as const;
```

## Migration Impact

- **Existing approvals**: Will still work (approval system checks for `approvals/` prefix)
- **New approvals**: Will use the structured folder system
- **File movement**: Automatically handles both old and new approval folder structures

## Examples

### Customer Profile Image Approval
1. **Employee uploads**: `customer-photo.jpg` → `approvals/customers/images/`
2. **Admin approves**: File moves → `uploads/customers/images/`
3. **Result**: Customer profile image available in production

### Product Video Approval  
1. **Employee uploads**: `product-demo.mp4` → `approvals/products/videos/`
2. **Admin approves**: File moves → `uploads/products/videos/`
3. **Result**: Product video available in production

### Payment Receipt Approval
1. **Employee uploads**: `payment-receipt.pdf` → `approvals/payments/`
2. **Admin approves**: File moves → `uploads/payment/`
3. **Result**: Payment receipt attached to payment record 