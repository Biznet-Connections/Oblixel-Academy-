const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const userObjId = new mongoose.Types.ObjectId('6ac34db039fd0ddcd9942e9e'); // biznetconnections
  const courseId = 'aip';

  // 1. Delete any certificate we forced earlier
  const delCert = await db.collection('certificates').deleteMany({ userId: userObjId, courseId });
  console.log('Deleted certificates:', delCert.deletedCount);

  // 2. Reset enrollment so they can take the exam for free
  const result = await db.collection('enrollments').updateOne(
    { userId: userObjId, courseId },
    {
      $set: {
        status: 'enrolled',          // 'enrolled' bypasses the failed retake fee logic
        score: 0,                    // Reset score
        examAttempts: 0,             // Reset attempts
        certificateId: null,         // Remove cert link
        examFeePaid: true,           // ✅ TRUE = Bypass the payment wall
        retakeFeeRequired: false,    // No retake fee needed
        retakeFeePaid: true,
        cooldownUntil: null,         // No cooldown
        updatedAt: new Date()
      }
    }
  );

  console.log('\n=== AFTER ===');
  const after = await db.collection('enrollments').findOne({ userId: userObjId, courseId });
  console.log(`  ${courseId}: status=${after.status} | examFeePaid=${after.examFeePaid} | score=${after.score}`);

  await mongoose.disconnect();
  console.log('\n✅ DONE — User can now take the AIP exam immediately (No payment required)');
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
