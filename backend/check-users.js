require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}, 'email role isMainAdmin name avatar hasProvidedLegalName legalNameLockedAt').lean();
    console.log('Total users:', users.length);
    console.log('');

    users.forEach(u => {
      console.log('─────────────────────────────');
      console.log('Name:          ', u.name);
      console.log('Email:         ', u.email);
      console.log('Role:          ', u.role);
      console.log('isMainAdmin:   ', u.isMainAdmin);
      console.log('Avatar:        ', JSON.stringify(u.avatar));
      console.log('Legal name set:', u.hasProvidedLegalName);
      console.log('Legal locked at:', u.legalNameLockedAt);
    });
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
