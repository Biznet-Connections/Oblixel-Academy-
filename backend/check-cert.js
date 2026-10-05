require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  // Find the specific cert
  const cert = await Certificate.findOne({ certificateId: 'OBX-CCP-U5UDB6' });
  if (!cert) { console.log('Cert OBX-CCP-U5UDB6 NOT FOUND'); }
  else {
    const u = await User.findById(cert.userId);
    console.log('Cert OBX-CCP-U5UDB6:');
    console.log('  userId:', cert.userId);
    console.log('  userName:', u ? u.name : '?');
    console.log('  userEmail:', u ? u.email : '?');
    console.log('  studentName field:', cert.studentName);
  }

  // Now find YOUR certs
  const me = await User.findOne({ email: 'mutaurijoe@gmail.com' });
  const myCerts = await Certificate.find({ userId: me._id });
  console.log('\nYour certs:');
  myCerts.forEach(c => console.log('  ' + c.certificateId + ' · ' + c.courseId + ' · status:' + c.status));

  process.exit(0);
})();
