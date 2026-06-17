const express = require('express');
const router = express.Router();

// Community redirect to WhatsApp channel
router.get('/', (req, res) => {
  res.json({ 
    community: 'https://whatsapp.com/channel/0029Vb8ApfmC6Zvo5QJ5LO3R',
    message: 'Join our WhatsApp community!'
  });
});

module.exports = router;
