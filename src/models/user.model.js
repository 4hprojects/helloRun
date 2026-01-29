const mongoose = require('mongoose'); // ✅ ADD THIS LINE

const userSchema = new mongoose.Schema({
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
    unique: true,
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

// Virtual for user ID formatted
userSchema.virtual('userIdFormatted').get(function() {
  return `USER-${this._id.toString().slice(-6).toUpperCase()}`;
});

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