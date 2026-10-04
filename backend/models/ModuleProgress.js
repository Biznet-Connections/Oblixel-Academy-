const mongoose = require('mongoose');

const moduleProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  moduleId: { type: Number, required: true },

  // Completion
  completed: { type: Boolean, default: false },
  quizScore: { type: Number, default: null },
  bestScore: { type: Number, default: null },
  servedQuestionIds: { type: [String], default: [] },
  completedAt: Date,

  // Attempts
  attempts: { type: Number, default: 0 },
  practiceAttempts: { type: Number, default: 0 },
  moduleExamAttempts: { type: Number, default: 0 }, // fails since last pass
  moduleCooldownUntil: { type: Date, default: null },

  // Study tracking
  timeSpent: { type: Number, default: 0 },
  lastAccessed: { type: Date, default: null },

  // Notes
  notes: { type: String, default: '' },
  notesUpdatedAt: { type: Date, default: null },

  // UX
  bookmarked: { type: Boolean, default: false },
  lessonRead: { type: Boolean, default: false },

  // XP earned
  xpEarned: { type: Number, default: 0 }
}, { timestamps: true });

moduleProgressSchema.index({ userId: 1, courseId: 1, moduleId: 1 }, { unique: true });
moduleProgressSchema.index({ userId: 1, courseId: 1 });

const ModuleProgress = mongoose.model('ModuleProgress', moduleProgressSchema);
module.exports = ModuleProgress;
