const mongoose = require('mongoose');

const shopPolicySnapshotSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true
    },
    acceptedPolicies: {
      termsVersion: { type: String, trim: true, maxlength: 50, default: '' },
      privacyVersion: { type: String, trim: true, maxlength: 50, default: '' },
      refundPolicyVersion: { type: String, trim: true, maxlength: 50, default: '' }
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.ShopPolicySnapshot || mongoose.model('ShopPolicySnapshot', shopPolicySnapshotSchema);
