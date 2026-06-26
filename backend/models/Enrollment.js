const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  courseName: { type: String, default: '' },
  courseIcon: { type: String, default: 'fa-certificate' },
  type: { type: String, enum: ['exam_only', 'learning'], default: 'exam_only' },
  status: { type: String, enum: ['enrolled', 'passed_waiting', 'failed', 'certified'], default: 'enrolled' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  moduleProgress: {
    completedCount: { type: Number, default: 0 },
    totalModules: { type: Number, default: 8 },
    nextModuleName: { type: String, default: 'Module 1' }
  },
  // Certificate legal name fields (saved at enrollment time)
  certificateFirstName: { type: String, trim: true, default: '' },
  certificateLastName: { type: String, trim: true, default: '' },
  certificateFullName: { type: String, trim: true, default: '' },
  certificateIdNumber: { type: String, trim: true, default: '' },
  certificatePhone: { type: String, trim: true, default: '' },
  certificateCountry: { type: String, trim: true, default: '' },
  examAttempts: { type: Number, default: 0 },
  score: { type: Number, default: null },
  lastExamDate: Date,
  cooldownUntil: Date,
  voucherCode: { type: String, default: null },
  amountPaid: { type: Number, default: 0 },
  originalPrice: { type: Number, default: 0 },
  certificateId: { type: String, default: null }
}, { timestamps: true });

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ status: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
