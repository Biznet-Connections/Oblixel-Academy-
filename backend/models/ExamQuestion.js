const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  courseId: { type: String, required: true, lowercase: true },
  moduleId: { type: Number, default: null, index: true },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correct: { type: Number, required: true, min: 0 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

examQuestionSchema.index({ courseId: 1 });
examQuestionSchema.index({ courseId: 1, moduleId: 1 });

const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);
module.exports = ExamQuestion;
