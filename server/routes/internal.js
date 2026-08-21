const express = require('express');
const { verifyTrackingToken } = require('../utils/tokenUtils');
const PostureSession = require('../models/PostureSession');
const PostureSegment = require('../models/PostureSegment');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { distributeSessionToDailyAggregates } = require('../services/aggregationService');

const router = express.Router();

/**
 * Internal endpoint used by Python vision service to report state transitions and checkpoints.
 * Authenticated via short-lived tracking token (not browser session).
 *
 * POST /api/internal/tracking/:sessionId/event
 * Headers: Authorization: Bearer <trackingToken>
 * Body: { type: 'state_change' | 'checkpoint' | 'alert' | 'calibration', ... }
 */
router.post('/tracking/:sessionId/event', async (req, res, next) => {
  try {
    // Verify tracking token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing tracking token.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyTrackingToken(token);
    if (!decoded || decoded.sessionId !== req.params.sessionId) {
      return res.status(403).json({ error: 'Invalid tracking token.' });
    }

    const { sessionId } = req.params;
    const { type, ...data } = req.body;

    const session = await PostureSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Active session not found.' });
    }

    switch (type) {
      case 'calibration':
        session.calibrationCompleted = true;
        if (data.modelUsed) session.modelUsed = data.modelUsed;
        await session.save();
        logger.info(`Calibration completed for session ${sessionId}`);
        break;

      case 'state_change': {
        // Close previous segment if any
        if (data.previousSegment) {
          const prev = data.previousSegment;
          await PostureSegment.create({
            userId: session.userId,
            sessionId: session._id,
            state: prev.state,
            postureTypes: prev.postureTypes || [],
            startedAt: new Date(prev.startedAt),
            endedAt: new Date(prev.endedAt),
            durationSeconds: prev.durationSeconds,
            averageConfidence: prev.averageConfidence || 0,
          });
        }

        // Update session durations
        if (data.sessionStats) {
          const incomingMonitoring = (data.sessionStats.goodDurationSeconds || 0) + (data.sessionStats.badDurationSeconds || 0);
          if (incomingMonitoring >= (session.monitoringDurationSeconds || 0)) {
            session.goodDurationSeconds = data.sessionStats.goodDurationSeconds || 0;
            session.badDurationSeconds = data.sessionStats.badDurationSeconds || 0;
            session.unobservedDurationSeconds = data.sessionStats.unobservedDurationSeconds || 0;
            session.monitoringDurationSeconds = incomingMonitoring;
            if (data.sessionStats.postureTypeDurations) {
              session.postureTypeDurations = data.sessionStats.postureTypeDurations;
            }
          }
        }
        await session.save();
        break;
      }

      case 'checkpoint': {
        // Periodic checkpoint — update session stats
        if (data.sessionStats) {
          const incomingMonitoring = (data.sessionStats.goodDurationSeconds || 0) + (data.sessionStats.badDurationSeconds || 0);
          if (incomingMonitoring >= (session.monitoringDurationSeconds || 0)) {
            session.goodDurationSeconds = data.sessionStats.goodDurationSeconds || 0;
            session.badDurationSeconds = data.sessionStats.badDurationSeconds || 0;
            session.unobservedDurationSeconds = data.sessionStats.unobservedDurationSeconds || 0;
            session.monitoringDurationSeconds = incomingMonitoring;
            if (data.sessionStats.postureTypeDurations) {
              session.postureTypeDurations = data.sessionStats.postureTypeDurations;
            }
            if (data.sessionStats.alertCount !== undefined) {
              session.alertCount = data.sessionStats.alertCount;
            }
          }
        }
        await session.save();
        logger.debug(`Checkpoint for session ${sessionId}`);
        break;
      }

      case 'alert': {
        await Alert.create({
          userId: session.userId,
          sessionId: session._id,
          timestamp: new Date(data.timestamp || Date.now()),
          postureTypes: data.postureTypes || [],
          message: data.message || 'Bad posture detected',
          suggestion: data.suggestion || '',
          badDurationAtAlertSeconds: data.badDurationAtAlertSeconds || 0,
          repeatNumber: data.repeatNumber || 0,
        });
        session.alertCount = (session.alertCount || 0) + 1;
        await session.save();
        logger.info(`Alert #${session.alertCount} for session ${sessionId}`);
        break;
      }

      case 'stop': {
        if (data.sessionStats) {
          const incomingMonitoring = (data.sessionStats.goodDurationSeconds || 0) + (data.sessionStats.badDurationSeconds || 0);
          if (incomingMonitoring >= (session.monitoringDurationSeconds || 0)) {
            session.goodDurationSeconds = data.sessionStats.goodDurationSeconds || 0;
            session.badDurationSeconds = data.sessionStats.badDurationSeconds || 0;
            session.unobservedDurationSeconds = data.sessionStats.unobservedDurationSeconds || 0;
            session.monitoringDurationSeconds = incomingMonitoring;
            if (data.sessionStats.postureTypeDurations) {
              session.postureTypeDurations = data.sessionStats.postureTypeDurations;
            }
            if (data.sessionStats.alertCount !== undefined) {
              session.alertCount = data.sessionStats.alertCount;
            }
          }
        }
        
        session.status = 'completed';
        session.endedAt = new Date();
        session.monitoringDurationSeconds = session.goodDurationSeconds + session.badDurationSeconds;

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
        await distributeSessionToDailyAggregates(session);
        logger.info(`Session ${sessionId} completed via backend event`);
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown event type: ${type}` });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
