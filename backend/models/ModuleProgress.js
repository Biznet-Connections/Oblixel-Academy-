const mongoose = require('mongoose');

const moduleProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  moduleId: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  quizScore: { type: Number, default: null },
  completedAt: Date
}, { timestamps: true });

moduleProgressSchema.index({ userId: 1, courseId: 1, moduleId: 1 }, { unique: true });

const ModuleProgress = mongoose.model('ModuleProgress', moduleProgressSchema);
module.exports = ModuleProgress;
