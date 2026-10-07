require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const user = await User.findOne({ email: 'biznetconnections@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }

  console.log('User:', user.name, '(' + user.email + ')\n');

  // Show BEFORE state
  const before = await Enrollment.find({ userId: user._id }).lean();
  console.log('=== BEFORE ===');
  for (const e of before) {
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(12) +
      ' | cooldown: ' + (e.cooldownUntil ? new Date(e.cooldownUntil).toISOString() : 'none') +
      ' | retakeFeeRequired: ' + (e.retakeFeeRequired ? 'YES' : 'no') +
      ' | retakeFeePaid: ' + (e.retakeFeePaid ? 'yes' : 'NO') +
      ' | examFeePaid: ' + (e.examFeePaid ? 'yes' : 'NO'));
  }

  // Clear ONLY the cooldown
  const result = await Enrollment.updateMany(
    { userId: user._id },
    {
      $set: {
        cooldownUntil: null
      }
    }
  );

  console.log('\nCleared cooldown for', result.modifiedCount, 'enrollment(s)');

  // Show AFTER state — retakeFeeRequired + examFeePaid unchanged
  const after = await Enrollment.find({ userId: user._id }).lean();
  console.log('\n=== AFTER ===');
  for (const e of after) {
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(12) +
      ' | cooldown: ' + (e.cooldownUntil ? new Date(e.cooldownUntil).toISOString() : 'none') +
      ' | retakeFeeRequired: ' + (e.retakeFeeRequired ? 'YES' : 'no') +
      ' | retakeFeePaid: ' + (e.retakeFeePaid ? 'yes' : 'NO') +
      ' | examFeePaid: ' + (e.examFeePaid ? 'yes' : 'NO'));
  }

  console.log('\n✅ Cooldown cleared. Retake fee wall + exam fee status preserved.');

  process.exit(0);
})();
