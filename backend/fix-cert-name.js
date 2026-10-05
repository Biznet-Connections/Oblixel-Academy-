require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const cert = await Certificate.findOne({ certificateId: 'OBX-CCP-U5UDB6' });
  if (!cert) { console.log('Cert not found'); process.exit(0); }

  const user = await User.findById(cert.userId);
  const correctName = (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name);

  console.log('BEFORE:');
  console.log('  studentName in cert:', JSON.stringify(cert.studentName));
  console.log('  correct name from user:', JSON.stringify(correctName));

  cert.studentName = correctName;
  await cert.save();

  const after = await Certificate.findOne({ certificateId: 'OBX-CCP-U5UDB6' });
  console.log('\nAFTER:');
  console.log('  studentName:', JSON.stringify(after.studentName));

  console.log('\nDONE. Now re-download the cert — it should show your correct name.');

  process.exit(0);
})();
