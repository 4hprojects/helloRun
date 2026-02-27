const mongoose = require('mongoose');
const { BLOG_STATUSES, BLOG_CATEGORIES } = require('../utils/blog');

const blogSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 170
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 320,
      default: ''
    },
    contentHtml: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120000
    },
    contentText: {
      type: String,
      trim: true,
      maxlength: 120000,
      default: ''
    },
    contentRaw: {
      type: String,
      trim: true,
      maxlength: 150000,
      default: ''
    },
    coverImageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    galleryImageUrls: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 2000
        }
      ],
      default: []
    },
    category: {
      type: String,
      required: true,
      enum: BLOG_CATEGORIES
    },
    customCategory: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 40
        }
      ],
      default: []
    },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: 'draft',
      index: true
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    submittedAt: {
      type: Date,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    moderationNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    readingTime: {
      type: Number,
      default: 1,
      min: 1
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ''
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 320,
      default: ''
    },
    ogImageUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ authorId: 1, createdAt: -1 });
blogSchema.index({ category: 1, publishedAt: -1 });
blogSchema.index({ tags: 1, publishedAt: -1 });
blogSchema.index({ title: 'text', excerpt: 'text', contentText: 'text', tags: 'text' });

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
