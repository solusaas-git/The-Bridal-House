import mongoose from 'mongoose';

const costSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCategory',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  relatedReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  relatedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
costSchema.index({ date: -1 });
costSchema.index({ category: 1 });
costSchema.index({ amount: 1 });
costSchema.index({ createdBy: 1 });
costSchema.index({ relatedReservation: 1 });
costSchema.index({ relatedProduct: 1 });

const Cost = mongoose.models.Cost || mongoose.model('Cost', costSchema);

export default Cost; 