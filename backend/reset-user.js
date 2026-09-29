const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const U = m.connection.collection('users');
  const E = m.connection.collection('enrollments');
  const MP = m.connection.collection('moduleprogresses');
  const C = m.connection.collection('certificates');

  const user = await U.findOne({ email: 'mutaurijoe@gmail.com' });
  if (!user) { console.log('❌ User not found'); process.exit(1); }

  const e = await E.deleteMany({ userId: user._id });
  const p = await MP.deleteMany({ userId: user._id });
  const c = await C.deleteMany({ userId: user._id });

  await U.updateOne(
    { _id: user._id },
    { $set: { enrolledCourses: 0, totalSpent: 0 } }
  );

  console.log('✅ Deleted:', e.deletedCount, 'enrollments,', p.deletedCount, 'progress,', c.deletedCount, 'certificates');
  console.log('✅ Reset: enrolledCourses=0, totalSpent=0');
  process.exit(0);
});
