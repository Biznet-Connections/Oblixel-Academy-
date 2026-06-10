const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON } = require('../utils/jsonDB');

// Placeholder for tutor routes
router.get('/dashboard', authenticate, async (req, res) => {
  // Check if user is a tutor
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Tutor access required' });
  }
  
  // Placeholder response
  res.json({
    message: 'Tutor dashboard coming soon',
    features: [
      'Course analytics',
      'Student progress tracking',
      'Video upload',
      'Live session scheduling',
      'Student Q&A management'
    ]
  });
});

router.get('/courses', authenticate, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Tutor access required' });
  }
  
  res.json({
    message: 'Tutor courses - coming soon',
    courses: []
  });
});

router.post('/videos', authenticate, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Tutor access required' });
  }
  
  res.json({
    message: 'Video upload - coming soon',
    placeholder: true
  });
});

module.exports = router;
