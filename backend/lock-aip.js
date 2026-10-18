const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const userObjId = new mongoose.Types.ObjectId('6ac34db039fd0ddcd9942e9e'); // biznetconnections
  const courseId = 'aip';

  console.log('=== BEFORE ===');
  const before = await db.collection('enrollments').findOne({ userId: userObjId, courseId });
  if (before) {
    console.log(`  ${courseId}: status=${before.status}, examFeePaid=${before.examFeePaid}, cert=${before.certificateId || 'none'}`);
  }

  // 1. Delete certificate if exists
  const delCert = await db.collection('certificates').deleteMany({ userId: userObjId, courseId });
  console.log('Deleted certs:', delCert.deletedCount);

  // 2. Lock exam + reset enrollment
  const result = await db.collection('enrollments').updateOne(
    { userId: userObjId, courseId },
    {
      $set: {
        status: 'failed', // Use 'failed' so they can retake and hit the paywall
        score: 0,
        examAttempts: 1,
        certificateId: null,
        examFeePaid: false, // LOCK IT -> Will trigger the 402 Payment Required
        retakeFeeRequired: true, // Ensure retake fee is required
        retakeFeePaid: false,
        cooldownUntil: null,
        updatedAt: new Date()
      }
    }
  );

  console.log('\n=== RESULT ===');
  console.log('Matched:', result.matchedCount);
  console.log('Modified:', result.modifiedCount);

  console.log('\n=== AFTER ===');
  const after = await db.collection('enrollments').findOne({ userId: userObjId, courseId });
  console.log(`  ${courseId}: status=${after.status}, examFeePaid=${after.examFeePaid}, cert=${after.certificateId || 'none'}`);

  await mongoose.disconnect();
  console.log('\n✅ DONE — User is locked and must pay for the final exam');
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
