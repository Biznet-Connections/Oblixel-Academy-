const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'oblixel_super_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 5) return res.status(400).json({ error: 'Password must be at least 5 characters' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    console.log(`[AUTH] Registered: ${user.email}`);
    res.status(201).json({ success: true, message: 'Account created! Please login.' });
  } catch (error) {
    console.error('[AUTH] Register error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    console.log(`[LOGIN] Attempt: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[LOGIN] User found: ${user.email}, role: ${user.role}`);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[LOGIN] Wrong password: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    user.lastLogin = new Date();
    await user.save();

    console.log(`[LOGIN] Success: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        totalSpent: user.totalSpent,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ==================== FORGOT PASSWORD FLOW ====================
const crypto = require('crypto');
const { sendPasswordResetCode } = require('../services/emailService');

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const genericResponse = { success: true, message: 'If that email exists, a reset code has been sent.' };

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericResponse);

    if (user.resetCodeAttempts >= 3 && user.resetCodeExpires && user.resetCodeExpires > new Date()) {
      return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetCode = code;
    user.resetCodeExpires = expires;
    user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
    await user.save();

    const result = await sendPasswordResetCode({
      to: user.email,
      name: user.name,
      code,
      expiresMinutes: 15
    });

    if (!result.success) {
      console.error('[AUTH] Email send failed:', result.message);
      return res.status(500).json({ error: 'Failed to send reset code. Try again later.' });
    }

    console.log('[AUTH] Reset code sent to ' + user.email);
    res.json(genericResponse);
  } catch (error) {
    console.error('[AUTH] forgot-password error:', error.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetCode');
    if (!user || !user.resetCode) return res.status(400).json({ error: 'Invalid or expired code' });

    if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Code has expired. Request a new one.' });
    }

    if (String(user.resetCode) !== String(code).trim()) {
      return res.status(400).json({ error: 'Incorrect code' });
    }

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ success: true, resetToken });
  } catch (error) {
    console.error('[AUTH] verify-reset-code error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 5) return res.status(400).json({ error: 'Password must be at least 5 characters' });

  try {
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.purpose !== 'password-reset') return res.status(400).json({ error: 'Invalid token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetCode = null;
    user.resetCodeExpires = null;
    user.resetCodeAttempts = 0;
    await user.save();

    console.log('[AUTH] Password reset for ' + user.email);
    res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset link expired. Start over.' });
    }
    console.error('[AUTH] reset-password error:', error.message);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;