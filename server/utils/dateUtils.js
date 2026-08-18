/**
 * Date utility functions — centralized date handling.
 *
 * IMPORTANT: All "local date" strings are YYYY-MM-DD in the server's local timezone.
 * We avoid .toISOString() for local date derivation because it converts to UTC
 * and can shift the date by ±1 day depending on timezone offset.
 */

/**
 * Get today's date string in YYYY-MM-DD format (server-local timezone).
 * @returns {string}
 */
function getTodayLocal() {
  return toLocalDateStr(new Date());
}

/**
 * Get date string N days ago in YYYY-MM-DD (server-local timezone).
 * @param {number} n
 * @returns {string}
 */
function getDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

/**
 * Parse a YYYY-MM-DD string to a Date object at midnight LOCAL time.
 * Using 'T00:00:00' without 'Z' ensures the Date is interpreted as local.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Check if dateStr is a valid YYYY-MM-DD.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDateStr(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  // Verify the parsed date matches the input (catches invalid dates like 2026-02-30)
  return toLocalDateStr(d) === dateStr;
}

/**
 * Get the number of days between two YYYY-MM-DD strings (inclusive count).
 * e.g. daysBetween('2026-08-12', '2026-08-18') === 7
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
function daysBetween(from, to) {
  const f = parseLocalDate(from);
  const t = parseLocalDate(to);
  return Math.round((t - f) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get the local date string (YYYY-MM-DD) for a given Date object.
 * Uses local year/month/day — NOT UTC.
 * @param {Date} date
 * @returns {string}
 */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add (or subtract) days from a YYYY-MM-DD string.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - positive to go forward, negative to go back
 * @returns {string} YYYY-MM-DD
 */
function addDaysToDateStr(dateStr, days) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/**
 * Get a rolling 7-day window ending on selectedEndDate.
 *
 * This is the SHARED date-window foundation used by BOTH History and Report.
 * Neither module should independently compute date ranges.
 *
 * @param {string} selectedEndDate - YYYY-MM-DD, the last day of the window (inclusive)
 * @returns {{ startDate: string, endDate: string, dates: string[] }}
 *   - startDate: YYYY-MM-DD (selectedEndDate - 6 days)
 *   - endDate: YYYY-MM-DD (same as selectedEndDate)
 *   - dates: array of 7 YYYY-MM-DD strings, oldest first
 */
function getRollingSevenDayWindow(selectedEndDate) {
  const endDate = selectedEndDate;
  const startDate = addDaysToDateStr(endDate, -6);

  const dates = [];
  const cursor = parseLocalDate(startDate);
  for (let i = 0; i < 7; i++) {
    dates.push(toLocalDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { startDate, endDate, dates };
}

/**
 * Generate all local date strings from 'from' to 'to' inclusive.
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @returns {string[]}
 */
function getLocalDatesInRange(from, to) {
  const dates = [];
  const cursor = parseLocalDate(from);
  const end = parseLocalDate(to);
  while (cursor <= end) {
    dates.push(toLocalDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Clamp a date string to not exceed today's local date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} YYYY-MM-DD, clamped to today if dateStr is in the future
 */
function clampToToday(dateStr) {
  const today = getTodayLocal();
  return dateStr > today ? today : dateStr;
}

module.exports = {
  getTodayLocal,
  getDaysAgo,
  parseLocalDate,
  isValidDateStr,
  daysBetween,
  toLocalDateStr,
  addDaysToDateStr,
  getRollingSevenDayWindow,
  getLocalDatesInRange,
  clampToToday,
};
