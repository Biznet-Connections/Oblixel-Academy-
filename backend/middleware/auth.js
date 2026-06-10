const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  console.log('[AUTH] ====== NEW REQUEST ======');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'oblixel_super_secret_key_2026';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('[AUTH] Token decoded - id:', decoded.id);
    console.log('[AUTH] Token decoded - email:', decoded.email);
    
    // Read users.json directly
    const usersPath = path.join(__dirname, '../data/users.json');
    
    if (!fs.existsSync(usersPath)) {
      console.log('[AUTH] users.json does not exist!');
      return res.status(500).json({ error: 'Database not found' });
    }
    
    const usersData = fs.readFileSync(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    console.log('[AUTH] Total users in DB:', users.length);
    
    // Find user by ID
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      console.log('[AUTH] ❌ User NOT found for ID:', decoded.id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[AUTH] ✅ User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('[AUTH] ❌ Token error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
