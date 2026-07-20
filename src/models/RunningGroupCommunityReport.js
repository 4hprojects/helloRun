const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const REPORT_REASONS = ['spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other'];
const schema = new mongoose.Schema({
  targetType: { type: String, enum: ['announcement', 'comment'], required: true, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'RunningGroup', required: true, index: true },
  announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'RunningGroupAnnouncement', required: true, index: true },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RunningGroupComment', default: null, index: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  contentSnapshot: { type: String, maxlength: 2000, default: '', immutable: true },
  authorIdSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  revisionAtSnapshot: { type: Date, default: null, immutable: true },
  editCountSnapshot: { type: Number, min: 0, default: 0, immutable: true },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolutionNote: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

schema.index({ targetType: 1, announcementId: 1, commentId: 1, reporterId: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'open' }
});
schema.index({ groupId: 1, status: 1, createdAt: -1 });
applySmokeTestSchema(schema);

module.exports = mongoose.models.RunningGroupCommunityReport || mongoose.model('RunningGroupCommunityReport', schema);
module.exports.REPORT_REASONS = REPORT_REASONS;
