/**
 * Date utility functions — centralized date handling.
 */

/**
 * Get today's date string in YYYY-MM-DD format (local timezone).
 * @returns {string}
 */
function getTodayLocal() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get date string N days ago in YYYY-MM-DD.
 * @param {number} n
 * @returns {string}
 */
function getDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Parse a YYYY-MM-DD string to a Date object (start of day UTC).
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Check if dateStr is a valid YYYY-MM-DD.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDateStr(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Get the number of days between two YYYY-MM-DD strings (inclusive).
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
function daysBetween(from, to) {
  const f = new Date(from);
  const t = new Date(to);
  return Math.round((t - f) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get the local date string for a given Date object.
 * @param {Date} date
 * @returns {string}
 */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { getTodayLocal, getDaysAgo, parseDate, isValidDateStr, daysBetween, toLocalDateStr };
