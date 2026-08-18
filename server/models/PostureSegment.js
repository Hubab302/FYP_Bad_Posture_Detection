const mongoose = require('mongoose');

const postureSegmentSchema = new mongoose.Schema(
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
    state: {
      type: String,
      enum: ['good', 'bad', 'unobserved'],
      required: true,
    },
    postureTypes: {
      type: [String],
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    averageConfidence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

postureSegmentSchema.index({ sessionId: 1, startedAt: 1 });

module.exports = mongoose.model('PostureSegment', postureSegmentSchema);
