require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const courses = await Course.find({}).lean();
  console.log('Total courses:', courses.length, '\n');

  let fixed = 0;
  let ok = 0;

  for (const c of courses) {
    const examPrice = c.examPrice || 40;
    const pathPrice = c.pathPrice || c.price || examPrice;

    let enrollPrice = c.enrollPrice || 0;

    if (!enrollPrice || enrollPrice === 0 || enrollPrice >= pathPrice) {
      enrollPrice = Math.round((examPrice * 0.25) / 5) * 5;
      if (enrollPrice < 10) enrollPrice = 10;
      if (enrollPrice > 30) enrollPrice = 30;

      await Course.updateOne(
        { _id: c._id },
        { $set: { enrollPrice, bundlePrice: enrollPrice + examPrice } },
        { runValidators: false }
      );
      console.log(`  🔧 FIXED  ${c.courseId.padEnd(12)} enroll:$${enrollPrice} exam:$${examPrice}`);
      fixed++;
    } else {
      console.log(`  ✓ OK     ${c.courseId.padEnd(12)} enroll:$${enrollPrice} exam:$${examPrice}`);
      ok++;
    }
  }

  console.log('\nFixed:', fixed);
  console.log('OK:', ok);
  process.exit(0);
})();
