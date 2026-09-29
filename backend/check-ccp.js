const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const Users = m.connection.collection('users');
  const Enrollments = m.connection.collection('enrollments');

  const user = await Users.findOne({ email: 'mutaurijoe@gmail.com' });
  if (!user) { console.log('❌ User not found'); process.exit(0); }

  const enrollments = await Enrollments.find({ userId: user._id }).toArray();
  console.log('\n📚 Enrollments for ' + user.email + ':');
  if (enrollments.length === 0) {
    console.log('  (none — the grant did NOT save)');
  } else {
    enrollments.forEach(e => {
      console.log('  ✅', e.courseId, '|', e.courseName, '| type:', e.type, '| status:', e.status, '| voucher:', e.voucherCode);
    });
  }

  console.log('\n👤 User stats:');
  console.log('  enrolledCourses:', user.enrolledCourses);
  console.log('  totalSpent: $' + (user.totalSpent || 0));

  process.exit(0);
}).catch(err => { console.error('❌ Connection error:', err.message); process.exit(1); });
