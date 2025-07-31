# Attachment Schema Standardization

## Overview

All models in the application now use a **standardized attachment schema** for consistency, maintainability, and to eliminate compatibility issues between different modules.

## Standardized Schema

### Interface Definition
```typescript
interface IAttachment {
  name: string;        // Original filename (required)
  size: number;        // File size in bytes (required)
  url: string;         // Vercel Blob URL (required)
  type: string;        // File type category (required)
  uploadedAt?: Date;   // Upload timestamp (optional)
  uploadedBy?: mongoose.Types.ObjectId; // User who uploaded (optional)
}
```

### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ Yes | Original filename (e.g., "invoice.pdf") |
| `size` | Number | ✅ Yes | File size in bytes |
| `url` | String | ✅ Yes | Vercel Blob storage URL |
| `type` | String | ✅ Yes | File category: `image`, `document`, `video`, `audio`, `other` |
| `uploadedAt` | Date | ❌ No | Timestamp when file was uploaded (auto-generated) |
| `uploadedBy` | ObjectId | ❌ No | Reference to User who uploaded the file |

## File Type Categories

The `type` field is automatically determined from the file extension:

- **`image`**: jpg, jpeg, png, gif, bmp, webp, svg, ico
- **`document`**: pdf, doc, docx, txt, rtf, xls, xlsx, ppt, pptx  
- **`video`**: mp4, avi, mov, wmv, flv, webm, mkv
- **`audio`**: mp3, wav, aac, ogg, wma, m4a
- **`other`**: Any other file type

## Usage Across Models

### Before Standardization
```typescript
// Customer Model (inconsistent)
interface IAttachment {
  name: string;
  size: number;
  link: string;  // ❌ Different field name
}

// Payment Model (inconsistent)  
interface IPaymentAttachment {
  name?: string;  // ❌ Optional
  size?: number;  // ❌ Optional
  url?: string;   // ❌ Optional
}

// Cost Model (inconsistent)
interface ICostAttachment {
  name: string;
  url: string; 
  size: number;
  type: string;  // ❌ No validation
}
```

### After Standardization
```typescript
// ALL Models use the same interface
import { IAttachment, AttachmentSchema } from './shared/attachment';

// In every model schema:
attachments: [AttachmentSchema]
```

## Benefits

1. **✅ Consistency**: All models use identical attachment structure
2. **✅ Type Safety**: Unified TypeScript interface across the application
3. **✅ Validation**: Consistent field requirements and enum validation
4. **✅ Maintainability**: Single source of truth for attachment schema
5. **✅ Approval System**: No more compatibility issues during file movement
6. **✅ Auto-categorization**: Automatic file type detection from extensions

## Helper Functions

### `getFileTypeFromExtension(filename: string): string`
Automatically determines file type category from filename extension.

### `createAttachment(name, size, url, uploadedBy?): IAttachment`
Creates a properly formatted attachment object with all required fields.

## Migration Completed

- **17 customers** with attachments migrated ✅
- **24 payments** with attachments migrated ✅  
- **0 costs** with attachments (none existed) ✅

All existing attachment data has been converted to the new standardized schema.

## File Location

The shared attachment schema is defined in:
```
src/models/shared/attachment.ts
```

And exported through:
```
src/models/index.ts
```

## Implementation Status

- ✅ Shared schema created
- ✅ Customer model updated  
- ✅ Payment model updated
- ✅ Cost model updated
- ✅ Approval system updated to use shared functions
- ✅ Database migration completed
- ✅ All existing data standardized 