require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const courses = await Course.find({}).lean();
  console.log('Total courses:', courses.length, '\n');

  let updated = 0;
  for (const c of courses) {
    const examPrice = c.examPrice || c.price || 40;
    // Default enroll = 25% of exam, rounded to nearest $5, min $10, max $30
    let enrollPrice = Math.round((examPrice * 0.25) / 5) * 5;
    if (enrollPrice < 10) enrollPrice = 10;
    if (enrollPrice > 30) enrollPrice = 30;
    const bundlePrice = enrollPrice + examPrice;

    if (c.enrollPrice === enrollPrice && c.bundlePrice === bundlePrice) {
      console.log(`  (skip) ${c.courseId.padEnd(12)} enroll:$${enrollPrice} exam:$${examPrice}`);
      continue;
    }

    await Course.updateOne(
      { _id: c._id },
      { $set: { enrollPrice, bundlePrice } },
      { runValidators: false }
    );

    console.log(`  ${c.courseId.padEnd(12)} enroll:$${enrollPrice} + exam:$${examPrice} = $${bundlePrice}`);
    updated++;
  }

  console.log('\nUpdated:', updated);
  console.log('Total with enrollPrice:', await Course.countDocuments({ enrollPrice: { $gt: 0 } }));
  process.exit(0);
})();
