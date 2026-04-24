const mongoose = require('mongoose');

const COMMENT_STATUSES = Object.freeze(['active', 'removed']);
const MAX_COMMENT_LENGTH = 1000;

const blogCommentSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_COMMENT_LENGTH
    },
    status: {
      type: String,
      enum: COMMENT_STATUSES,
      default: 'active',
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    moderationNote: {
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
      maxlength: 300,
      default: ''
    }
  },
  { timestamps: true }
);

blogCommentSchema.index({ blogId: 1, createdAt: -1 });
blogCommentSchema.index({ authorId: 1, createdAt: -1 });

module.exports = mongoose.model('BlogComment', blogCommentSchema);
module.exports.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
