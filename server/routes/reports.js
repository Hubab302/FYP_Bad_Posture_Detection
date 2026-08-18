const express = require('express');
const { requireAuth } = require('../middleware/auth');
const PostureReport = require('../models/PostureReport');
const { aggregateWeeklyReport } = require('../services/aggregationService');
const { isValidDateStr, daysBetween, getTodayLocal } = require('../utils/dateUtils');
const PostureHistory = require('../models/PostureHistory');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Generate Weekly Report ───
router.post('/weekly', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates are required.' });
    }

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

    // Check eligibility: user must have 7-day history span
    const first = await PostureHistory.findOne({ userId }).sort({ localDate: 1 });
    if (!first) {
      return res.status(400).json({
        error: 'Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history.',
        eligible: false,
      });
    }

    const firstDate = new Date(first.localDate);
    const eligibleDate = new Date(firstDate);
    eligibleDate.setDate(eligibleDate.getDate() + 6);
    const eligibleStr = eligibleDate.toISOString().slice(0, 10);

    if (today < eligibleStr) {
      return res.status(400).json({
        error: 'Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history.',
        eligible: false,
        eligibleDate: eligibleStr,
      });
    }

    if (from < first.localDate) {
      return res.status(400).json({
        error: 'No data available before ' + first.localDate,
      });
    }

    // Aggregate
    const stats = await aggregateWeeklyReport(userId, from, to);

    // Upsert the report
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
