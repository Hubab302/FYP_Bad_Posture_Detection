const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');
const { calcPercentage } = require('../utils/formatters');
const { toLocalDateStr, splitTimeRangeByLocalDate } = require('../utils/dateUtils');
const logger = require('../utils/logger');
const PostureSegment = require('../models/PostureSegment');

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

/**
 * Calculates the exact duration (good/bad/types) of a session distributed across local calendar dates.
 * Honors authoritative PostureSegment chunks and strictly splits remaining session totals.
 */
async function getSessionDailyDeltas(session) {
  const segments = await PostureSegment.find({ sessionId: session._id }).sort({ startedAt: 1 });
  
  const dailyDeltas = {};
  const addDelta = (date, state, dur, types) => {
    if (!dailyDeltas[date]) dailyDeltas[date] = { good: 0, bad: 0, types: {} };
    if (state === 'good') dailyDeltas[date].good += dur;
    if (state === 'bad') dailyDeltas[date].bad += dur;
    if (types) {
      for (const t of types) {
        dailyDeltas[date].types[t] = (dailyDeltas[date].types[t] || 0) + dur;
      }
    }
  };

  let segGood = 0;
  let segBad = 0;
  let lastEndedAt = session.startedAt;
  
  for (const seg of segments) {
    if (!seg.endedAt) continue;
    const chunks = splitTimeRangeByLocalDate(seg.startedAt, seg.endedAt);
    for (const chunk of chunks) {
      addDelta(chunk.localDate, seg.state, chunk.durationSeconds, seg.postureTypes);
    }
    if (seg.state === 'good') segGood += seg.durationSeconds;
    if (seg.state === 'bad') segBad += seg.durationSeconds;
    if (seg.endedAt > lastEndedAt) lastEndedAt = seg.endedAt;
  }
  
  // Allocate any remaining time missing from segments up to the session total.
  const remGood = Math.max(0, (session.goodDurationSeconds || 0) - segGood);
  const remBad = Math.max(0, (session.badDurationSeconds || 0) - segBad);
  
  if (remGood > 0) {
    const end = new Date(lastEndedAt.getTime() + remGood * 1000);
    const chunks = splitTimeRangeByLocalDate(lastEndedAt, end);
    for (const chunk of chunks) addDelta(chunk.localDate, 'good', chunk.durationSeconds, []);
    lastEndedAt = end;
  }
  
  if (remBad > 0) {
    const end = new Date(lastEndedAt.getTime() + remBad * 1000);
    const chunks = splitTimeRangeByLocalDate(lastEndedAt, end);
    const sessionTypes = session.postureTypeDurations instanceof Map 
      ? Object.fromEntries(session.postureTypeDurations) 
      : (session.postureTypeDurations || {});
    const remTypes = {};
    for (const [t, dur] of Object.entries(sessionTypes)) {
      let allocated = 0;
      for (const date in dailyDeltas) allocated += (dailyDeltas[date].types[t] || 0);
      const rem = Math.max(0, dur - allocated);
      if (rem > 0) remTypes[t] = rem;
    }
    
    let typesApplied = false;
    for (const chunk of chunks) {
      addDelta(chunk.localDate, 'bad', chunk.durationSeconds, typesApplied ? [] : Object.keys(remTypes));
      if (!typesApplied) {
        for (const t in remTypes) {
           dailyDeltas[chunk.localDate].types[t] = (dailyDeltas[chunk.localDate].types[t] || 0) + remTypes[t];
        }
        typesApplied = true;
      }
    }
    lastEndedAt = end;
  }

  return dailyDeltas;
}

/**
 * Persists a completed or interrupted session's data exactly into its corresponding daily aggregates.
 */
async function distributeSessionToDailyAggregates(session) {
  const dailyDeltas = await getSessionDailyDeltas(session);
  for (const [date, delta] of Object.entries(dailyDeltas)) {
    if (delta.good > 0 || delta.bad > 0) {
      await updateDailyAggregate(session.userId, date, delta.good, delta.bad, delta.types);
    }
  }
}

module.exports = { calculateStats, updateDailyAggregate, aggregateWeeklyReport, getSessionDailyDeltas, distributeSessionToDailyAggregates };
