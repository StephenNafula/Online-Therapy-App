const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);

const { body, validationResult } = require('express-validator');

// Signup disabled - registration by users is not allowed; only seeded staff accounts exist
router.post('/signup', (req, res) => {
  return res.status(403).json({ message: 'Registration is disabled. Please contact the administrator.' });
});

function hashToken(token){
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Login with validation -> issues short-lived access token and httpOnly refresh cookie
router.post('/login',
  [ body('email').isEmail().withMessage('Valid email required').normalizeEmail(), body('password').isLength({ min: 1 }).withMessage('Password required') ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const ok = await user.verifyPassword(password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });

      // create refresh token (random) and store its hash in db
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
      await RefreshToken.create({ user: user._id, tokenHash, expiresAt });

      // set httpOnly cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt
      });

      res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Refresh access token using httpOnly refresh cookie. Rotates refresh token.
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });
    if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(stored.user);
    if (!user) return res.status(401).json({ message: 'User not found' });

    // rotate: delete old refresh token and issue a new one
    await RefreshToken.deleteOne({ _id: stored._id });
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ user: user._id, tokenHash: newHash, expiresAt });

    // set new cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    res.json({ accessToken });
  } catch (err) {
    console.error('Refresh token error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout: revoke refresh token cookie
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshToken.deleteOne({ tokenHash });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
