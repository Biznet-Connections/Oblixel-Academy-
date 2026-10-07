require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const c = await Course.findOne({ courseId: 'oca' });
  if (!c) { console.log('❌ OCA not found'); process.exit(0); }

  console.log('=== OCA Full Data ===');
  console.log('  courseId:    ', c.courseId);
  console.log('  name:        ', c.name);
  console.log('  abbreviation:', c.abbreviation);
  console.log('  isActive:    ', c.isActive);
  console.log('');
  console.log('=== Pricing ===');
  console.log('  price:       $' + (c.price || 'none'));
  console.log('  enrollPrice: $' + (c.enrollPrice || 'none'));
  console.log('  examPrice:   $' + (c.examPrice || 'none'));
  console.log('  pathPrice:   $' + (c.pathPrice || 'none'));
  console.log('  bundlePrice: $' + (c.bundlePrice || 'none'));
  console.log('');

  // What the card would show
  const cardPrice = c.enrollPrice || c.price || c.examPrice || 0;
  console.log('=== Card display check ===');
  console.log('  Card would show: $' + cardPrice + '    ← should be enroll fee');

  // What API returns
  console.log('');
  console.log('=== API response (courses list) would be ===');
  console.log('  price:       $' + (c.price || c.examPrice || 0));
  console.log('  enrollPrice: $' + (c.enrollPrice || c.pathPrice || c.examPrice || 0));
  console.log('  examPrice:   $' + (c.examPrice || c.price || 0));
  console.log('  pathPrice:   $' + (c.pathPrice || c.examPrice || 0));
  console.log('');

  // Diagnosis
  console.log('=== DIAGNOSIS ===');
  if (!c.enrollPrice || c.enrollPrice === 0) {
    console.log('  ❌ enrollPrice MISSING or 0 — card will show $' + cardPrice);
    console.log('  🔧 Run fix-all-prices.js');
  } else if (c.enrollPrice === c.price) {
    console.log('  ❌ enrollPrice equals price — this is the bundle, not enroll');
    console.log('  🔧 Run fix-all-prices.js');
  } else {
    console.log('  ✅ enrollPrice is set correctly ($' + c.enrollPrice + ')');
    console.log('  ✅ Card should show $' + c.enrollPrice);
    console.log('  ⚠️  If card still shows total, API is not returning enrollPrice');
  }

  process.exit(0);
})();
