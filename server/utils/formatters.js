/**
 * Shared formatting utilities — used by both backend and could be mirrored on frontend.
 * All internal durations are integer seconds. Formatting is for display only.
 */

/**
 * Format seconds into HH:MM:SS string.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Calculate percentage safely.
 * @param {number} part
 * @param {number} total
 * @param {number} decimals
 * @returns {number}
 */
function calcPercentage(part, total, decimals = 1) {
  if (!total || total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(decimals));
}

module.exports = { formatDuration, calcPercentage };
