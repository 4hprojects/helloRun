const mongoose = require('mongoose');
const counterService = require('../services/counter.service');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true
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
    required: true
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
  
  // NEW: Organizer Application Fields
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
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-generate userId before saving
userSchema.pre('save', async function(next) {
  if (!this.userId) {
    const count = await counterService.getNextSequence('user');
    this.userId = `U${String(count).padStart(6, '0')}`;
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

// NEW: Organizer Application Methods
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

// Update the methods:

// Check if user can participate in events (runners AND organizers)
userSchema.methods.canParticipateInEvents = function() {
  return this.emailVerified && (this.role === 'runner' || this.role === 'organiser' || this.role === 'admin');
};

// Check if user can create events (only approved organizers)
userSchema.methods.canCreateEvents = function() {
  return this.role === 'organiser' && 
         this.organizerStatus === 'approved' &&
         this.emailVerified;
};

module.exports = mongoose.model('User', userSchema);