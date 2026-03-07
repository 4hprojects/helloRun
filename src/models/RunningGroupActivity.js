const mongoose = require('mongoose');

const runningGroupActivitySchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RunningGroup',
      required: true,
      index: true
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    type: {
      type: String,
      required: true,
      enum: ['group_created', 'joined_group', 'left_group']
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220
    }
  },
  {
    timestamps: true
  }
);

runningGroupActivitySchema.index({ groupId: 1, createdAt: -1 });

module.exports =
  mongoose.models.RunningGroupActivity || mongoose.model('RunningGroupActivity', runningGroupActivitySchema);
