const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/jsonDB');

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  console.log(`[AUTH] Register attempt for email: ${email}`);
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const users = readJSON('users.json') || [];
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'student',
      xp: 0,
      level: 1,
      totalSpent: 0,
      streak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeJSON('users.json', users);
    
    console.log(`[AUTH] User registered: ${email} (ID: ${newUser.id})`);
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  console.log(`[LOGIN] Attempt for email: ${email}`);
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const users = readJSON('users.json') || [];
    console.log(`[LOGIN] Total users in DB: ${users.length}`);
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`[LOGIN] User found: ${user.email}, role: ${user.role}`);
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`[LOGIN] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'oblixel_super_secret_key_2026',
      { expiresIn }
    );
    
    console.log(`[LOGIN] Success for: ${email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp || 0,
        level: user.level || 1,
        totalSpent: user.totalSpent || 0,
        avatar: user.avatar || user.name.charAt(0),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET CURRENT USER (ME)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'oblixel_super_secret_key_2026');
    
    const users = readJSON('users.json') || [];
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      console.log(`[AUTH] User not found for token ID: ${decoded.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp || 0,
        level: user.level || 1,
        totalSpent: user.totalSpent || 0,
        avatar: user.avatar || user.name.charAt(0),
        createdAt: user.createdAt,
        streak: user.streak || 7
      }
    });
  } catch (error) {
    console.error('[AUTH] Token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const users = readJSON('users.json') || [];
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
    }
    
    // In production, send email with reset token
    // For now, just return success
    res.json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset link' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    // Verify reset token (simplified - in production use proper token storage)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'oblixel_super_secret_key_2026');
    
    const users = readJSON('users.json') || [];
    const userIndex = users.findIndex(u => u.id === decoded.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    users[userIndex].password = hashedPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    writeJSON('users.json', users);
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

module.exports = router;
