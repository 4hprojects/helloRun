const mongoose = require('mongoose');

const submissionIdempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 128
    },
    scope: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80
    },
    runnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

submissionIdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.SubmissionIdempotencyKey ||
  mongoose.model('SubmissionIdempotencyKey', submissionIdempotencyKeySchema);
