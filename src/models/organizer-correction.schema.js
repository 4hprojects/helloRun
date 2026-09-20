const mongoose = require('mongoose');

// Audit trail of organizer corrections to a submitted entry's values. The critical-audit
// table only stores free-text notes, so the structured before/after pairs live here and
// are what the per-runner submissions page renders as "Correction history".
const organizerCorrectionSchema = new mongoose.Schema(
  {
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true, required: true, maxlength: 500 },
    changes: {
      type: [
        new mongoose.Schema(
          {
            field: { type: String, trim: true, required: true, maxlength: 40 },
            from: { type: mongoose.Schema.Types.Mixed, default: null },
            to: { type: mongoose.Schema.Types.Mixed, default: null }
          },
          { _id: false }
        )
      ],
      default: []
    }
  },
  { _id: false }
);

module.exports = { organizerCorrectionSchema };
