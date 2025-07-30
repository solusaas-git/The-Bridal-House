import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  isVerified: boolean;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
    },
    resetToken: String,
    resetTokenExpiry: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation during development
let User: Model<IUser>;

try {
  User = mongoose.model<IUser>('User');
} catch {
  User = mongoose.model<IUser>('User', userSchema);
}

export default User; 