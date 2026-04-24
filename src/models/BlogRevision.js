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
      enum: ['admin_autosave', 'author_revision'],
      default: 'admin_autosave'
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'rejected', 'approved', 'discarded', ''],
      default: '',
      index: true
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
    },
    submittedAt: {
      type: Date,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    appliedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    moderationFlags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 120
        }
      ],
      default: []
    },
    moderationFlagSummary: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

blogRevisionSchema.index({ postId: 1, editedAt: -1 });
blogRevisionSchema.index({ postId: 1, source: 1, status: 1, editedAt: -1 });

module.exports = mongoose.models.BlogRevision || mongoose.model('BlogRevision', blogRevisionSchema);
