require('dotenv').config();
const mongoose = require('mongoose');
const Enrollment = require('./models/Enrollment');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  // Any user already 'enrolled' or 'certified' or with retakeFeePaid gets grandfathered
  const result = await Enrollment.updateMany(
    { examFeePaid: { $ne: true } },
    { $set: { examFeePaid: true, examFeePaidAt: new Date(), examFeeGrandfathered: true } }
  );

  console.log('Grandfathered enrollments:', result.modifiedCount);
  console.log('Total enrollments:', await Enrollment.countDocuments());
  process.exit(0);
})();
