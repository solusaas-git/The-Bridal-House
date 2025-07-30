import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  subCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    subCategories: [{ type: String, unique: true }],
  },
  { timestamps: true }
);

// Prevent re-compilation during development
let Category: Model<ICategory>;

try {
  Category = mongoose.model<ICategory>('Category');
} catch {
  Category = mongoose.model<ICategory>('Category', CategorySchema);
}

export default Category; 