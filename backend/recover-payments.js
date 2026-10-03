const m = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await m.connect(process.env.MONGODB_URI, { dbName: 'oblixel_academy' });
    console.log('✅ Connected\n');

    const Enrollments = m.connection.collection('enrollments');
    const Payments = m.connection.collection('payments');
    const Users = m.connection.collection('users');

    // Find enrollments with paid amounts
    const paidEnrollments = await Enrollments.find({
      amountPaid: { $gt: 0 },
      status: { $ne: 'failed' }
    }).toArray();

    console.log(`📚 Found ${paidEnrollments.length} paid enrollments\n`);

    let created = 0;
    let skipped = 0;
    let totalRevenue = 0;

    for (const e of paidEnrollments) {
      // Check if payment already exists for this enrollment
      const existing = await Payments.findOne({
        userId: e.userId,
        courseId: e.courseId,
        amount: e.amountPaid,
        status: { $in: ['completed', 'paid'] }
      });

      if (existing) {
        skipped++;
        totalRevenue += e.amountPaid;
        continue;
      }

      const user = await Users.findOne({ _id: e.userId });

      await Payments.insertOne({
        sessionId: `RECOVERED-${e._id}`,
        userId: e.userId,
        userEmail: user?.email || 'unknown',
        userName: user?.name || 'unknown',
        courseId: e.courseId,
        type: e.type,
        amount: e.amountPaid,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'recovered',
        paidAt: e.createdAt || new Date(),
        createdAt: e.createdAt || new Date(),
        updatedAt: new Date(),
        note: 'Recovered from enrollment after accidental revenue reset'
      });
      created++;
      totalRevenue += e.amountPaid;
    }

    console.log(`✅ Created: ${created} payment records`);
    console.log(`   Skipped (already existed): ${skipped}`);
    console.log(`   Total revenue recovered: $${totalRevenue}\n`);

    // Verify admin stats query now works
    const agg = await Payments.aggregate([
      { $match: { status: { $in: ['completed', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    console.log(`🎯 Admin dashboard revenue will now show: $${agg[0]?.total || 0}`);

    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
})();
