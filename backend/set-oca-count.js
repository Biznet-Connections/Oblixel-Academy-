require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const result = await Course.updateOne(
    { courseId: 'oca' },
    { $set: { enrolledCount: 1126 } }
  );

  const oca = await Course.findOne({ courseId: 'oca' });
  console.log('OCA updated:');
  console.log('  name:', oca.name);
  console.log('  enrolledCount:', oca.enrolledCount);
  console.log('  enrollPrice: $' + oca.enrollPrice);
  console.log('  examPrice: $' + oca.examPrice);
  console.log('');
  console.log('✅ Card will now show: "1,126+ students"');

  process.exit(0);
})();
