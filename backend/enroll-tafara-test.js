require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const user = await User.findOne({ email: 'biznetconnections@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }

  const courseId = 'aip';
  const course = await Course.findOne({ courseId });
  if (!course) { console.log('AIP course not found'); process.exit(0); }

  // Delete existing enrollment if any
  await Enrollment.deleteOne({ userId: user._id, courseId });

  // Create fresh enrollment — all modules done, exam fee NOT paid
  const enr = await Enrollment.create({
    userId: user._id,
    courseId: courseId,
    courseName: course.name,
    courseIcon: course.icon,
    type: 'learning',
    status: 'enrolled',
    progress: 100,
    moduleProgress: {
      completedCount: course.totalModules || 12,
      totalModules: course.totalModules || 12,
      nextModuleName: 'All modules complete!'
    },
    examAttempts: 0,
    examFeePaid: false,   // ← THE WALL WILL TRIGGER
    examFeePaidAt: null,
    amountPaid: 20,
    originalPrice: 20
  });

  console.log('✅ Enrolled Tafara in AIP (test enrollment)');
  console.log('   Course:', course.name);
  console.log('   Modules complete: ' + enr.moduleProgress.completedCount + '/' + enr.moduleProgress.totalModules);
  console.log('   Exam fee paid: ❌ (WALL will trigger)');
  console.log('   Exam price: $' + (course.examPrice || 'not set'));
  console.log('\n🎯 Now log in as Tafara → Dashboard → AIP course → "Take Final Exam"');
  console.log('   You should see the exam fee wall.');

  process.exit(0);
})();
