const m = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await m.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      dbName: 'oblixel_academy'
    });
    console.log('✅ Connected to', m.connection.host);

    const Users = m.connection.collection('users');
    const Courses = m.connection.collection('courses');
    const Enrollments = m.connection.collection('enrollments');
    const Payments = m.connection.collection('payments');

    const user = await Users.findOne({ email: 'mutaurijoe@gmail.com' });
    if (!user) { console.log('❌ User not found'); return; }
    console.log('👤 User:', user.email, '| _id:', user._id);

    const course = await Courses.findOne({ courseId: 'ccp' });
    if (!course) { console.log('❌ CCP course not found'); return; }
    console.log('📚 Course:', course.name, '| modules:', course.totalModules);

    // Delete old enrollment if any
    const del = await Enrollments.deleteMany({ userId: user._id, courseId: 'ccp' });
    if (del.deletedCount) console.log('🗑️  Removed', del.deletedCount, 'old enrollment(s)');

    // Insert new full-learning enrollment
    const now = new Date();
    const result = await Enrollments.insertOne({
      userId: user._id,
      courseId: 'ccp',
      courseName: course.name,
      courseIcon: course.icon || 'fa-certificate',
      type: 'learning',
      status: 'enrolled',
      progress: 0,
      moduleProgress: {
        completedCount: 0,
        totalModules: course.totalModules || 8,
        nextModuleName: (course.modules && course.modules[0]) ? course.modules[0].name : 'Module 1'
      },
      examAttempts: 0,
      voucherCode: 'ADMIN-GRANT',
      amountPaid: 0,
      originalPrice: course.pathPrice || course.examPrice || 0,
      createdAt: now,
      updatedAt: now
    });
    console.log('✅ Enrollment created:', result.insertedId);

    // Update counters
    const c1 = await Courses.updateOne({ _id: course._id }, { $inc: { enrolledCount: 1 } });
    const c2 = await Users.updateOne({ _id: user._id }, { $inc: { enrolledCourses: 1 } });
    console.log('📊 Counters updated: course=' + c1.modifiedCount + ' user=' + c2.modifiedCount);

    // Add $0 payment record for admin dashboard
    const p = await Payments.insertOne({
      sessionId: 'ADMIN-GRANT-' + Date.now(),
      userId: user._id,
      courseId: 'ccp',
      type: 'learning',
      originalAmount: 0,
      discountAmount: 0,
      amount: 0,
      currency: 'USD',
      voucherCode: 'ADMIN-GRANT',
      status: 'completed',
      paymentMethod: 'voucher',
      billingInfo: { firstName: user.name || 'Admin', lastName: '', email: user.email, phone: '', country: 'Zimbabwe' },
      completedAt: now,
      paidAt: now,
      createdAt: now,
      updatedAt: now
    });
    console.log('💰 Payment record added:', p.insertedId);

    console.log('\n🎉 DONE — CCP unlocked with full learning path!');
    console.log('   Refresh your browser and check the dashboard.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('   Code:', err.code);
    console.error('   Full:', err);
  } finally {
    await m.connection.close();
    console.log('\n🔌 Connection closed cleanly');
  }
}

run();
