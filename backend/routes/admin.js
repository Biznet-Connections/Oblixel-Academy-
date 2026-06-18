const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Voucher = require('../models/Voucher');
const Payment = require('../models/Payment');
const Certificate = require('../models/Certificate');

// Auth middleware inline
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'oblixel_super_secret_key_2026');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function isAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Admin access required' });
  }
}

router.use(authenticate);
router.use(isAdmin);

// ==================== STATS ====================
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalCourses, totalRevenue, pendingCertificates, activeVouchers, totalEnrollments, totalPayments] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments({ isActive: true }),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Certificate.countDocuments({ status: 'pending' }),
      Voucher.countDocuments({ active: true }),
      Enrollment.countDocuments(),
      Payment.countDocuments()
    ]);

    res.json({
      totalStudents,
      totalCourses,
      totalRevenue: totalRevenue.length > 0 ? Math.round(totalRevenue[0].total * 100) / 100 : 0,
      pendingCertificates,
      activeVouchers,
      totalEnrollments,
      totalPayments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COURSES CRUD ====================
router.get('/courses', async (req, res) => {
  try {
    const ncp = await Course.findOne({ courseId: 'ncp' });
    const ccp = await Course.findOne({ courseId: 'ccp' });
    const others = await Course.find({
      courseId: { $nin: ['ncp', 'ccp', 'ona', 'onp'] },
      isActive: true
    }).sort({ displayOrder: 1, enrolledCount: -1 });

    const courses = [ncp, ccp, ...others].filter(Boolean).map(c => ({
      id: c.courseId,
      name: c.name,
      examPrice: c.examPrice,
      pathPrice: c.pathPrice,
      icon: c.icon,
      category: c.category,
      enrolledCount: c.enrolledCount,
      totalModules: c.totalModules,
      modules: c.modules,
      displayOrder: c.displayOrder || 0
    }));

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COURSE REORDER (DRAG & DROP) ====================
router.put('/courses/reorder', async (req, res) => {
  const { courses } = req.body; // [{ courseId: 'ncp', displayOrder: 0 }, { courseId: 'ccp', displayOrder: 1 }, ...]

  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'Courses array is required' });
  }

  try {
    const updatePromises = courses.map(course =>
      Course.findOneAndUpdate(
        { courseId: course.courseId },
        { displayOrder: course.displayOrder },
        { returnDocument: 'after' } // Fixed deprecation
      )
    );

    await Promise.all(updatePromises);

    console.log(`[ADMIN] Courses reordered by ${req.user.email}`);
    res.json({ success: true, message: 'Course order saved successfully' });
  } catch (error) {
    console.error('[ADMIN] Reorder error:', error.message);
    res.status(500).json({ error: 'Failed to save course order' });
  }
});

router.post('/courses', async (req, res) => {
  const { name, description, examPrice, pathPrice, icon, category, color } = req.body;
  if (!name || !examPrice) return res.status(400).json({ error: 'Name and exam price required' });

  try {
    // Get the highest displayOrder to put new course at the end
    const highestOrder = await Course.findOne({ isActive: true }).sort({ displayOrder: -1 });
    const newOrder = highestOrder && highestOrder.displayOrder ? highestOrder.displayOrder + 1 : 0;

    const courseId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
    const course = await Course.create({
      courseId,
      name,
      description: description || '',
      examPrice: parseFloat(examPrice),
      pathPrice: parseFloat(pathPrice) || parseFloat(examPrice) * 1.5,
      icon: icon || 'fa-certificate',
      category: category || 'Professional',
      color: color || 'purple',
      totalModules: 8,
      displayOrder: newOrder,
      modules: Array.from({ length: 8 }, (_, i) => ({
        moduleId: i + 1,
        name: `Module ${i + 1}`,
        duration: '30 min',
        quizQuestions: 10,
        videoUrl: ''
      }))
    });

    console.log(`[ADMIN] Course created: ${name} by ${req.user.email}`);
    res.json({ success: true, course: { id: course.courseId, name: course.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { courseId: req.params.id },
      { $set: req.body },
      { returnDocument: 'after' } // Fixed deprecation
    );

    if (!course) return res.status(404).json({ error: 'Course not found' });

    console.log(`[ADMIN] Course updated: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true, course: { id: course.courseId, name: course.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ courseId: req.params.id });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Clean related data
    await Promise.all([
      Enrollment.deleteMany({ courseId: req.params.id }),
      ModuleProgress.deleteMany({ courseId: req.params.id }),
      ExamQuestion.deleteMany({ courseId: req.params.id })
    ]);

    console.log(`[ADMIN] Course deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true, message: 'Course and related data deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== VOUCHERS ====================
router.get('/vouchers', async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    res.json({ vouchers });
  } catch (error) {
    res.json({ vouchers: [] });
  }
});

router.post('/vouchers', async (req, res) => {
  const { code, courseId, discountType, discountValue, maxUses, expiresAt } = req.body;
  if (!code || !discountType) return res.status(400).json({ error: 'Code and discount type required' });

  try {
    const existing = await Voucher.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Voucher code exists' });

    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      courseId: courseId || 'all',
      discountType,
      discountValue: discountValue || 0,
      maxUses: maxUses || 1,
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    console.log(`[ADMIN] Voucher created: ${voucher.code} by ${req.user.email}`);
    res.json({ success: true, voucher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/vouchers/batch', async (req, res) => {
  const { prefix, count, discountType, discountValue, courseId, maxUses, expiresAt } = req.body;
  if (!prefix || !count || count < 1 || count > 500) return res.status(400).json({ error: 'Prefix and count (1-500) required' });

  try {
    const vouchers = [];
    for (let i = 0; i < count; i++) {
      const code = `${prefix.toUpperCase()}_${(i + 1).toString().padStart(3, '0')}`;
      vouchers.push({
        code,
        courseId: courseId || 'all',
        discountType: discountType || 'percentage',
        discountValue: discountValue || 0,
        maxUses: maxUses || 1,
        usedCount: 0,
        active: true,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    await Voucher.insertMany(vouchers, { ordered: false });
    console.log(`[ADMIN] Batch: ${vouchers.length} vouchers by ${req.user.email}`);
    res.json({ success: true, message: `Created ${vouchers.length} vouchers`, vouchers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/vouchers/:id', async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    res.json({ success: true, message: 'Voucher deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USERS ====================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const enrolledCount = await Enrollment.countDocuments({ userId: u._id });
      const payments = await Payment.find({ userId: u._id, status: 'completed' });
      const totalSpent = Math.round(payments.reduce((s, p) => s + (p.amount || 0), 0) * 100) / 100;

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        enrolledCourses: enrolledCount,
        totalSpent
      };
    }));

    res.json({ users: usersWithStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId', async (req, res) => {
  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean all user data
    await Promise.all([
      Enrollment.deleteMany({ userId: req.params.userId }),
      ModuleProgress.deleteMany({ userId: req.params.userId }),
      Certificate.deleteMany({ userId: req.params.userId }),
      Payment.deleteMany({ userId: req.params.userId }),
      ExamSession.deleteMany({ userId: req.params.userId }),
      ExamAttempt.deleteMany({ userId: req.params.userId })
    ]);

    console.log(`[ADMIN] User deleted: ${user.email} by ${req.user.email}`);
    res.json({ success: true, message: `User ${user.email} deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/make-admin', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.body.userId,
      { role: 'admin' },
      { returnDocument: 'after' } // Fixed deprecation
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log(`[ADMIN] ${user.email} promoted to admin by ${req.user.email}`);
    res.json({ success: true, message: `${user.name} is now an admin`, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/remove-admin', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.body.userId,
      { role: 'student' },
      { returnDocument: 'after' } // Fixed deprecation
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log(`[ADMIN] Admin role removed from ${user.email} by ${req.user.email}`);
    res.json({ success: true, message: 'Admin role removed', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CREATE NEW ADMIN (Add Admin Modal) ====================
router.post('/add-admin', async (req, res) => {
  const { name, email, password, userId } = req.body;

  try {
    // Option 1: Promote existing user by userId
    if (userId) {
      const existingUser = await User.findByIdAndUpdate(
        userId,
        { role: 'admin' },
        { returnDocument: 'after' }
      );
      if (!existingUser) return res.status(404).json({ error: 'User not found' });
      console.log(`[ADMIN] ${existingUser.email} promoted to admin by ${req.user.email}`);
      return res.json({
        success: true,
        message: `${existingUser.name} is now an admin`,
        admin: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role }
      });
    }

    // Option 2: Create brand new admin account
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required to create a new admin' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      // Promote existing user instead
      const promoted = await User.findByIdAndUpdate(
        existingEmail._id,
        { role: 'admin' },
        { returnDocument: 'after' }
      );
      console.log(`[ADMIN] ${existingEmail.email} promoted to admin (already existed) by ${req.user.email}`);
      return res.json({
        success: true,
        message: `${promoted.name} promoted to admin (account already existed)`,
        admin: { id: promoted._id, name: promoted.name, email: promoted.email, role: promoted.role }
      });
    }

    // Create new admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      xp: 0,
      level: 1,
      streak: 0,
      totalSpent: 0
    });

    console.log(`[ADMIN] New admin created: ${newAdmin.email} by ${req.user.email}`);
    res.json({
      success: true,
      message: `Admin account created for ${name}`,
      admin: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role }
    });
  } catch (error) {
    console.error('[ADMIN] Add admin error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CERTIFICATES ====================
router.get('/pending-certificates', async (req, res) => {
  try {
    const pending = await Certificate.find({ status: 'pending' }).sort({ submittedAt: -1 });

    const withDetails = await Promise.all(pending.map(async (p) => {
      const user = await User.findById(p.userId);
      const course = await Course.findOne({ courseId: p.courseId });
      return {
        id: p._id,
        userId: p.userId,
        courseId: p.courseId,
        score: p.score,
        certificateId: p.certificateId,
        submittedAt: p.submittedAt,
        userName: user ? user.name : 'Unknown',
        userEmail: user ? user.email : 'Unknown',
        courseName: course ? course.name : 'Unknown'
      };
    }));

    res.json({ pending: withDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/certificates/approve', async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(
      req.body.pendingId,
      {
        status: 'issued',
        issuedAt: new Date()
      },
      { returnDocument: 'after' } // Fixed deprecation
    );

    if (!certificate) return res.status(404).json({ error: 'Not found' });

    // Update enrollment status
    await Enrollment.findOneAndUpdate(
      { userId: certificate.userId, courseId: certificate.courseId },
      { status: 'certified' }
    );

    console.log(`[ADMIN] Certificate approved: ${certificate.certificateId} by ${req.user.email}`);
    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/certificates/reject', async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(
      req.body.pendingId,
      {
        status: 'rejected',
        rejectionReason: req.body.reason || 'No reason provided',
        rejectedAt: new Date()
      },
      { returnDocument: 'after' } // Fixed deprecation
    );

    if (!certificate) return res.status(404).json({ error: 'Not found' });

    console.log(`[ADMIN] Certificate rejected: ${certificate.certificateId} by ${req.user.email}`);
    res.json({ success: true, message: 'Certificate rejected', certificate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FINANCE ====================
router.get('/finance', async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const [thisMonthResult, lastMonthResult, totalResult] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $exists: true } } },
        { $addFields: { month: { $month: '$completedAt' }, year: { $year: '$completedAt' } } },
        { $match: { month: thisMonth + 1, year: thisYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $exists: true } } },
        { $addFields: { month: { $month: '$completedAt' }, year: { $year: '$completedAt' } } },
        { $match: { month: lastMonth + 1, year: lastMonthYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const enrollmentsCount = await Enrollment.countDocuments();

    res.json({
      thisMonth: thisMonthResult.length > 0 ? Math.round(thisMonthResult[0].total * 100) / 100 : 0,
      lastMonth: lastMonthResult.length > 0 ? Math.round(lastMonthResult[0].total * 100) / 100 : 0,
      total: totalResult.length > 0 ? Math.round(totalResult[0].total * 100) / 100 : 0,
      paymentsCount: await Payment.countDocuments({ status: 'completed' }),
      enrollmentsCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Need these models
const ModuleProgress = require('../models/ModuleProgress');
const ExamQuestion = require('../models/ExamQuestion');
const ExamSession = require('../models/ExamSession');
const ExamAttempt = require('../models/ExamAttempt');

module.exports = router;
