const mongoose = require('mongoose');
const counterService = require('../services/counter.service');

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    unique: true,
    required: function() {
      // Only required for new documents
      return this.isNew;
    },
    sparse: true // Allow null/undefined for existing users
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    required: true,
    default: 'local'
  },
  passwordHash: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    }
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['runner', 'organiser', 'admin'],
    default: 'runner'
  },
  profilePicture: {
    type: String,
    default: null
  },
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  lastVerificationEmailSent: {
    type: Date,
    default: null
  },
  verificationEmailCount: {
    type: Number,
    default: 0
  },
  verificationEmailResetDate: {
    type: Date,
    default: Date.now
  },
  // Password reset
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  lastPasswordResetSent: {
    type: Date,
    default: null
  },
  passwordResetEmailCount: {
    type: Number,
    default: 0
  },
  passwordResetEmailResetDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual field for formatted userId
userSchema.virtual('userIdFormatted').get(function() {
  if (!this.userId) return 'N/A';
  return counterService.formatUserId(this.userId);
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Auto-assign userId before saving new user
userSchema.pre('save', async function(next) {
  // Only assign userId if it's a new user and userId not set
  if (this.isNew && !this.userId) {
    try {
      this.userId = await counterService.getNextUserId();
    } catch (error) {
      return next(error);
    }
  }
  
  // Prevent mixing auth providers
  if (this.isNew) {
    const existingUser = await mongoose.model('User').findOne({ email: this.email });
    if (existingUser && existingUser.authProvider !== this.authProvider) {
      const error = new Error(`This email is already registered with ${existingUser.authProvider} authentication`);
      error.code = 'AUTH_PROVIDER_MISMATCH';
      return next(error);
    }
  }
  
  next();
});

// Method to check if user can receive verification email
userSchema.methods.canReceiveVerificationEmail = function() {
  const now = new Date();
  const maxEmailsPerDay = parseInt(process.env.MAX_VERIFICATION_EMAILS_PER_DAY) || 3;
  
  // Reset counter if 24 hours passed
  if (this.verificationEmailResetDate && 
      now - this.verificationEmailResetDate > 24 * 60 * 60 * 1000) {
    this.verificationEmailCount = 0;
    this.verificationEmailResetDate = now;
  }
  
  return this.verificationEmailCount < maxEmailsPerDay;
};

// Method to increment verification email count
userSchema.methods.incrementVerificationEmailCount = function() {
  this.verificationEmailCount += 1;
  this.lastVerificationEmailSent = new Date();
  
  if (!this.verificationEmailResetDate) {
    this.verificationEmailResetDate = new Date();
  }
};

// Method to check if user can receive password reset email
userSchema.methods.canReceivePasswordResetEmail = function() {
  const now = new Date();
  const maxEmailsPerDay = parseInt(process.env.MAX_PASSWORD_RESET_EMAILS_PER_DAY) || 3;
  
  // Reset counter if 24 hours passed
  if (this.passwordResetEmailResetDate && 
      now - this.passwordResetEmailResetDate > 24 * 60 * 60 * 1000) {
    this.passwordResetEmailCount = 0;
    this.passwordResetEmailResetDate = now;
  }
  
  return this.passwordResetEmailCount < maxEmailsPerDay;
};

// Method to increment password reset email count
userSchema.methods.incrementPasswordResetEmailCount = function() {
  this.passwordResetEmailCount += 1;
  this.lastPasswordResetSent = new Date();
  
  if (!this.passwordResetEmailResetDate) {
    this.passwordResetEmailResetDate = new Date();
  }
};

module.exports = mongoose.model('User', userSchema);