const express = require('express');
const { requireAuth } = require('../middleware/auth');
const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');
const { isValidDateStr, daysBetween, getTodayLocal, toLocalDateStr } = require('../utils/dateUtils');
const { calculateStats } = require('../services/aggregationService');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Get Data Range ───
router.get('/range', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const firstHistory = await PostureHistory.findOne({ userId }).sort({ localDate: 1 });
    const lastHistory = await PostureHistory.findOne({ userId }).sort({ localDate: -1 });
    const firstSession = await PostureSession.findOne({ userId }).sort({ startedAt: 1 });
    const lastSession = await PostureSession.findOne({ userId }).sort({ startedAt: -1 });

    let firstDataDate = firstHistory ? firstHistory.localDate : null;
    let lastDataDate = lastHistory ? lastHistory.localDate : null;

    if (firstSession) {
      const firstSessionDate = toLocalDateStr(firstSession.startedAt);
      if (!firstDataDate || firstSessionDate < firstDataDate) {
        firstDataDate = firstSessionDate;
      }
    }
    
    if (lastSession) {
      const lastSessionDate = toLocalDateStr(lastSession.startedAt);
      if (!lastDataDate || lastSessionDate > lastDataDate) {
        lastDataDate = lastSessionDate;
      }
    }

    if (!firstDataDate || !lastDataDate) {
      return res.json({
        hasData: false,
        firstDataDate: null,
        lastDataDate: null,
        reportEligibleDate: null,
      });
    }

    // Report eligible after 7 days from first data
    const firstDate = new Date(firstDataDate);
    const eligibleDate = new Date(firstDate);
    eligibleDate.setDate(eligibleDate.getDate() + 6);
    const eligibleStr = eligibleDate.toISOString().slice(0, 10);

    res.json({
      hasData: true,
      firstDataDate: firstDataDate,
      lastDataDate: lastDataDate,
      reportEligibleDate: eligibleStr,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get History for Date Range ───
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query parameters are required.' });
    }

    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'from date must be before or equal to to date.' });
    }

    const today = getTodayLocal();
    if (to > today) {
      return res.status(400).json({ error: 'Cannot query future dates.' });
    }

    const range = daysBetween(from, to);
    if (range > 7) {
      return res.status(400).json({ error: 'Maximum range is 7 days.' });
    }

    // Fetch history records
    const records = await PostureHistory.find({
      userId,
      localDate: { $gte: from, $lte: to },
    }).sort({ localDate: 1 });

    const activeSessions = await PostureSession.find({
      userId,
      status: 'active'
    });

    // Build a complete 7-day response (include days with no data)
    const result = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const existing = records.find((r) => r.localDate === dateStr);
      let recordObj = existing ? existing.toObject() : {
        localDate: dateStr,
        monitoringDurationSeconds: 0,
        goodDurationSeconds: 0,
        badDurationSeconds: 0,
        postureTypeDurations: {},
        postureTypes: [],
        badPosturePercentage: 0,
        goodPosturePercentage: 0,
        mostFrequentBadPosture: null,
        hasData: false,
      };

      // Add active sessions dynamically
      const activeSessionsForDate = activeSessions.filter(
        (s) => toLocalDateStr(s.startedAt) === dateStr
      );
      
      if (activeSessionsForDate.length > 0) {
        let typeDurations = existing?.postureTypeDurations instanceof Map 
            ? Object.fromEntries(existing.postureTypeDurations) 
            : (existing?.postureTypeDurations || {});

        for (const s of activeSessionsForDate) {
           recordObj.goodDurationSeconds += s.goodDurationSeconds || 0;
           recordObj.badDurationSeconds += s.badDurationSeconds || 0;
           recordObj.monitoringDurationSeconds = recordObj.goodDurationSeconds + recordObj.badDurationSeconds;
           
           if (s.postureTypeDurations) {
             const sDurations = s.postureTypeDurations instanceof Map ? Object.fromEntries(s.postureTypeDurations) : s.postureTypeDurations;
             for (const [type, dur] of Object.entries(sDurations)) {
                typeDurations[type] = (typeDurations[type] || 0) + dur;
             }
           }
        }
        
        const stats = calculateStats(recordObj.goodDurationSeconds, recordObj.badDurationSeconds, typeDurations);
        recordObj.badPosturePercentage = stats.badPosturePercentage;
        recordObj.goodPosturePercentage = stats.goodPosturePercentage;
        recordObj.mostFrequentBadPosture = stats.mostFrequentBadPosture;
        recordObj.hasData = recordObj.monitoringDurationSeconds > 0;
        recordObj.postureTypes = Object.keys(typeDurations).filter((k) => typeDurations[k] > 0);
      }

      result.push(recordObj);
      current.setDate(current.getDate() + 1);
    }

    res.json({ history: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
