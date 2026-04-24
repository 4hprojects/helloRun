const mongoose = require('mongoose');

const REPORT_REASONS = Object.freeze([
  'spam',
  'plagiarism',
  'promotion',
  'unsafe_medical',
  'abuse',
  'other'
]);
const REPORT_STATUSES = Object.freeze(['open', 'resolved', 'dismissed']);

const blogReportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['post', 'comment'],
      required: true,
      index: true
    },
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogComment',
      default: null,
      index: true
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
      index: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'open',
      index: true
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  { timestamps: true }
);

blogReportSchema.index(
  { targetType: 1, blogId: 1, commentId: 1, reporterId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
blogReportSchema.index({ blogId: 1, status: 1, createdAt: -1 });
blogReportSchema.index({ commentId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.BlogReport || mongoose.model('BlogReport', blogReportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
module.exports.REPORT_STATUSES = REPORT_STATUSES;
