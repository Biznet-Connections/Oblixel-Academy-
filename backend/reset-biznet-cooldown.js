require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const user = await User.findOne({ email: 'biznetconnections@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }

  const result = await Enrollment.updateMany(
    { userId: user._id },
    {
      $set: {
        cooldownUntil: null,
        status: 'enrolled',           // reset to enrolled (was 'failed')
        retakeFeeRequired: false,     // no retake fee needed
        retakeFeePaid: false
      }
    }
  );

  console.log('Enrollments updated:', result.modifiedCount);

  const enrollments = await Enrollment.find({ userId: user._id }).lean();
  for (const e of enrollments) {
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(15) +
      ' | cooldown: ' + (e.cooldownUntil ? new Date(e.cooldownUntil).toISOString() : 'none') +
      ' | attempts: ' + (e.examAttempts || 0) +
      ' | examFeePaid: ' + (e.examFeePaid ? '✅' : '❌'));
  }

  console.log('\n✅ Cooldowns reset for biznetconnections@gmail.com');
  process.exit(0);
})();
