const mongoose = require('mongoose');

const postureReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    toDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    totalMonitoringDurationSeconds: {
      type: Number,
      default: 0,
    },
    totalBadDurationSeconds: {
      type: Number,
      default: 0,
    },
    totalGoodDurationSeconds: {
      type: Number,
      default: 0,
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

// Prevent duplicate reports for same user+range
postureReportSchema.index({ userId: 1, fromDate: 1, toDate: 1 }, { unique: true });

module.exports = mongoose.model('PostureReport', postureReportSchema);
