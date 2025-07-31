import mongoose, { Schema } from 'mongoose';

/**
 * Standardized Attachment Interface
 * Used across all models (Customer, Payment, Cost, Product, Reservation)
 */
export interface IAttachment {
  name: string;        // Original filename (required)
  size: number;        // File size in bytes (required)
  url: string;         // Vercel Blob URL (required)
  type: string;        // File type: 'image', 'document', 'video', 'audio', 'other' (required)
  uploadedAt?: Date;   // Upload timestamp (optional)
  uploadedBy?: mongoose.Types.ObjectId; // User who uploaded (optional)
}

/**
 * Standardized Attachment Schema
 * Mongoose schema for the standardized attachment
 */
export const AttachmentSchema = new Schema<IAttachment>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['image', 'document', 'video', 'audio', 'other'],
    default: 'other'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  _id: true, // Each attachment gets its own ID
  timestamps: false // We have uploadedAt manually
});

/**
 * Helper function to determine file type from extension
 */
export function getFileTypeFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'wma', 'm4a'];

  if (imageExts.includes(extension)) return 'image';
  if (documentExts.includes(extension)) return 'document';
  if (videoExts.includes(extension)) return 'video';
  if (audioExts.includes(extension)) return 'audio';
  return 'other';
}

/**
 * Helper function to create a standardized attachment object
 */
export function createAttachment(
  name: string,
  size: number, 
  url: string,
  uploadedBy?: mongoose.Types.ObjectId
): IAttachment {
  return {
    name,
    size,
    url,
    type: getFileTypeFromExtension(name),
    uploadedAt: new Date(),
    uploadedBy
  };
} 