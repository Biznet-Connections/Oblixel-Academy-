const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, default: 'obliXel Faculty' },
  category: { type: String, default: 'General' },
  description: { type: String, default: '' },
  price: { type: Number, default: 0, min: 0 },
  requiredCourseId: { type: String, default: null }, // If set, enrolled students get it free
  coverImage: { type: String, default: '' }, // URL to uploaded image
  pdfUrl: { type: String, default: '' },     // URL to uploaded PDF
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
