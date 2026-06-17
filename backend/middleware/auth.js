const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'oblixel_super_secret_key_2026';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    console.log('[AUTH] ====== NEW REQUEST ======');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] Token decoded - id:', decoded.id);
    console.log('[AUTH] Token decoded - email:', decoded.email);

    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('[AUTH] User not found in MongoDB');
      return res.status(401).json({ error: 'User not found - please login again' });
    }

    console.log('[AUTH] ✅ User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token - please login again' });
  }
}

module.exports = authenticate;
