require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const certs = await Certificate.find({});
  console.log('Total certs:', certs.length, '\n');

  let fixed = 0;
  for (const cert of certs) {
    const user = await User.findById(cert.userId);
    if (!user) continue;

    const legalName = (user.fullName && user.fullName.trim())
      || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
      || user.name
      || '';

    if (legalName && cert.studentName !== legalName) {
      console.log('FIX:', cert.certificateId, '|', JSON.stringify(cert.studentName), '→', JSON.stringify(legalName));
      cert.studentName = legalName;
      cert.studentFirstName = user.firstName || '';
      cert.studentLastName = user.lastName || '';
      await cert.save();
      fixed++;
    }
  }

  console.log('\nFixed:', fixed, 'certs');
  console.log('DONE.');
  process.exit(0);
})();
