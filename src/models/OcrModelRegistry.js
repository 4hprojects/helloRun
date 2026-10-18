const mongoose = require('mongoose');

// The single active-model pointer. Changed only by compare-and-set on `version`, so two
// concurrent activations cannot both win, and the previous model is always recorded for
// rollback. `activeModelId: 'base-eng'` means the bundled base English model.
const ocrModelRegistrySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'server-ocr', unique: true },
    activeModelId: { type: String, default: 'base-eng', maxlength: 60 },
    previousModelId: { type: String, default: '', maxlength: 60 },
    activatedAt: { type: Date, default: null },
    activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.OcrModelRegistry || mongoose.model('OcrModelRegistry', ocrModelRegistrySchema);
