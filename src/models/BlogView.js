const mongoose = require('mongoose');

const blogViewSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
      index: true
    },
    viewedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

blogViewSchema.index({ blogId: 1, userId: 1, viewedAt: -1 });
blogViewSchema.index({ blogId: 1, ipAddress: 1, viewedAt: -1 });

module.exports = mongoose.models.BlogView || mongoose.model('BlogView', blogViewSchema);
