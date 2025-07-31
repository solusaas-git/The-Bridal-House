import mongoose, { Document, Model, Schema } from 'mongoose';
import { IAttachment, AttachmentSchema } from './shared/attachment';

export interface ICustomer extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  address: string;
  idNumber: string;
  phone: string;
  weddingCity: string;
  whatsapp?: string;
  weddingDate?: string;
  weddingTime?: string;
  weddingLocation?: string;
  type: 'Client' | 'Prospect';
  attachments: IAttachment[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    idNumber: { type: String, required: true },
    phone: { type: String, required: true },
    weddingCity: { type: String, required: true },
    whatsapp: { type: String },
    weddingDate: { type: String },
    weddingTime: { type: String },
    weddingLocation: { type: String },
    type: { type: String, enum: ['Client', 'Prospect'], default: 'Client' },
    attachments: [AttachmentSchema], // Use the new AttachmentSchema
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent re-compilation during development
let Customer: Model<ICustomer>;

try {
  Customer = mongoose.model<ICustomer>('Customer');
} catch {
  Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
}

export default Customer; 