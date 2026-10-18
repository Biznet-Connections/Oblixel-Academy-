const mongoose = require('mongoose');
require('dotenv').config();
const { parseExpiryPeriod, calculateExpiryDate } = require('./utils/certExpiry');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const userObjId = new mongoose.Types.ObjectId('6ad0966a997cec1d7330daab');
  const now = new Date();

  // Fetch user + template
  const user = await db.collection('users').findOne({ _id: userObjId });
  const template = await db.collection('certificatetemplates').findOne({});
  const expiryPeriodStr = template ? template.expiryPeriod : null;
  const period = parseExpiryPeriod(expiryPeriodStr);
  const expiryDate = calculateExpiryDate(now, period);
  const verifyBase = (template && template.verifyUrlBase) ? template.verifyUrlBase : 'oblixelacademy.com/verify/';

  console.log('Template expiry:', expiryPeriodStr, '→', expiryDate ? expiryDate.toISOString() : 'never');

  const studentFullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || 'Student';

  function generateCertId(courseId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'OBX-' + courseId.toUpperCase() + '-' + code;
  }

  const courseId = 'aip';
  const enrollment = await db.collection('enrollments').findOne({ userId: userObjId, courseId: courseId });
  if (!enrollment) { console.log('❌ No AIP enrollment'); process.exit(1); }

  // Check if cert already exists
  const existingCert = await db.collection('certificates').findOne({ userId: userObjId, courseId: courseId });
  if (existingCert) {
    console.log(`ℹ️  Cert already exists: ${existingCert.certificateId}`);
    process.exit(0);
  }

  const certCode = generateCertId(courseId);
  const verifyUrl = verifyBase + certCode;

  // Create certificate
  await db.collection('certificates').insertOne({
    userId: userObjId,
    courseId: courseId,
    courseName: enrollment.courseName || 'Artificial Intelligence Professional (AIP)',
    certificateId: certCode,
    studentName: studentFullName,
    studentFirstName: user.firstName || '',
    studentLastName: user.lastName || '',
    score: 85,
    status: 'issued',
    type: enrollment.type || 'learning',
    issueDate: now,
    expiryDate: expiryDate,
    verifyUrl: verifyUrl,
    submittedAt: now,
    issuedAt: now,
    issuedByAdmin: 'mutaurijoe@gmail.com',
    issuedReason: 'Admin certification',
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
      retakeFeePaid: true,
      updatedAt: now
    }}
  );

  console.log(`\n✅ Kim certified in AIP`);
  console.log(`   Certificate: ${certCode}`);
  console.log(`   Issue date: ${now.toISOString().split('T')[0]}`);
  console.log(`   Expiry: ${expiryDate ? expiryDate.toISOString().split('T')[0] : 'never'}`);
  console.log(`   Verify URL: ${verifyUrl}`);

  // Final verification
  console.log('\n=== Final state ===');
  const finalEnr = await db.collection('enrollments').findOne({ _id: enrollment._id });
  console.log(`  Enrollment: status=${finalEnr.status}, cert=${finalEnr.certificateId}`);
  const finalCert = await db.collection('certificates').findOne({ userId: userObjId, courseId: courseId });
  console.log(`  Certificate: ${finalCert.certificateId} | expiry=${finalCert.expiryDate ? finalCert.expiryDate.toISOString().split('T')[0] : 'never'}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1); });
