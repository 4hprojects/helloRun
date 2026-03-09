const mongoose = require('mongoose');

const POLICY_STATUSES = ['draft', 'published', 'archived'];

const actorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      trim: true,
      default: 'System'
    }
  },
  { _id: false }
);

const privacyPolicySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Privacy Policy',
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      default: 'privacy-policy',
      trim: true,
      maxlength: 120,
      index: true
    },
    versionNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    status: {
      type: String,
      enum: POLICY_STATUSES,
      default: 'draft',
      index: true
    },
    effectiveDate: {
      type: Date,
      default: null
    },
    contentMarkdown: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250000
    },
    contentMode: {
      type: String,
      enum: ['markdown', 'rich'],
      default: 'markdown'
    },
    contentHtml: {
      type: String,
      default: '',
      trim: true,
      maxlength: 350000
    },
    summaryOfChanges: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    isCurrent: {
      type: Boolean,
      default: false,
      index: true
    },
    source: {
      type: String,
      trim: true,
      enum: ['seed', 'admin'],
      default: 'admin'
    },
    createdBy: {
      type: actorSchema,
      default: () => ({ name: 'System' })
    },
    updatedBy: {
      type: actorSchema,
      default: () => ({ name: 'System' })
    },
    publishedBy: {
      type: actorSchema,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

privacyPolicySchema.index({ slug: 1, versionNumber: 1 }, { unique: true });
privacyPolicySchema.index({ slug: 1, status: 1, isCurrent: 1 });
privacyPolicySchema.index(
  { slug: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true, status: 'published' }
  }
);

module.exports = mongoose.models.PrivacyPolicy || mongoose.model('PrivacyPolicy', privacyPolicySchema);
