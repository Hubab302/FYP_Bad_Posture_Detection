const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');
const { calcPercentage } = require('../utils/formatters');
const { toLocalDateStr } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Centralized aggregation service — single source of truth for all duration/percentage calculations.
 */

/**
 * Calculate percentages and most frequent bad posture from raw seconds.
 * @param {number} goodSeconds
 * @param {number} badSeconds
 * @param {Map|Object} postureTypeDurations
 * @returns {object}
 */
function calculateStats(goodSeconds, badSeconds, postureTypeDurations) {
  const monitoringSeconds = goodSeconds + badSeconds;
  const badPercentage = calcPercentage(badSeconds, monitoringSeconds);
  const goodPercentage = calcPercentage(goodSeconds, monitoringSeconds);

  // Find most frequent bad posture by accumulated duration
  let mostFrequentBadPosture = null;
  let maxDuration = 0;
  const durations = postureTypeDurations instanceof Map
    ? Object.fromEntries(postureTypeDurations)
    : (postureTypeDurations || {});

  for (const [type, dur] of Object.entries(durations)) {
    if (dur > maxDuration) {
      maxDuration = dur;
      mostFrequentBadPosture = type;
    }
  }

  return {
    monitoringDurationSeconds: monitoringSeconds,
    goodDurationSeconds: goodSeconds,
    badDurationSeconds: badSeconds,
    badPosturePercentage: badPercentage,
    goodPosturePercentage: goodPercentage,
    mostFrequentBadPosture,
  };
}

/**
 * Update daily aggregate for a given user and date.
 * @param {string} userId
 * @param {string} localDate - YYYY-MM-DD
 * @param {number} goodSeconds
 * @param {number} badSeconds
 * @param {Object} postureTypeDurations - { "Forward Head": 120, "Slouching": 45, ... }
 */
async function updateDailyAggregate(userId, localDate, goodSeconds, badSeconds, postureTypeDurations) {
  try {
    let history = await PostureHistory.findOne({ userId, localDate });

    if (!history) {
      history = new PostureHistory({ userId, localDate });
    }

    // Add new durations to existing
    history.goodDurationSeconds += goodSeconds;
    history.badDurationSeconds += badSeconds;
    history.monitoringDurationSeconds = history.goodDurationSeconds + history.badDurationSeconds;

    // Merge posture type durations
    const existing = history.postureTypeDurations instanceof Map
      ? Object.fromEntries(history.postureTypeDurations)
      : {};
    for (const [type, dur] of Object.entries(postureTypeDurations || {})) {
      existing[type] = (existing[type] || 0) + dur;
    }
    history.postureTypeDurations = existing;

    // Collect all posture types detected
    const allTypes = Object.keys(existing).filter((k) => existing[k] > 0);
    history.postureTypes = allTypes;

    // Recalculate percentages
    const stats = calculateStats(
      history.goodDurationSeconds,
      history.badDurationSeconds,
      existing
    );
    history.badPosturePercentage = stats.badPosturePercentage;
    history.goodPosturePercentage = stats.goodPosturePercentage;
    history.mostFrequentBadPosture = stats.mostFrequentBadPosture;

    await history.save();
    logger.info(`Daily aggregate updated for ${localDate}`);
    return history;
  } catch (err) {
    logger.error('Failed to update daily aggregate:', err);
    throw err;
  }
}

/**
 * Aggregate weekly report from PostureHistory entries.
 * @param {string} userId
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {object}
 */
async function aggregateWeeklyReport(userId, fromDate, toDate) {
  const histories = await PostureHistory.find({
    userId,
    localDate: { $gte: fromDate, $lte: toDate },
  });

  let totalGood = 0;
  let totalBad = 0;
  const combinedTypeDurations = {};

  for (const h of histories) {
    totalGood += h.goodDurationSeconds;
    totalBad += h.badDurationSeconds;
    const durations = h.postureTypeDurations instanceof Map
      ? Object.fromEntries(h.postureTypeDurations)
      : (h.postureTypeDurations || {});
    for (const [type, dur] of Object.entries(durations)) {
      combinedTypeDurations[type] = (combinedTypeDurations[type] || 0) + dur;
    }
  }

  const activeSessions = await PostureSession.find({
    userId,
    status: 'active'
  });

  for (const s of activeSessions) {
    const sDate = toLocalDateStr(s.startedAt);
    if (sDate >= fromDate && sDate <= toDate) {
      totalGood += s.goodDurationSeconds || 0;
      totalBad += s.badDurationSeconds || 0;
      if (s.postureTypeDurations) {
        const sDurations = s.postureTypeDurations instanceof Map ? Object.fromEntries(s.postureTypeDurations) : s.postureTypeDurations;
        for (const [type, dur] of Object.entries(sDurations)) {
          combinedTypeDurations[type] = (combinedTypeDurations[type] || 0) + dur;
        }
      }
    }
  }

  return calculateStats(totalGood, totalBad, combinedTypeDurations);
}

module.exports = { calculateStats, updateDailyAggregate, aggregateWeeklyReport };
