const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  courseName: { type: String, default: '' },
  certificateId: { type: String, unique: true, sparse: true },
  // Student details for certificate display
  studentName: { type: String, default: '' },
  studentFirstName: { type: String, default: '' },
  studentLastName: { type: String, default: '' },
  score: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'issued', 'rejected', 'expired', 'revoked'], default: 'pending' },
  type: { type: String, enum: ['exam_only', 'learning'], default: 'exam_only' },
  // Certificate dates
  issueDate: { type: Date },
  expiryDate: { type: Date },
  // Verification
  verifyUrl: { type: String, default: '' },
  // Original fields
  submittedAt: { type: Date, default: Date.now },
  issuedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, { timestamps: true });

certificateSchema.index({ userId: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ certificateId: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = Certificate;
