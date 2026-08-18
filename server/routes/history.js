const express = require('express');
const { requireAuth } = require('../middleware/auth');
const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');
const {
  isValidDateStr,
  daysBetween,
  getTodayLocal,
  toLocalDateStr,
  addDaysToDateStr,
  getLocalDatesInRange,
  getRollingSevenDayWindow,
  clampToToday,
} = require('../utils/dateUtils');
const { calculateStats } = require('../services/aggregationService');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Get Data Range ───
// Returns the user's first/last data dates and report eligibility date.
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

    // Report eligible when the span from first data date covers 7 days
    // i.e. firstDataDate + 6 days = the first valid end-date for a 7-day report
    const eligibleDate = addDaysToDateStr(firstDataDate, 6);

    res.json({
      hasData: true,
      firstDataDate: firstDataDate,
      lastDataDate: lastDataDate,
      reportEligibleDate: eligibleDate,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get History for Date Range ───
// Supports arbitrary rolling 7-day windows via ?endDate=YYYY-MM-DD
// OR the legacy ?from=YYYY-MM-DD&to=YYYY-MM-DD parameters.
//
// API Contract:
//   GET /api/history?endDate=2026-08-18
//     → returns 7 days: 2026-08-12 through 2026-08-18
//
//   GET /api/history?from=2026-08-12&to=2026-08-18
//     → same result (backwards compatible)
//
// Response shape:
//   { history: HistoryRecord[] }
//   where each HistoryRecord has:
//     localDate, monitoringDurationSeconds, goodDurationSeconds, badDurationSeconds,
//     postureTypeDurations, postureTypes, badPosturePercentage, goodPosturePercentage,
//     mostFrequentBadPosture, hasData
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    let from, to;

    // Support endDate parameter (preferred rolling-window API)
    if (req.query.endDate) {
      const endDate = req.query.endDate;
      if (!isValidDateStr(endDate)) {
        return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD.' });
      }

      const today = getTodayLocal();
      // Clamp future dates — never allow endDate beyond today
      const clampedEnd = endDate > today ? today : endDate;
      const window = getRollingSevenDayWindow(clampedEnd);
      from = window.startDate;
      to = window.endDate;
    } else if (req.query.from && req.query.to) {
      // Legacy from/to parameters
      from = req.query.from;
      to = req.query.to;

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
    } else {
      return res.status(400).json({ error: 'Either endDate or from+to query parameters are required.' });
    }

    // Fetch persisted history records for the range
    const records = await PostureHistory.find({
      userId,
      localDate: { $gte: from, $lte: to },
    }).sort({ localDate: 1 });

    // Check for active sessions (live tracking data not yet persisted)
    const activeSessions = await PostureSession.find({
      userId,
      status: 'active'
    });

    // Build a complete response covering every calendar day in range
    const allDates = getLocalDatesInRange(from, to);
    const result = [];

    for (const dateStr of allDates) {
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

      // If the record came from DB, mark it as having data (if monitoring > 0)
      if (existing) {
        recordObj.hasData = recordObj.monitoringDurationSeconds > 0;
        // Convert Map to plain object for consistent JSON serialization
        if (recordObj.postureTypeDurations instanceof Map) {
          recordObj.postureTypeDurations = Object.fromEntries(recordObj.postureTypeDurations);
        }
      }

      // Add active session data dynamically for live sessions on this date
      const activeSessionsForDate = activeSessions.filter(
        (s) => toLocalDateStr(s.startedAt) === dateStr
      );
      
      if (activeSessionsForDate.length > 0) {
        let typeDurations = existing?.postureTypeDurations instanceof Map 
            ? Object.fromEntries(existing.postureTypeDurations) 
            : (recordObj.postureTypeDurations || {});

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
        recordObj.postureTypeDurations = typeDurations;
      }

      result.push(recordObj);
    }

    res.json({ history: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
