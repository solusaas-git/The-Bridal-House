import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISettings extends Document {
  currency: string;
  currencyCode: string;
  currencyPosition: 'before' | 'after';
  isActive: boolean;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    currency: {
      type: String,
      default: 'DH',
      required: true,
    },
    currencyCode: {
      type: String,
      default: 'MAD',
      required: true,
      uppercase: true,
      maxlength: 3,
    },
    currencyPosition: {
      type: String,
      enum: ['before', 'after'],
      default: 'after',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists (singleton pattern)
SettingsSchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema); 