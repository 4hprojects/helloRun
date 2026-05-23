const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const shopNoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'internal'
    },
    message: {
      type: String,
      trim: true,
      maxlength: 3000,
      required: true
    },
    createdBy: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const shopOrderNotesSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true
    },
    notes: {
      type: [shopNoteSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);
applySmokeTestSchema(shopOrderNotesSchema);

module.exports = mongoose.models.ShopOrderNotes || mongoose.model('ShopOrderNotes', shopOrderNotesSchema);
