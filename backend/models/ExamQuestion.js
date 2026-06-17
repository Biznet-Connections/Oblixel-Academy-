const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  courseId: { type: String, required: true, lowercase: true },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correct: { type: Number, required: true, min: 0, max: 3 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
}, { timestamps: true });

examQuestionSchema.index({ courseId: 1 });

const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);
module.exports = ExamQuestion;
