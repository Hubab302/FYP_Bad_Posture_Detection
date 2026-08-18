const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Signup ───
router.post(
  '/signup',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { username, email, password } = req.body;

      // Check duplicate email
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({ code: 'DUPLICATE_EMAIL', error: 'An account with this email already exists. Please log in.' });
      }

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({
        username: username.trim(),
        email: email.toLowerCase(),
        passwordHash,
      });

      // Regenerate session
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        req.session.save((err) => {
          if (err) return next(err);
          logger.info(`User signed up: ${user.username}`);
          res.status(201).json({ user: user.toSafeObject() });
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Login ───
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address.'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // Allow login with email only
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ code: 'ACCOUNT_NOT_FOUND', error: 'No account found with this email.' });
      }

      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Invalid credentials' });
      }

      // Regenerate session
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        req.session.save((err) => {
          if (err) return next(err);
          logger.info(`User logged in: ${user.username}`);
          res.json({ user: user.toSafeObject() });
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Logout ───
router.post('/logout', requireAuth, (req, res, next) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('posture.sid');
    logger.info(`User logged out: ${username}`);
    res.json({ message: 'Logged out successfully.' });
  });
});

// ─── Get Current User ───
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

module.exports = router;
