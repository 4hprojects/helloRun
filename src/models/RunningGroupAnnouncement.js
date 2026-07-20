const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const MAX_ANNOUNCEMENT_LENGTH = 2000;
const revisionSchema = new mongoose.Schema({
  content: { type: String, trim: true, maxlength: MAX_ANNOUNCEMENT_LENGTH, default: '' },
  effectiveAt: { type: Date, required: true },
  replacedAt: { type: Date, required: true },
  redactedAt: { type: Date, default: null },
  redactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: true });

const schema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'RunningGroup', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: MAX_ANNOUNCEMENT_LENGTH },
  commentsCount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['active', 'removed'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderationNote: { type: String, trim: true, maxlength: 500, default: '' },
  moderationFlags: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  moderationFlagSummary: { type: String, trim: true, maxlength: 300, default: '' },
  editCount: { type: Number, min: 0, max: 5, default: 0 },
  lastEditedAt: { type: Date, default: null },
  editHistory: { type: [revisionSchema], default: [] }
}, { timestamps: true });

schema.index({ groupId: 1, createdAt: -1, _id: -1 });
applySmokeTestSchema(schema);

module.exports = mongoose.models.RunningGroupAnnouncement || mongoose.model('RunningGroupAnnouncement', schema);
module.exports.MAX_ANNOUNCEMENT_LENGTH = MAX_ANNOUNCEMENT_LENGTH;
