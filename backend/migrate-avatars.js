require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    // Clean avatars that are 'U' or empty — clear them so frontend uses name initial
    const result = await User.updateMany(
      { $or: [{ avatar: 'U' }, { avatar: '' }] },
      { $set: { avatar: '' } }
    );

    console.log('Avatars cleared:', result.modifiedCount);

    // Show sample
    const sample = await User.find({}, 'name email avatar role').limit(5).lean();
    console.log('\nSample after migration:');
    sample.forEach(u => {
      console.log(`  ${u.name} (${u.role}) → avatar: "${u.avatar}"`);
    });

    console.log('\nDONE.');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
