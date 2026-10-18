const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const userObjId = new mongoose.Types.ObjectId('6ac34db039fd0ddcd9942e9e');
  const now = new Date();

  console.log('=== BEFORE ===');
  const before = await db.collection('enrollments').find({ userId: userObjId }).toArray();
  before.forEach(e => console.log(`  ${e.courseId}: status=${e.status}, score=${e.score}, examFeePaid=${e.examFeePaid}`));

  // Force pass both AIP + OCA
  const result = await db.collection('enrollments').updateMany(
    { userId: userObjId, courseId: { $in: ['aip', 'oca'] } },
    {
      $set: {
        status: 'passed_waiting',
        score: 85,
        examAttempts: 1,
        examFeePaid: true,
        examFeePaidAt: now,
        examFeePaymentId: 'admin-force-pass-' + now.getTime(),
        examFeeGrantedBy: 'mutaurijoe@gmail.com',
        examFeeGrantReason: 'Admin force pass',
        retakeFeeRequired: false,
        retakeFeePaid: true,
        cooldownUntil: null,
        lastExamDate: now,
        updatedAt: now
      }
    }
  );

  console.log('\n=== RESULT ===');
  console.log('Matched:', result.matchedCount);
  console.log('Modified:', result.modifiedCount);

  console.log('\n=== AFTER ===');
  const after = await db.collection('enrollments').find({ userId: userObjId }).toArray();
  after.forEach(e => console.log(`  ${e.courseId}: status=${e.status}, score=${e.score}, examFeePaid=${e.examFeePaid}`));

  // Also check if certificates need to be issued
  console.log('\n=== CERTIFICATES for this user ===');
  const certs = await db.collection('certificates').find({ userId: userObjId }).toArray();
  certs.forEach(c => console.log(`  ${c.courseId}: ${c.certificateId} | status=${c.status}`));

  await mongoose.disconnect();
  console.log('\n✅ DONE — user has passed AIP + OCA');
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
