const express = require('express');
const { requireAuth } = require('../middleware/auth');
const PostureSession = require('../models/PostureSession');
const { createTrackingToken } = require('../utils/tokenUtils');
const { updateDailyAggregate } = require('../services/aggregationService');
const { toLocalDateStr, getTodayLocal } = require('../utils/dateUtils');
const PostureHistory = require('../models/PostureHistory');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Create Tracking Session ───
router.post('/sessions', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // Mark any lingering active/paused sessions as interrupted
    const existing = await PostureSession.find({ userId, status: { $in: ['active', 'paused'] } });
    for (const s of existing) {
      s.status = 'interrupted';
      s.endedAt = new Date();
      s.monitoringDurationSeconds = (s.goodDurationSeconds || 0) + (s.badDurationSeconds || 0);
      await s.save();
      
      // Push accumulated durations to daily aggregate
      const localDate = toLocalDateStr(s.startedAt);
      const typeDurations = s.postureTypeDurations instanceof Map
        ? Object.fromEntries(s.postureTypeDurations)
        : (s.postureTypeDurations || {});
        
      await updateDailyAggregate(
        userId,
        localDate,
        s.goodDurationSeconds || 0,
        s.badDurationSeconds || 0,
        typeDurations
      );
      
      logger.warn(`Previous session ${s._id} marked as interrupted and aggregated`);
    }

    const session = await PostureSession.create({
      userId,
      startedAt: new Date(),
      status: 'active',
    });

    const trackingToken = createTrackingToken(session._id.toString(), userId);
    session.trackingToken = trackingToken;
    await session.save();

    logger.info(`Tracking session created: ${session._id}`);
    res.status(201).json({
      sessionId: session._id,
      trackingToken,
      backendEventUrl: `${req.protocol}://${req.get('host')}/api/internal/tracking/${session._id}/event`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Today's Accumulated Monitoring Totals ───
// This pulls directly from the daily PostureHistory to ensure
// Track Posture and History pages use exactly the same source.
router.get('/sessions/daily-totals', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const today = getTodayLocal();

    const history = await PostureHistory.findOne({ userId, localDate: today });

    let totalGood = history ? history.goodDurationSeconds || 0 : 0;
    let totalBad = history ? history.badDurationSeconds || 0 : 0;
    let activeSessionId = null;

    // Dynamically include any currently active sessions that haven't been flushed yet
    const activeSessions = await PostureSession.find({
      userId,
      status: 'active'
    });
    
    for (const s of activeSessions) {
      activeSessionId = s._id; // Keep the active session ID to recover it on frontend remount
      if (toLocalDateStr(s.startedAt) === today) {
        totalGood += s.goodDurationSeconds || 0;
        totalBad += s.badDurationSeconds || 0;
      }
    }

    res.json({
      dailyMonitoringSeconds: totalGood + totalBad,
      dailyGoodSeconds: totalGood,
      dailyBadSeconds: totalBad,
      activeSessionId,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Stop/Finalize Tracking Session ───
router.post('/sessions/:sessionId/stop', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId;

    const session = await PostureSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (session.status === 'completed') {
      return res.json({ message: 'Session already completed.', session });
    }

    session.status = 'completed';
    session.endedAt = new Date();
    session.monitoringDurationSeconds = session.goodDurationSeconds + session.badDurationSeconds;

    // Find dominant bad posture
    if (session.postureTypeDurations && session.postureTypeDurations.size > 0) {
      let maxType = null;
      let maxDur = 0;
      for (const [type, dur] of session.postureTypeDurations) {
        if (dur > maxDur) {
          maxDur = dur;
          maxType = type;
        }
      }
      session.dominantBadPosture = maxType;
    }

    await session.save();

    // Update daily aggregate for history/report
    const localDate = toLocalDateStr(session.startedAt);
    const typeDurations = session.postureTypeDurations instanceof Map
      ? Object.fromEntries(session.postureTypeDurations)
      : {};

    await updateDailyAggregate(
      userId,
      localDate,
      session.goodDurationSeconds,
      session.badDurationSeconds,
      typeDurations
    );

    logger.info(`Session ${sessionId} completed`);
    res.json({ message: 'Session stopped successfully.', session });
  } catch (err) {
    next(err);
  }
});

// ─── Get Session Status ───
router.get('/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId;
    const session = await PostureSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
