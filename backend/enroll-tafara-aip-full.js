require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const Course = require('./models/Course');
const ModuleProgress = require('./models/ModuleProgress');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const user = await User.findOne({ email: 'biznetconnections@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }

  const courseId = 'aip';
  const course = await Course.findOne({ courseId });
  if (!course) { console.log('AIP course not found'); process.exit(0); }

  console.log('User:', user.name);
  console.log('Course:', course.name);
  console.log('Total modules:', course.totalModules || 12);
  console.log('Exam price: $' + (course.examPrice || 'not set'));
  console.log('');

  // 1. Reset enrollment
  await Enrollment.deleteOne({ userId: user._id, courseId });

  const totalModules = course.totalModules || 12;

  // 2. Create enrollment — 100% modules done, exam fee NOT paid
  const enr = await Enrollment.create({
    userId: user._id,
    courseId: courseId,
    courseName: course.name,
    courseIcon: course.icon,
    type: 'learning',
    status: 'enrolled',
    progress: 100,
    moduleProgress: {
      completedCount: totalModules,
      totalModules: totalModules,
      nextModuleName: 'All modules complete!'
    },
    examAttempts: 0,
    examFeePaid: false,
    examFeePaidAt: null,
    amountPaid: course.pathPrice || 0,
    originalPrice: course.pathPrice || 0
  });

  // 3. Create ModuleProgress records for ALL modules
  await ModuleProgress.deleteMany({ userId: user._id, courseId });

  const progressRecords = [];
  for (let i = 1; i <= totalModules; i++) {
    progressRecords.push({
      userId: user._id,
      courseId: courseId,
      moduleId: i,
      completed: true,
      completedAt: new Date(),
      quizScore: 85,
      timeSpent: 1800,
      watchedVideo: true,
      readContent: true,
      notes: '',
      bookmarked: false
    });
  }
  await ModuleProgress.insertMany(progressRecords);

  console.log('✅ Enrollment created');
  console.log('✅ ' + totalModules + ' ModuleProgress records created (all completed)');
  console.log('');
  console.log('📋 Test now:');
  console.log('   1. Log in as Tafara');
  console.log('   2. Dashboard → AIP course');
  console.log('   3. Should show all modules complete');
  console.log('   4. Click "Take Final Exam"');
  console.log('   5. EXPECTED: exam fee wall triggers');
  console.log('');
  console.log('   If examPrice is missing on AIP, the wall uses fallback $40.');

  process.exit(0);
})();
