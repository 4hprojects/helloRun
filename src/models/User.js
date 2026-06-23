const mongoose = require('mongoose');
const { getNextSequence, formatUserId } = require('../utils/counter');
const logger = require('../utils/logger');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

// ── User Schema ──
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: function requiredPasswordHash() {
      return this.authProvider !== 'google';
    }
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  avatarUrl: {
    type: String,
    default: '',
    trim: true
  },
  role: {
    type: String,
    enum: ['runner', 'organiser', 'admin'],
    default: 'runner'
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 60,
    default: ''
  },
  mobile: {
    type: String,
    trim: true,
    maxlength: 25,
    default: ''
  },
  // Trust/Verified Author fields
  verifiedAuthor: {
    type: Boolean,
    default: false,
    index: true
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  country: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non_binary', 'prefer_not_to_say', ''],
    default: ''
  },
  emergencyContactName: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  emergencyContactNumber: {
    type: String,
    trim: true,
    maxlength: 25,
    default: ''
  },
  runningGroup: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  runningGroups: {
    type: [{
      type: String,
      trim: true,
      maxlength: 120
    }],
    default: []
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  passwordResetEmailCount: {
    type: Number,
    default: 0
  },
  passwordResetEmailLastSent: {
    type: Date
  },

  // Organizer Application Fields
  organizerApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrganiserApplication',
    default: null
  },
  organizerStatus: {
    type: String,
    enum: ['not_applied', 'pending', 'approved', 'rejected'],
    default: 'not_applied'
  },

  organizerEventCreationAcknowledgement: {
    agreedAt: {
      type: Date,
      default: null
    },
    signatureName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ''
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

  termsAcceptedAt: {
    type: Date,
    default: null
  },

  agreedPolicies: {
    privacyPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivacyPolicy',
      default: null
    },
    privacyPolicyVersion: {
      type: String,
      trim: true,
      default: ''
    },
    termsPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivacyPolicy',
      default: null
    },
    termsPolicyVersion: {
      type: String,
      trim: true,
      default: ''
    },
    cookiePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivacyPolicy',
      default: null
    },
    cookiePolicyVersion: {
      type: String,
      trim: true,
      default: ''
    },
    dataUsagePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivacyPolicy',
      default: null
    },
    dataUsagePolicyVersion: {
      type: String,
      trim: true,
      default: ''
    },
    agreedAt: {
      type: Date,
      default: null
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

  accountStatus: {
    type: String,
    enum: ['active', 'restricted', 'suspended', 'closed'],
    default: 'active'
  },
  accountStatusReason: {
    type: String,
    maxlength: 500,
    default: ''
  },
  accountStatusUpdatedAt: {
    type: Date,
    default: null
  },
  accountStatusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  adminNotes: [{
    note: { type: String, required: true, maxlength: 1000 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now }
  }],

  adminVerificationResentAt: { type: [Date], default: [] },

  savedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
applySmokeTestSchema(userSchema);

// Auto-generate userId for new users
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.userId) {
    try {
      const count = await getNextSequence('userId');
      this.userId = formatUserId(count);
      logger.debug('Generated userId:', this.userId);
    } catch (error) {
      logger.error('Error generating userId:', error);
      return next(error);
    }
  }
  next();
});

// Password reset email rate limiting
userSchema.methods.canReceivePasswordResetEmail = function() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (!this.passwordResetEmailLastSent || this.passwordResetEmailLastSent < oneDayAgo) {
    return true;
  }

  return this.passwordResetEmailCount < 3;
};

userSchema.methods.incrementPasswordResetEmailCount = function() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (!this.passwordResetEmailLastSent || this.passwordResetEmailLastSent < oneDayAgo) {
    this.passwordResetEmailCount = 1;
  } else {
    this.passwordResetEmailCount += 1;
  }

  this.passwordResetEmailLastSent = now;
};

// Organizer Application Methods
userSchema.methods.canApplyAsOrganizer = function() {
  return (this.role === 'runner' || this.role === 'organiser') &&
         this.emailVerified &&
         this.organizerStatus === 'not_applied';
};

userSchema.methods.hasActiveApplication = function() {
  return this.organizerStatus === 'pending';
};

userSchema.methods.isApprovedOrganizer = function() {
  return this.role === 'organiser' &&
         this.organizerStatus === 'approved';
};

userSchema.methods.canParticipateInEvents = function() {
  if (this.accountStatus === 'restricted') return false;
  return this.emailVerified && (this.role === 'runner' || this.role === 'organiser' || this.role === 'admin');
};

userSchema.methods.canCreateEvents = function() {
  if (this.role !== 'organiser' || !this.emailVerified) return false;
  if (this.organizerStatus === 'approved') return true;
  return this.role === 'organiser' &&
         this.organizerStatus === 'pending' &&
         Boolean(this.organizerEventCreationAcknowledgement?.agreedAt);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
