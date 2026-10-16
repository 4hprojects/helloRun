const mongoose = require('mongoose');

// Append-only audit trail for OCR administration (profiles, samples, datasets, training,
// model activation/rollback, notification settings). Awaited on write, unlike the
// fire-and-forget Postgres critical audit, which is also written alongside. Payloads are
// kept minimal: ids, statuses and short reasons — never image content or raw OCR text.
const ocrAuditEventSchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true, maxlength: 80 },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetType: { type: String, trim: true, required: true, maxlength: 40 },
    targetId: { type: String, trim: true, default: '', maxlength: 80 },
    statusFrom: { type: String, trim: true, default: '', maxlength: 40 },
    statusTo: { type: String, trim: true, default: '', maxlength: 40 },
    reason: { type: String, trim: true, default: '', maxlength: 500 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, default: '', maxlength: 64 },
    userAgent: { type: String, trim: true, default: '', maxlength: 300 }
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);

ocrAuditEventSchema.index({ createdAt: -1 });
ocrAuditEventSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ocrAuditEventSchema.index({ action: 1, createdAt: -1 });

function refuseUpdate(next) {
  next(new Error('OcrAuditEvent rows are append-only.'));
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  ocrAuditEventSchema.pre(hook, refuseUpdate);
}

module.exports = mongoose.models.OcrAuditEvent || mongoose.model('OcrAuditEvent', ocrAuditEventSchema);
