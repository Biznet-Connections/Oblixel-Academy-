require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const ExamAttempt = require('./models/ExamAttempt');
const ExamSession = require('./models/ExamSession');
const Certificate = require('./models/Certificate');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const user = await User.findOne({ email: 'biznetconnections@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }

  console.log('User:', user.name, '(' + user.email + ')');
  console.log('ID:', user._id);
  console.log('');

  // === BEFORE state ===
  const enrollmentsBefore = await Enrollment.find({ userId: user._id }).lean();
  console.log('=== BEFORE ===');
  for (const e of enrollmentsBefore) {
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(12) +
      ' | cooldown: ' + (e.cooldownUntil ? 'SET' : 'none') +
      ' | retakeFeeRequired: ' + (e.retakeFeeRequired ? 'YES' : 'no') +
      ' | retakeFeePaid: ' + (e.retakeFeePaid ? 'yes' : 'NO') +
      ' | examFeePaid: ' + (e.examFeePaid ? 'yes' : 'NO') +
      ' | attempts: ' + (e.examAttempts || 0));
  }

  // === Reset enrollments ===
  const enrollments = await Enrollment.find({ userId: user._id });
  for (const e of enrollments) {
    e.status = 'enrolled';
    e.score = null;
    e.examAttempts = 0;
    e.cooldownUntil = null;
    e.lastExamDate = null;
    e.retakeFeeRequired = false;
    e.retakeFeePaid = false;
    e.certificateId = null;
    // Keep examFeePaid untouched? Or clear it so we can test the wall?
    // User asked to test TIMER, so keep examFeePaid = true so they can start exam
    e.examFeePaid = true;   // ← allows them to start the exam
    e.examFeePaidAt = e.examFeePaidAt || new Date();
    await e.save();
  }
  console.log('\n✅ Reset', enrollments.length, 'enrollment(s)');

  // === Delete old exam attempts and sessions for these courses ===
  const attemptsDeleted = await ExamAttempt.deleteMany({ userId: user._id });
  console.log('✅ Deleted', attemptsDeleted.deletedCount, 'exam attempts');

  const sessionsDeleted = await ExamSession.deleteMany({ userId: user._id });
  console.log('✅ Deleted', sessionsDeleted.deletedCount, 'exam sessions');

  // === Optional: delete certificates issued for these courses (so they can re-pass) ===
  const certsDeleted = await Certificate.deleteMany({ userId: user._id });
  console.log('✅ Deleted', certsDeleted.deletedCount, 'certificates');

  // === AFTER state ===
  const enrollmentsAfter = await Enrollment.find({ userId: user._id }).lean();
  console.log('\n=== AFTER ===');
  for (const e of enrollmentsAfter) {
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(12) +
      ' | cooldown: ' + (e.cooldownUntil ? 'SET' : 'none') +
      ' | retakeFeeRequired: ' + (e.retakeFeeRequired ? 'YES' : 'no') +
      ' | retakeFeePaid: ' + (e.retakeFeePaid ? 'yes' : 'NO') +
      ' | examFeePaid: ' + (e.examFeePaid ? 'yes' : 'NO') +
      ' | attempts: ' + (e.examAttempts || 0));
  }

  console.log('');
  console.log('🎯 Biznet can now:');
  console.log('   1. Log in → Dashboard');
  console.log('   2. Go to OCA or AIP course');
  console.log('   3. Click "Take Final Exam"');
  console.log('   4. See the 10-minute timer ⏱️');

  process.exit(0);
})();
