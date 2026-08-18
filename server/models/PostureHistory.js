const mongoose = require('mongoose');

const postureHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    localDate: {
      type: String, // 'YYYY-MM-DD' format
      required: true,
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
    postureTypeDurations: {
      type: Map,
      of: Number,
      default: {},
    },
    postureTypes: {
      type: [String],
      default: [],
    },
    badPosturePercentage: {
      type: Number,
      default: 0,
    },
    goodPosturePercentage: {
      type: Number,
      default: 0,
    },
    mostFrequentBadPosture: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one entry per user per date
postureHistorySchema.index({ userId: 1, localDate: 1 }, { unique: true });

module.exports = mongoose.model('PostureHistory', postureHistorySchema);
