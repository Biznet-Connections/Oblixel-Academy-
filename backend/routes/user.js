const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

function readJSON(fileName) {
  const filePath = path.join(__dirname, '../data', fileName);
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

router.get('/profile', authenticate, async (req, res) => {
  console.log('[USER] Profile request for:', req.user?.email);
  
  try {
    const users = readJSON('users.json');
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
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
        avatar: user.avatar || user.name?.charAt(0) || 'U',
        createdAt: user.createdAt,
        streak: 7
      },
      stats: {
        enrolledCourses: 0,
        certificatesEarned: 0,
        pendingCertificates: 0,
        totalSpent: 0
      },
      enrollments: [],
      certificates: [],
      examHistory: []
    });
  } catch (error) {
    console.error('[USER] Error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

module.exports = router;
