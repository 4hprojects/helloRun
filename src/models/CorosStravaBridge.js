const mongoose = require('mongoose');
const { applySmokeTestSchema } = require('../utils/smoke-test-schema');

const corosStravaBridgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['setup_started', 'user_confirmed'],
      required: true,
      default: 'setup_started'
    },
    guideVersion: {
      type: String,
      required: true,
      maxlength: 40
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    confirmedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true, strict: 'throw' }
);

applySmokeTestSchema(corosStravaBridgeSchema);

module.exports = mongoose.models.CorosStravaBridge ||
  mongoose.model('CorosStravaBridge', corosStravaBridgeSchema);
