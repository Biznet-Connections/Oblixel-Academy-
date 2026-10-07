require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const ModuleProgress = require('./models/ModuleProgress');
const Certificate = require('./models/Certificate');
const Payment = require('./models/Payment');
const ExamSession = require('./models/ExamSession');
const ExamAttempt = require('./models/ExamAttempt');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const email = 'mutaurijoe@gmail.com';
  const user = await User.findOne({ email });

  if (!user) {
    console.log('❌ User not found:', email);
    process.exit(0);
  }

  console.log('🎯 Resetting:', user.name, '(' + user.email + ')');
  console.log('   User ID:', user._id);
  console.log('');

  const userId = user._id;

  // Count before
  const beforeCounts = {
    enrollments: await Enrollment.countDocuments({ userId }),
    moduleProgress: await ModuleProgress.countDocuments({ userId }),
    certificates: await Certificate.countDocuments({ userId }),
    payments: await Payment.countDocuments({ userId }),
    examSessions: await ExamSession.countDocuments({ userId }).catch(() => 0),
    examAttempts: await ExamAttempt.countDocuments({ userId }).catch(() => 0)
  };

  console.log('=== BEFORE ===');
  console.log('  Enrollments:      ', beforeCounts.enrollments);
  console.log('  Module Progress:  ', beforeCounts.moduleProgress);
  console.log('  Certificates:     ', beforeCounts.certificates);
  console.log('  Payments:         ', beforeCounts.payments);
  console.log('  Exam Sessions:    ', beforeCounts.examSessions);
  console.log('  Exam Attempts:    ', beforeCounts.examAttempts);
  console.log('');

  // Delete everything
  const results = {
    enrollments: (await Enrollment.deleteMany({ userId })).deletedCount,
    moduleProgress: (await ModuleProgress.deleteMany({ userId })).deletedCount,
    certificates: (await Certificate.deleteMany({ userId })).deletedCount,
    payments: (await Payment.deleteMany({ userId })).deletedCount,
    examSessions: (await ExamSession.deleteMany({ userId }).catch(() => ({ deletedCount: 0 }))).deletedCount,
    examAttempts: (await ExamAttempt.deleteMany({ userId }).catch(() => ({ deletedCount: 0 }))).deletedCount
  };

  // Reset user counters
  user.enrolledCourses = 0;
  user.totalSpent = 0;
  user.xp = 0;
  user.level = 1;
  user.streak = 0;
  // Keep legal name — user still needs it for certs
  await user.save();

  console.log('=== AFTER (deleted) ===');
  console.log('  Enrollments:      ', results.enrollments);
  console.log('  Module Progress:  ', results.moduleProgress);
  console.log('  Certificates:     ', results.certificates);
  console.log('  Payments:         ', results.payments);
  console.log('  Exam Sessions:    ', results.examSessions);
  console.log('  Exam Attempts:    ', results.examAttempts);
  console.log('');
  console.log('✅ User counters reset (enrolledCourses=0, totalSpent=0, xp=0, level=1)');
  console.log('✅ Legal name kept:', user.fullName || '(none)');
  console.log('');
  console.log('🎯 Now log in as', email, '→ you have NO enrollments, NO certs, NO history.');

  process.exit(0);
})();
