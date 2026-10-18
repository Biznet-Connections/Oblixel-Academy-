const mongoose = require('mongoose');
require('dotenv').config();
const { parseExpiryPeriod, calculateExpiryDate } = require('./utils/certExpiry');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const template = await db.collection('certificatetemplates').findOne({});
  const expiryPeriodStr = template ? template.expiryPeriod : null;
  console.log('Template expiry period:', expiryPeriodStr);

  const period = parseExpiryPeriod(expiryPeriodStr);
  console.log('Parsed period:', JSON.stringify(period));

  // Find all certs with null expiry
  const nullCerts = await db.collection('certificates').find({ expiryDate: null }).toArray();
  console.log('\nCerts with null expiry:', nullCerts.length);

  let updated = 0;
  for (const cert of nullCerts) {
    const issueDate = cert.issueDate || cert.issuedAt || cert.createdAt || new Date();
    const expiryDate = calculateExpiryDate(issueDate, period);
    if (expiryDate) {
      await db.collection('certificates').updateOne(
        { _id: cert._id },
        { $set: { expiryDate: expiryDate, updatedAt: new Date() } }
      );
      updated++;
      console.log(`  ✅ ${cert.courseId} (${cert.certificateId}): ${issueDate.toISOString().split('T')[0]} → ${expiryDate.toISOString().split('T')[0]}`);
    }
  }

  console.log('\n✅ Backfilled:', updated, 'certificates');

  // Verify
  const userObjId = new mongoose.Types.ObjectId('6ac34db039fd0ddcd9942e9e');
  const userCerts = await db.collection('certificates').find({ userId: userObjId }).toArray();
  console.log('\n=== User certs after backfill ===');
  userCerts.forEach(c => console.log(`  📜 ${c.courseId}: issue=${c.issueDate?.toISOString().split('T')[0]}, expiry=${c.expiryDate ? c.expiryDate.toISOString().split('T')[0] : 'NEVER'}`));

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
