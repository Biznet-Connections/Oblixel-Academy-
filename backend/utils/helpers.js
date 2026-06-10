const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const constants = require('./constants');

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, constants.BCRYPT_ROUNDS);
}

// Compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT
function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: constants.JWT_EXPIRY }
  );
}

// Verify JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Generate unique ID
function generateId() {
  return uuidv4();
}

// Generate certificate ID
function generateCertificateId(courseId) {
  const date = new Date();
  const timestamp = date.getFullYear() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    date.getSeconds().toString().padStart(2, '0');
  return `OBX-${courseId.toUpperCase()}-${timestamp}`;
}

// Calculate retake price
function calculateRetakePrice(originalPrice) {
  return originalPrice * (constants.RETAKE_DISCOUNT_PERCENT / 100);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Get date in YYYY-MM-DD format
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Add days to date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateId,
  generateCertificateId,
  calculateRetakePrice,
  formatCurrency,
  getDateString,
  addDays
};
