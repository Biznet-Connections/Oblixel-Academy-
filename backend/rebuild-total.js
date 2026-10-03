const m = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await m.connect(process.env.MONGODB_URI, { dbName: 'oblixel_academy' });
    console.log('✅ Connected\n');

    const Users = m.connection.collection('users');
    const Enrollments = m.connection.collection('enrollments');

    // Backup current totalSpent values first
    const users = await Users.find({}).toArray();
    console.log(`📦 Backing up ${users.length} users' current totalSpent...`);

    const backup = users.map(u => ({
      _id: u._id,
      email: u.email,
      totalSpent_before: u.totalSpent || 0
    }));

    const fs = require('fs');
    const backupPath = `totalSpent-backup-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`   → saved to ${backupPath}\n`);

    // Recalculate for each user
    let updated = 0;
    let unchanged = 0;
    let stillZero = 0;
    const changes = [];

    for (const user of users) {
      const enrollments = await Enrollments.find({
        userId: user._id,
        status: { $ne: 'failed' }
      }).toArray();

      const correctTotal = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
      const currentTotal = user.totalSpent || 0;

      if (correctTotal !== currentTotal) {
        await Users.updateOne(
          { _id: user._id },
          { $set: { totalSpent: correctTotal, updatedAt: new Date() } }
        );
        changes.push({ email: user.email, from: currentTotal, to: correctTotal, count: enrollments.length });
        updated++;
      } else {
        unchanged++;
      }
      if (correctTotal === 0) stillZero++;
    }

    console.log('📊 RESULTS\n');
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Still $0 (no paid enrollments): ${stillZero}\n`);

    if (changes.length > 0) {
      console.log('🔄 CHANGES (users whose totals were corrected):');
      changes
        .sort((a, b) => b.to - a.to)
        .forEach(c => {
          console.log(`   ${c.email.padEnd(40)} | $${String(c.from).padStart(5)} → $${String(c.to).padStart(5)}  (${c.count} enrollments)`);
        });
    }

    // Spot-check key users
    console.log('\n🎯 SPOT CHECK:');
    const checks = ['rudokwaipa@gmail.com', 'mutaurijoe@gmail.com', 'pool@gmail.com'];
    for (const email of checks) {
      const u = await Users.findOne({ email });
      if (u) {
        const enrs = await Enrollments.find({ userId: u._id, status: { $ne: 'failed' } }).toArray();
        const sum = enrs.reduce((s, e) => s + (e.amountPaid || 0), 0);
        console.log(`   ${email.padEnd(40)} | totalSpent: $${u.totalSpent} | sum of enrollments: $${sum}`);
      }
    }

    console.log(`\n✅ Backup saved to ${backupPath} — keep it in case you need to revert.`);
    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
})();
