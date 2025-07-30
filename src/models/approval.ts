import mongoose, { Schema, Document } from 'mongoose';

export interface IApproval extends Document {
  requestedBy: mongoose.Types.ObjectId;
  actionType: 'edit' | 'delete';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation';
  resourceId: mongoose.Types.ObjectId;
  originalData: any;
  newData?: any;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<IApproval>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionType: {
      type: String,
      enum: ['edit', 'delete'],
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['customer', 'item', 'payment', 'reservation'],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    originalData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    newData: {
      type: Schema.Types.Mixed,
      required: function(this: IApproval) {
        return this.actionType === 'edit';
      },
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewComment: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ApprovalSchema.index({ status: 1, createdAt: -1 });
ApprovalSchema.index({ requestedBy: 1 });

const Approval = mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);

export default Approval; 