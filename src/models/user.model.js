const mongoose = require('mongoose');
const Counter = require('./counter.model');

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    unique: true,
    // ✅ REMOVE 'required: true' - let the pre-save hook handle it
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true, // ✅ Keep this, remove schema.index() below
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['runner', 'organiser', 'admin'],
    required: true,
    default: 'runner'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastPasswordResetSent: Date,
  verificationEmailCount: {
    type: Number,
    default: 0
  },
  lastVerificationEmailSent: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ Auto-increment userId before validation (not after)
userSchema.pre('validate', async function(next) {
  // Only generate userId for new documents
  if (this.isNew && !this.userId) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'userId',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.userId = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// ✅ Virtual for user-friendly formatted ID
userSchema.virtual('userIdFormatted').get(function() {
  // Format: USER001234 (6 digits, zero-padded)
  return `USER${String(this.userId).padStart(6, '0')}`;
});

// ✅ Virtual for short display ID
userSchema.virtual('userIdShort').get(function() {
  // Format: #1234
  return `#${this.userId}`;
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// ❌ REMOVE THESE - Duplicate index definitions
// userSchema.index({ email: 1 }, { unique: true });
// userSchema.index({ userId: 1 }, { unique: true });
// ✅ Already defined with 'unique: true' in schema fields above

// Method to check if user can receive verification email (rate limiting)
userSchema.methods.canReceiveVerificationEmail = function() {
  if (!this.lastVerificationEmailSent) return true;
  
  const hoursSinceLastEmail = (Date.now() - this.lastVerificationEmailSent) / (1000 * 60 * 60);
  return hoursSinceLastEmail >= 1; // Can send once per hour
};

// Method to increment verification email count
userSchema.methods.incrementVerificationEmailCount = function() {
  this.verificationEmailCount += 1;
  this.lastVerificationEmailSent = new Date();
};

// Update updatedAt on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;