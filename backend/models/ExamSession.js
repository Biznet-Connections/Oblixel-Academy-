const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  startTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['in_progress', 'completed', 'expired'], default: 'in_progress' },
  questionCount: { type: Number, default: 25 },
  score: Number,
  passed: Boolean,
  completedAt: Date
}, { timestamps: true });

examSessionSchema.index({ userId: 1, courseId: 1 });

const ExamSession = mongoose.model('ExamSession', examSessionSchema);
module.exports = ExamSession;
