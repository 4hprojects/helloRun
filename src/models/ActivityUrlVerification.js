const mongoose = require('mongoose');
const { URL_VERIFICATION_STATUSES, URL_VERIFICATION_METHODS } = require('../utils/ocr/activity-evidence');

// One row per check of an entry's optional activity link (doc 02 "URLVerification"),
// written once. The entry's activityUrlVerification holds the latest result; this keeps
// who checked, how, and what they saw. No page HTML, redirects, routes or credentials.
const activityUrlVerificationSchema = new mongoose.Schema(
  {
    entryKind: { type: String, enum: ['run_submission', 'accumulated_activity'], required: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    provider: { type: String, trim: true, default: '', maxlength: 20 },
    providerActivityId: { type: String, trim: true, default: '', maxlength: 64 },
    method: { type: String, enum: URL_VERIFICATION_METHODS, required: true },
    status: { type: String, enum: URL_VERIFICATION_STATUSES, required: true },
    comparedFields: {
      distance: { type: String, default: '', maxlength: 20 },
      duration: { type: String, default: '', maxlength: 20 },
      date: { type: String, default: '', maxlength: 20 }
    },
    notes: { type: String, trim: true, default: '', maxlength: 500 },
    provenance: { type: String, trim: true, default: '', maxlength: 60 },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkedAt: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityUrlVerificationSchema.index({ entryId: 1, checkedAt: -1 });
activityUrlVerificationSchema.index({ provider: 1, status: 1, checkedAt: -1 });

function refuseUpdate(next) {
  next(new Error('ActivityUrlVerification rows are append-only.'));
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace']) {
  activityUrlVerificationSchema.pre(hook, refuseUpdate);
}

module.exports = mongoose.models.ActivityUrlVerification || mongoose.model('ActivityUrlVerification', activityUrlVerificationSchema);
