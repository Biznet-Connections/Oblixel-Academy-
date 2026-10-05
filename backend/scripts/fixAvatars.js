// ==================== FIX AVATARS MIGRATION ====================
// Clears `avatar` field for any user where avatar === 'U' or empty,
// so the frontend computes initials from name.
//
// Run once:  node backend/scripts/fixAvatars.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[fixAvatars] Connected to MongoDB');

    const result = await User.updateMany(
      { $or: [{ avatar: 'U' }, { avatar: '' }, { avatar: null }] },
      { $set: { avatar: '' } }
    );

    console.log('[fixAvatars] Matched:', result.matchedCount);
    console.log('[fixAvatars] Modified:', result.modifiedCount);

    const total = await User.countDocuments();
    console.log('[fixAvatars] Total users:', total);
    console.log('[fixAvatars] DONE. Frontend will now show name initials.');
  } catch (err) {
    console.error('[fixAvatars] ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
