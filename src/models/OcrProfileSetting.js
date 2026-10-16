const mongoose = require('mongoose');

// Operator state for code-defined OCR profiles (src/services/ocr/ocr-profiles.js).
// Profile rules are versioned in code and tested; this records whether an admin has
// enabled a profile for production detection, and who changed it. A missing row means
// the profile's code default applies (`test` profiles are not used in production).
const ocrProfileSettingSchema = new mongoose.Schema(
  {
    profileId: { type: String, trim: true, required: true, maxlength: 40 },
    status: { type: String, enum: ['draft', 'test', 'active', 'retired'], required: true },
    profileVersion: { type: String, trim: true, default: '', maxlength: 40 },
    notes: { type: String, trim: true, default: '', maxlength: 500 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    history: {
      type: [new mongoose.Schema({
        status: { type: String, maxlength: 20 },
        profileVersion: { type: String, maxlength: 40 },
        notes: { type: String, maxlength: 500 },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        changedAt: { type: Date, default: Date.now }
      }, { _id: false })],
      default: []
    }
  },
  { timestamps: true }
);

ocrProfileSettingSchema.index({ profileId: 1 }, { unique: true });

module.exports = mongoose.models.OcrProfileSetting || mongoose.model('OcrProfileSetting', ocrProfileSettingSchema);
