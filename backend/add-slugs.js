require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    const courses = await Course.find({}).lean();
    console.log('Total courses:', courses.length, '\n');

    let updated = 0;
    let skipped = 0;

    for (const c of courses) {
      const baseName = String(c.name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      const slug = slugify(baseName);

      if (!slug) {
        console.log(`  (skip, no name) ${c.courseId}`);
        skipped++;
        continue;
      }

      if (c.slug === slug) {
        console.log(`  (skip) ${String(c.courseId).padEnd(12)} → ${slug}`);
        continue;
      }

      // Ensure uniqueness
      let finalSlug = slug;
      let suffix = 1;
      while (await Course.findOne({ slug: finalSlug, _id: { $ne: c._id } }).lean()) {
        suffix++;
        finalSlug = `${slug}-${suffix}`;
      }

      // Use updateOne — bypasses full-document validation
      await Course.updateOne(
        { _id: c._id },
        { $set: { slug: finalSlug } },
        { runValidators: false }
      );

      console.log(`  ${String(c.courseId).padEnd(12)} → ${finalSlug}`);
      updated++;
    }

    console.log('\nSlugs added:', updated);
    console.log('Skipped:', skipped);
    console.log('Total with slug:', await Course.countDocuments({ slug: { $exists: true, $ne: null } }));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
