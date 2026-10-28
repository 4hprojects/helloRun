const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const activeQuestGenerationJobSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, immutable: true, trim: true, maxlength: 80 },
  seriesKey: { type: String, required: true, trim: true, default: 'active-quest' },
  year: { type: Number, required: true, min: 2000, max: 3000 },
  month: { type: Number, required: true, min: 1, max: 12 },
  status: { type: String, enum: ['running', 'succeeded', 'failed'], required: true, default: 'running', index: true },
  attempts: { type: Number, min: 0, default: 0 },
  claimedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  nextRetryAt: { type: Date, default: null, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  workerId: { type: String, trim: true, maxlength: 160, default: '' },
  lastError: { type: String, trim: true, maxlength: 2000, default: '' }
}, { timestamps: true });

activeQuestGenerationJobSchema.index({ seriesKey: 1, year: 1, month: 1 }, { unique: true });
applySmokeTestSchema(activeQuestGenerationJobSchema);

module.exports = mongoose.models.ActiveQuestGenerationJob ||
  mongoose.model('ActiveQuestGenerationJob', activeQuestGenerationJobSchema);
