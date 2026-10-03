const mongoose = require('mongoose');

const cheatLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: String, lowercase: true, index: true },
  sessionId: { type: String },
  event: { type: String, required: true }, // 'tab-switch', 'copy-attempt', 'fullscreen-exit', 'late-submit', etc
  detail: { type: String, default: '' },
  at: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('CheatLog', cheatLogSchema);
