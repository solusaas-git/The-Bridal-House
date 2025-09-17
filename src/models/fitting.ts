import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFitting extends Document {
  client?: mongoose.Types.ObjectId;
  items: mongoose.Types.ObjectId[];
  pickupDate: Date; // fitting date/time
  returnDate: Date; // same as pickupDate, kept for UI compatibility
  status: 'Confirmed' | 'Cancelled' | 'Reservé';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fittingSchema = new Schema<IFitting>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    pickupDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Cancelled', 'Pending', 'Reservé'],
      default: 'Confirmed',
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

let Fitting: Model<IFitting>;

try {
  Fitting = mongoose.model<IFitting>('Fitting');
} catch {
  Fitting = mongoose.model<IFitting>('Fitting', fittingSchema);
}

export default Fitting;

