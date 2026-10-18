const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const user = await db.collection('users').findOne({ email: 'kimmush05@gmail.com' });
  if (!user) { console.log('❌ User not found'); process.exit(1); }

  console.log('=== USER ===');
  console.log('_id:', user._id);
  console.log('name:', user.name);
  console.log('fullName:', user.fullName);
  console.log('firstName:', user.firstName);
  console.log('lastName:', user.lastName);
  console.log('email:', user.email);

  console.log('\n=== ENROLLMENTS ===');
  const enrs = await db.collection('enrollments').find({ userId: user._id }).toArray();
  enrs.forEach(e => console.log(`  ${e.courseId} | status=${e.status} | score=${e.score} | examFeePaid=${e.examFeePaid} | cert=${e.certificateId || 'none'}`));

  console.log('\n=== CERTIFICATES ===');
  const certs = await db.collection('certificates').find({ userId: user._id }).toArray();
  if (certs.length === 0) console.log('  (none)');
  certs.forEach(c => console.log(`  ${c.courseId} | ${c.certificateId} | status=${c.status}`));

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
