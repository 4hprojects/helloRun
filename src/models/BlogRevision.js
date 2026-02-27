const mongoose = require('mongoose');

const blogRevisionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    source: {
      type: String,
      required: true,
      enum: ['admin_autosave'],
      default: 'admin_autosave'
    },
    changedFields: {
      type: [String],
      default: []
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    editedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

blogRevisionSchema.index({ postId: 1, editedAt: -1 });

module.exports = mongoose.models.BlogRevision || mongoose.model('BlogRevision', blogRevisionSchema);
