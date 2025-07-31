import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IReservation extends Document {
  type: string;
  client?: mongoose.Types.ObjectId;
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid' | 'Not Paid';
  items: mongoose.Types.ObjectId[];
  pickupDate: Date;
  returnDate: Date;
  availabilityDate?: Date;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  additionalCost: number;
  itemsTotal: number;
  subtotal: number;
  securityDeposit: number;
  securityDepositPercentage: number;
  securityDepositAmount: number;
  advance: number;
  advancePercentage: number;
  advanceAmount: number;
  total: number;
  remainingBalance: number;
  notes?: string;
  bufferAfter?: number;
  bufferBefore?: number;
  availability?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    type: {
      type: String,
      required: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Partially Paid', 'Not Paid'],
      default: 'Pending',
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
    availabilityDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Draft', 'Confirmed', 'Cancelled'], // Example statuses
      default: 'Draft',
    },
    additionalCost: {
      type: Number,
      default: 0,
    },
    // Calculated financial fields - computed and stored
    itemsTotal: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    securityDepositPercentage: {
      type: Number,
      default: 30,
    },
    securityDepositAmount: {
      type: Number,
      default: 0,
    },
    advance: {
      type: Number,
      default: 0,
    },
    advancePercentage: {
      type: Number,
      default: 50,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      required: false,
    },
    bufferAfter: {
      type: Number,
    },
    bufferBefore: {
      type: Number,
    },
    availability: {
      type: Number,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // This option will add createdAt and updatedAt fields
  }
);

// Prevent re-compilation during development
let Reservation: Model<IReservation>;

try {
  Reservation = mongoose.model<IReservation>('Reservation');
} catch {
  Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
}

export default Reservation; 