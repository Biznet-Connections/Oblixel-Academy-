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

  console.log('User:', user.name, '(' + user.email + ')');
  console.log('ID:', user._id);

  const enrollments = await Enrollment.find({ userId: user._id });
  console.log('\n=== Enrollments (' + enrollments.length + ') ===');
  for (const e of enrollments) {
    const c = await Course.findOne({ courseId: e.courseId });
    console.log('  ' + e.courseId.padEnd(12) +
      ' | status: ' + (e.status || '—').padEnd(15) +
      ' | examFeePaid: ' + (e.examFeePaid ? '✅' : '❌') +
      ' | modules: ' + (e.moduleProgress?.completedCount || 0) + '/' + (e.moduleProgress?.totalModules || '?') +
      ' | examPrice: $' + (c?.examPrice || '?'));
  }

  process.exit(0);
})();
