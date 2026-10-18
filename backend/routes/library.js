const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LibraryBook = require('../models/LibraryBook');
const authenticate = require('../middleware/auth');

// Ensure upload dirs exist
const uploadDir = path.join(__dirname, '../uploads/library');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// --- GET ALL BOOKS (Public) ---
router.get('/', async (req, res) => {
  try {
    const books = await LibraryBook.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ books });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ADMIN: UPLOAD NEW BOOK ---
router.post('/admin', authenticate, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'pdfFile', maxCount: 1 }]), async (req, res) => {
  try {
    // Basic admin check (adjust based on your middleware)
    if (req.user.role !== 'admin' && !req.user.isMainAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, author, category, description, price, requiredCourseId } = req.body;
    
    const coverImage = req.files['coverImage'] ? '/uploads/library/' + req.files['coverImage'][0].filename : '';
    const pdfUrl = req.files['pdfFile'] ? '/uploads/library/' + req.files['pdfFile'][0].filename : '';

    const book = await LibraryBook.create({
      title, author, category, description,
      price: parseFloat(price) || 0,
      requiredCourseId: requiredCourseId || null,
      coverImage, pdfUrl
    });

    res.json({ success: true, book });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- GET SINGLE BOOK ---
router.get('/:id', async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ book });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
