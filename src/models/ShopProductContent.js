const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const shopProductContentSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true
    },
    slug: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    name: {
      type: String,
      trim: true,
      maxlength: 255,
      default: ''
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 400,
      default: ''
    },
    fullDescription: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: ''
    },
    careInstructions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    pickupInstructions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 320,
      default: ''
    }
  },
  {
    timestamps: true
  }
);
applySmokeTestSchema(shopProductContentSchema);

module.exports = mongoose.models.ShopProductContent || mongoose.model('ShopProductContent', shopProductContentSchema);
