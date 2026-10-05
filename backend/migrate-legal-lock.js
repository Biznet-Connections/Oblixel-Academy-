require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    // Lock all users who have legal name set but no lockedAt timestamp
    const result = await User.updateMany(
      { hasProvidedLegalName: true, legalNameLockedAt: null },
      { $set: { legalNameLockedAt: new Date() } }
    );

    console.log('Legal names locked:', result.modifiedCount);

    const locked = await User.find({ hasProvidedLegalName: true, legalNameLockedAt: { $ne: null } }, 'name email').lean();
    console.log('\nLocked users:');
    locked.forEach(u => console.log(`  ${u.name} (${u.email})`));

    console.log('\nDONE.');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
