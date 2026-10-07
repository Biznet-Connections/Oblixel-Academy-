const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  sessionId: { type: String, required: true },
  score: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  totalQuestions: { type: Number, default: 25 },
  correctCount: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

examAttemptSchema.index({ userId: 1, courseId: 1 });

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
module.exports = ExamAttempt;
