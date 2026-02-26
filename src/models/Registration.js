const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participant: {
      firstName: { type: String, required: true, trim: true, maxlength: 60 },
      lastName: { type: String, required: true, trim: true, maxlength: 60 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
      mobile: { type: String, trim: true, default: '', maxlength: 25 },
      country: { type: String, trim: true, default: '', maxlength: 100 },
      dateOfBirth: { type: Date, default: null },
      gender: {
        type: String,
        enum: ['male', 'female', 'non_binary', 'prefer_not_to_say', ''],
        default: ''
      },
      emergencyContactName: { type: String, trim: true, default: '', maxlength: 120 },
      emergencyContactNumber: { type: String, trim: true, default: '', maxlength: 25 },
      runningGroup: { type: String, trim: true, default: '', maxlength: 120 }
    },
    participationMode: {
      type: String,
      enum: ['virtual', 'onsite'],
      required: true
    },
    raceDistance: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'confirmed', 'cancelled', 'refunded'],
      default: 'confirmed'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed', 'refunded'],
      default: 'unpaid'
    },
    waiver: {
      accepted: { type: Boolean, required: true, default: true },
      version: { type: Number, required: true, min: 1 },
      signature: { type: String, required: true, trim: true, maxlength: 160 },
      acceptedAt: { type: Date, required: true, default: Date.now },
      templateSnapshot: { type: String, required: true, trim: true, maxlength: 20000 },
      renderedSnapshot: { type: String, required: true, trim: true, maxlength: 22000 }
    },
    confirmationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^HR-[A-Z0-9]{6}$/
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
registrationSchema.index({ confirmationCode: 1 }, { unique: true });

module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
