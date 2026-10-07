require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const Course = require('./models/Course');
const ModuleProgress = require('./models/ModuleProgress');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const email = 'biznetconnections@gmail.com';
  const courseId = 'oca';

  const user = await User.findOne({ email });
  if (!user) { console.log('❌ User not found:', email); process.exit(0); }

  const course = await Course.findOne({ courseId });
  if (!course) { console.log('❌ Course not found:', courseId); process.exit(0); }

  const totalModules = course.totalModules || 8;

  console.log('🎯 Setting up test enrollment');
  console.log('   User:', user.name, '(' + user.email + ')');
  console.log('   Course:', course.name);
  console.log('   Total modules:', totalModules);
  console.log('   Enroll fee:', '$' + (course.enrollPrice || 0));
  console.log('   Exam fee:', '$' + (course.examPrice || 0));
  console.log('');

  // Delete any existing enrollment / progress
  await Enrollment.deleteOne({ userId: user._id, courseId });
  await ModuleProgress.deleteMany({ userId: user._id, courseId });

  // Create enrollment — all modules done, exam NOT paid
  const enr = await Enrollment.create({
    userId: user._id,
    courseId: courseId,
    courseName: course.name,
    courseIcon: course.icon || 'fa-shield-halved',
    type: 'learning',
    status: 'enrolled',
    progress: 100,
    moduleProgress: {
      completedCount: totalModules,
      totalModules: totalModules,
      nextModuleName: 'All modules complete!'
    },
    examAttempts: 0,
    examFeePaid: false,        // ← IMPORTANT: wall will trigger
    examFeePaidAt: null,
    examFeePaymentId: null,
    amountPaid: course.enrollPrice || 0,
    originalPrice: course.enrollPrice || 0
  });

  // Create ModuleProgress for all modules
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

  // Update user counters
  await User.updateOne(
    { _id: user._id },
    { $inc: { enrolledCourses: 1, totalSpent: course.enrollPrice || 0 } }
  );

  console.log('✅ Enrollment created');
  console.log('   Modules complete: ' + totalModules + '/' + totalModules);
  console.log('   Exam fee paid: ❌ (wall will trigger)');
  console.log('   ' + totalModules + ' ModuleProgress records created');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Log in as biznetconnections@gmail.com');
  console.log('   2. Go to Dashboard → OCA');
  console.log('   3. See all ' + totalModules + ' modules ✅');
  console.log('   4. Click "Take Final Exam"');
  console.log('   5. EXPECTED: exam fee wall ($' + (course.examPrice || 0) + ')');
  console.log('   6. Pay $' + (course.examPrice || 0) + ' → exam unlocks');

  process.exit(0);
})();
