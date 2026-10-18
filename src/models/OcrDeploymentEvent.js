const mongoose = require('mongoose');

// Every activation and rollback of the server OCR model (doc 02 "DeploymentEvent").
// Append-only; failed attempts are recorded too, with the old model left in place.
const ocrDeploymentEventSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['activate', 'rollback'], required: true },
    outcome: { type: String, enum: ['succeeded', 'failed'], required: true },
    oldModelId: { type: String, default: '', maxlength: 60 },
    newModelId: { type: String, default: '', maxlength: 60 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, trim: true, default: '', maxlength: 500 },
    errorCode: { type: String, trim: true, default: '', maxlength: 60 },
    auditId: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrAuditEvent', default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ocrDeploymentEventSchema.index({ createdAt: -1 });

function refuseUpdate(next) {
  next(new Error('OcrDeploymentEvent rows are append-only.'));
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace']) {
  ocrDeploymentEventSchema.pre(hook, refuseUpdate);
}

module.exports = mongoose.models.OcrDeploymentEvent || mongoose.model('OcrDeploymentEvent', ocrDeploymentEventSchema);
