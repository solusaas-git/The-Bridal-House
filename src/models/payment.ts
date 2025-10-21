import mongoose, { Document, Model, Schema } from 'mongoose';
import { IAttachment, AttachmentSchema } from './shared/attachment';

export interface IPayment extends Document {
  client: mongoose.Types.ObjectId;
  reservation: mongoose.Types.ObjectId;
  paymentDate?: Date;
  amount?: number;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType?: 'Advance' | 'Security' | 'Final' | 'Other';
  status?: 'Pending' | 'Completed' | 'Cancelled' | 'Refunded';
  reference?: string;
  note?: string;
  attachments: IAttachment[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    paymentDate: { type: Date },
    amount: { type: Number },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Credit Card', 'Check'],
    },
    paymentType: {
      type: String,
      enum: ['Advance', 'Security', 'Final', 'Other'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled', 'Refunded'],
      default: 'Completed',
    },
    reference: {
      type: String,
    },
    note: {
      type: String,
    },
    attachments: [AttachmentSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent re-compilation during development
let Payment: Model<IPayment>;

try {
  Payment = mongoose.model<IPayment>('Payment');
} catch {
  Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
}

export default Payment; 