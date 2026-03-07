const mongoose = require('mongoose');

const runningGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 160
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    memberCount: {
      type: Number,
      default: 1,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

runningGroupSchema.index({ memberCount: -1, updatedAt: -1 });

module.exports = mongoose.models.RunningGroup || mongoose.model('RunningGroup', runningGroupSchema);
