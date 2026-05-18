const mongoose = require('mongoose');

const shopImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 500 },
    alt: { type: String, trim: true, maxlength: 200, default: '' },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
    mimeType: { type: String, trim: true, maxlength: 80, default: '' },
    sizeBytes: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const shopMediaMetadataSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true
    },
    images: {
      type: [shopImageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.ShopMediaMetadata || mongoose.model('ShopMediaMetadata', shopMediaMetadataSchema);
