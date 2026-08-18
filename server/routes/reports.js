const express = require('express');
const { requireAuth } = require('../middleware/auth');
const PostureReport = require('../models/PostureReport');
const { aggregateWeeklyReport } = require('../services/aggregationService');
const {
  isValidDateStr,
  daysBetween,
  getTodayLocal,
  getRollingSevenDayWindow,
  addDaysToDateStr,
} = require('../utils/dateUtils');
const PostureHistory = require('../models/PostureHistory');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Generate Weekly Report ───
// Supports rolling 7-day windows via endDate OR legacy from/to.
//
// API Contract:
//   POST /api/reports/weekly
//   Body: { endDate: "2026-08-18" }
//     → generates report for 2026-08-12 through 2026-08-18
//
//   POST /api/reports/weekly
//   Body: { from: "2026-08-12", to: "2026-08-18" }
//     → same result (backwards compatible)
//
// Response shape:
//   { report: PostureReport }
//   where PostureReport has:
//     fromDate, toDate, generatedAt,
//     totalMonitoringDurationSeconds, totalBadDurationSeconds, totalGoodDurationSeconds,
//     badPosturePercentage, goodPosturePercentage, mostFrequentBadPosture
router.post('/weekly', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    let from, to;

    // Support endDate parameter (preferred rolling-window API)
    if (req.body.endDate) {
      const endDate = req.body.endDate;
      if (!isValidDateStr(endDate)) {
        return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD.' });
      }

      const today = getTodayLocal();
      if (endDate > today) {
        return res.status(400).json({ error: 'Cannot generate report for future dates.' });
      }

      const window = getRollingSevenDayWindow(endDate);
      from = window.startDate;
      to = window.endDate;
    } else if (req.body.from && req.body.to) {
      // Legacy from/to parameters
      from = req.body.from;
      to = req.body.to;

      if (!isValidDateStr(from) || !isValidDateStr(to)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const today = getTodayLocal();
      if (to > today) {
        return res.status(400).json({ error: 'Cannot generate report for future dates.' });
      }

      if (from > to) {
        return res.status(400).json({ error: 'from date must be before to date.' });
      }

      const range = daysBetween(from, to);
      if (range > 7) {
        return res.status(400).json({ error: 'Report range must be at most 7 days.' });
      }
    } else {
      return res.status(400).json({ error: 'Either endDate or from+to are required.' });
    }

    // Check eligibility: user must have 7-day history span
    const first = await PostureHistory.findOne({ userId }).sort({ localDate: 1 });
    if (!first) {
      return res.status(400).json({
        error: 'Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history.',
        eligible: false,
      });
    }

    const eligibleDate = addDaysToDateStr(first.localDate, 6);
    const today = getTodayLocal();

    if (today < eligibleDate) {
      return res.status(400).json({
        error: 'Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history.',
        eligible: false,
        eligibleDate: eligibleDate,
      });
    }

    if (from < first.localDate) {
      return res.status(400).json({
        error: 'No data available before ' + first.localDate,
      });
    }

    // Aggregate using the shared aggregation service
    const stats = await aggregateWeeklyReport(userId, from, to);

    // Upsert the report snapshot
    const report = await PostureReport.findOneAndUpdate(
      { userId, fromDate: from, toDate: to },
      {
        userId,
        fromDate: from,
        toDate: to,
        generatedAt: new Date(),
        totalMonitoringDurationSeconds: stats.monitoringDurationSeconds,
        totalBadDurationSeconds: stats.badDurationSeconds,
        totalGoodDurationSeconds: stats.goodDurationSeconds,
        badPosturePercentage: stats.badPosturePercentage,
        goodPosturePercentage: stats.goodPosturePercentage,
        mostFrequentBadPosture: stats.mostFrequentBadPosture,
      },
      { upsert: true, new: true }
    );

    logger.info(`Weekly report generated: ${from} to ${to}`);
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
