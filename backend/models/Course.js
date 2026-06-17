const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  moduleId: { type: Number, required: true },
  name: { type: String, required: true },
  duration: { type: String, default: '30 min' },
  quizQuestions: { type: Number, default: 10 },
  videoUrl: { type: String, default: '' }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  abbreviation: { type: String, default: '' },
  level: { type: String, enum: ['Foundation', 'Associate', 'Professional', 'Expert'], default: 'Professional' },
  description: { type: String, default: '' },
  examPrice: { type: Number, required: true, min: 0 },
  pathPrice: { type: Number, min: 0 },
  icon: { type: String, default: 'fa-certificate' },
  category: { type: String, default: 'Professional' },
  color: { type: String, default: 'purple' },
  duration: { type: String, default: '8 weeks' },
  totalModules: { type: Number, default: 8 },
  modules: [moduleSchema],
  enrolledCount: { type: Number, default: 0 },
  prerequisite: { type: String, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

courseSchema.index({ name: 'text', description: 'text', category: 'text' });
courseSchema.index({ category: 1 });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
