const mongoose = require('mongoose');

// Heartbeat and last preflight from the separate training worker process
// (`npm run ocr:training-worker`). The admin "Start training" control is only enabled while
// a worker reported in recently with a passing preflight; the API enforces the same.
const ocrTrainingWorkerStatusSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'training-worker', unique: true },
    hostname: { type: String, default: '', maxlength: 120 },
    pid: { type: Number, default: null },
    lastSeenAt: { type: Date, default: null },
    preflight: { type: mongoose.Schema.Types.Mixed, default: null },
    toolVersions: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.models.OcrTrainingWorkerStatus || mongoose.model('OcrTrainingWorkerStatus', ocrTrainingWorkerStatusSchema);
