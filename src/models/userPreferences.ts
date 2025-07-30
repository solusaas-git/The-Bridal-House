import mongoose, { Document, Model, Schema } from 'mongoose';

interface ColumnPreferences {
  [page: string]: {
    [column: string]: boolean;
  };
}

export interface IUserPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  columnPreferences: ColumnPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    columnPreferences: {
      type: Schema.Types.Mixed,
      default: {
        customers: {
          id: true,
          firstName: true,
          lastName: true,
          address: false,
          idNumber: false,
          phone: true,
          weddingDate: true,
          weddingTime: false,
          weddingLocation: false,
          weddingCity: true,
          type: false,
          createdAt: true,
          updatedAt: false,
          createdBy: false,
          actions: true,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation during development
let UserPreferences: Model<IUserPreferences>;

try {
  UserPreferences = mongoose.model<IUserPreferences>('UserPreferences');
} catch {
  UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);
}

export default UserPreferences; 