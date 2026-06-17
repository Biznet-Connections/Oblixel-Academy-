const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  courseName: { type: String, default: '' },
  certificateId: { type: String, unique: true, sparse: true },
  score: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'issued', 'rejected'], default: 'pending' },
  type: { type: String, enum: ['exam_only', 'learning'], default: 'exam_only' },
  submittedAt: { type: Date, default: Date.now },
  issuedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, { timestamps: true });

certificateSchema.index({ userId: 1 });
certificateSchema.index({ status: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = Certificate;
