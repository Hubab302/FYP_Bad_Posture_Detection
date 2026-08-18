const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const TRACKING_TOKEN_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Create a short-lived tracking token for Python→Express internal API authentication.
 * @param {string} sessionId
 * @param {string} userId
 * @returns {string}
 */
function createTrackingToken(sessionId, userId) {
  return jwt.sign(
    { sessionId, userId, purpose: 'tracking' },
    TRACKING_TOKEN_SECRET,
    { expiresIn: '12h' }
  );
}

/**
 * Verify and decode tracking token.
 * @param {string} token
 * @returns {object|null}
 */
function verifyTrackingToken(token) {
  try {
    return jwt.verify(token, TRACKING_TOKEN_SECRET);
  } catch {
    return null;
  }
}

module.exports = { createTrackingToken, verifyTrackingToken };
