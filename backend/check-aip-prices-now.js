require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = await Course.findOne({ courseId: 'aip' });
  console.log('AIP pricing:');
  console.log('  price:      $' + (c.price || 'none'));
  console.log('  enrollPrice: $' + (c.enrollPrice || 'none'));
  console.log('  examPrice:  $' + (c.examPrice || 'none'));
  console.log('  pathPrice:  $' + (c.pathPrice || 'none'));
  console.log('  bundlePrice: $' + (c.bundlePrice || 'none'));
  process.exit(0);
})();
