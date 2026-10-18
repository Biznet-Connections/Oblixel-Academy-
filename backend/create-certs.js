const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const userObjId = new mongoose.Types.ObjectId('6ac34db039fd0ddcd9942e9e');
  const now = new Date();

  // Fetch user + template
  const user = await db.collection('users').findOne({ _id: userObjId });
  const template = await db.collection('certificatetemplates').findOne({});
  const verifyBase = (template && template.verifyUrlBase) ? template.verifyUrlBase : 'oblixelacademy.com/verify/';

  const studentFullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || 'Student';

  function generateCertId(courseId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'OBX-' + courseId.toUpperCase() + '-' + code;
  }

  for (const courseId of ['aip', 'oca']) {
    // Check if cert already exists
    const existingCert = await db.collection('certificates').findOne({ userId: userObjId, courseId: courseId });
    if (existingCert) {
      console.log(`ℹ️  ${courseId}: cert already exists (${existingCert.certificateId})`);
      continue;
    }

    const enrollment = await db.collection('enrollments').findOne({ userId: userObjId, courseId: courseId });
    if (!enrollment) { console.log(`⚠️  ${courseId}: no enrollment`); continue; }

    const certCode = generateCertId(courseId);
    const verifyUrl = verifyBase + certCode;

    // Create certificate
    await db.collection('certificates').insertOne({
      userId: userObjId,
      courseId: courseId,
      courseName: enrollment.courseName,
      certificateId: certCode,
      studentName: studentFullName,
      studentFirstName: user.firstName || '',
      studentLastName: user.lastName || '',
      score: 85,
      status: 'issued',
      type: enrollment.type || 'learning',
      issueDate: now,
      expiryDate: null,
      verifyUrl: verifyUrl,
      submittedAt: now,
      issuedAt: now,
      issuedByAdmin: 'mutaurijoe@gmail.com',
      issuedReason: 'Admin force pass',
      createdAt: now,
      updatedAt: now,
      __v: 0
    });

    // Update enrollment
    await db.collection('enrollments').updateOne(
      { _id: enrollment._id },
      { $set: {
        status: 'certified',
        score: 85,
        certificateId: certCode,
        cooldownUntil: null,
        retakeFeeRequired: false,
        updatedAt: now
      }}
    );

    console.log(`✅ ${courseId}: cert created (${certCode})`);
  }

  console.log('\n=== Final state ===');
  const certs = await db.collection('certificates').find({ userId: userObjId }).toArray();
  certs.forEach(c => console.log(`  📜 ${c.courseId}: ${c.certificateId} | status=${c.status}`));

  const enrs = await db.collection('enrollments').find({ userId: userObjId }).toArray();
  enrs.forEach(e => console.log(`  🎓 ${e.courseId}: status=${e.status} | cert=${e.certificateId || 'none'}`));

  await mongoose.disconnect();
  console.log('\n✅ DONE');
  process.exit(0);
})().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1); });
