const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostureSession',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    postureTypes: {
      type: [String],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
    },
    badDurationAtAlertSeconds: {
      type: Number,
      required: true,
    },
    repeatNumber: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ userId: 1, sessionId: 1 });

module.exports = mongoose.model('Alert', alertSchema);
