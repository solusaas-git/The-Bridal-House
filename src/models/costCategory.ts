import mongoose from 'mongoose';

const costCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
costCategorySchema.index({ isActive: 1 });

const CostCategory = mongoose.models.CostCategory || mongoose.model('CostCategory', costCategorySchema);

export default CostCategory; 