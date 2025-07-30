import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  primaryPhoto: string;
  secondaryImages: string[];
  videoUrls: string[];
  rentalCost: number;
  buyCost?: number;
  sellPrice?: number;
  size?: number;
  category?: mongoose.Types.ObjectId;
  subCategory?: string;
  quantity: number;
  status: 'Draft' | 'Published';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true, // Name is required
    },
    primaryPhoto: {
      type: String, // URL or path to the primary photo
      required: true,
    },
    secondaryImages: [
      {
        type: String, // Array of URLs or paths for secondary photos
      },
    ],
    videoUrls: [
      {
        type: String, // Array of video URLs or paths
      },
    ],
    rentalCost: {
      type: Number,
      required: true, // Rental cost is required
    },
    buyCost: {
      type: Number,
    },
    sellPrice: {
      type: Number,
    },
    size: {
      type: Number
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    subCategory: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Prevent re-compilation during development
let Product: Model<IProduct>;

try {
  Product = mongoose.model<IProduct>('Product');
} catch {
  Product = mongoose.model<IProduct>('Product', ProductSchema);
}

export default Product; 