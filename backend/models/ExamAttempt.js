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
  completedAt: { type: Date, default: Date.now },

  // v16 — Full audit trail (so admin can verify passes/fails)
  questions: [{
    id: String,
    text: String,
    options: [String],
    correct: Number,          // correct answer index
    userAnswer: Number,       // what user selected (or -1 if skipped)
    isCorrect: Boolean
  }],
  wrongAnswers: [{
    question: String,
    correctAnswer: String,
    yourAnswer: String,
    topic: String
  }],
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  lateSubmit: { type: Boolean, default: false }
}, { timestamps: true });

examAttemptSchema.index({ userId: 1, courseId: 1 });
examAttemptSchema.index({ userId: 1, createdAt: -1 });

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
module.exports = ExamAttempt;
