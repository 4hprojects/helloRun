const mongoose = require('mongoose');
const counterService = require('../services/counter.service');

const organiserApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Business Information
  businessName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  businessType: {
    type: String,
    enum: ['individual', 'company', 'ngo', 'sports_club'],
    required: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  businessRegistrationNumber: {
    type: String,
    trim: true
  },
  businessAddress: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Document Uploads
  idProofUrl: {
    type: String,
    required: true
  },
  businessProofUrl: {
    type: String,
    required: true
  },
  
  additionalInfo: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-generate applicationId before saving
organiserApplicationSchema.pre('save', async function(next) {
  if (!this.applicationId) {
    const count = await counterService.getNextSequence('organiserApplication');
    this.applicationId = `APP${String(count).padStart(6, '0')}`;
  }
  next();
});

// Add index for faster queries
organiserApplicationSchema.index({ userId: 1 });
organiserApplicationSchema.index({ status: 1 });
organiserApplicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OrganiserApplication', organiserApplicationSchema);