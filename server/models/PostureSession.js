const mongoose = require('mongoose');

const postureSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'interrupted'],
      default: 'active',
    },
    modelUsed: {
      type: String,
      default: 'heavy',
    },
    calibrationCompleted: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    monitoringDurationSeconds: {
      type: Number,
      default: 0,
    },
    goodDurationSeconds: {
      type: Number,
      default: 0,
    },
    badDurationSeconds: {
      type: Number,
      default: 0,
    },
    unobservedDurationSeconds: {
      type: Number,
      default: 0,
    },
    dominantBadPosture: {
      type: String,
      default: null,
    },
    postureTypeDurations: {
      type: Map,
      of: Number,
      default: {},
    },
    alertCount: {
      type: Number,
      default: 0,
    },
    trackingToken: {
      type: String,
      select: false, // don't return in queries by default
    },
  },
  {
    timestamps: true,
  }
);

postureSessionSchema.index({ userId: 1, status: 1 });
postureSessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('PostureSession', postureSessionSchema);
