const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Voucher = require('../models/Voucher');
const Payment = require('../models/Payment');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const ModuleProgress = require('../models/ModuleProgress');
const ExamQuestion = require('../models/ExamQuestion');
const ExamSession = require('../models/ExamSession');
const ExamAttempt = require('../models/ExamAttempt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const user = await User.findById(req.user.id || req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Admin access required' });
  }
}

// Check main admin
async function isMainAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user || !user.isMainAdmin) {
      return res.status(403).json({ error: 'Main admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Main admin access required' });
  }
}

// Check privilege middleware
function requirePrivilege(privilege) {
  return async function(req, res, next) {
    try {
      const user = await User.findById(req.user.id || req.user._id);
      if (!user) return res.status(403).json({ error: 'Access denied' });
      if (user.isMainAdmin) return next();
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
      if (!user.adminPrivileges || !user.adminPrivileges[privilege]) {
        return res.status(403).json({ error: `You don't have permission: ${privilege}` });
      }
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Access denied' });
    }
  };
}

router.use(authenticate);
router.use(isAdmin);

// Configure multer for certificate template uploads
const certificateStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'certificate-template-' + uniqueSuffix + ext);
  }
});

const certificateUpload = multer({
  storage: certificateStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

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
    console.error('[ADMIN] Stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET MY ADMIN PRIVILEGES ====================
router.get('/my-privileges', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      isMainAdmin: user.isMainAdmin,
      role: user.role,
      privileges: user.adminPrivileges,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESET REVENUE (MAIN ADMIN ONLY) ====================
router.post('/reset-revenue', isMainAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET') {
      return res.status(400).json({ error: 'Type RESET to confirm' });
    }
    
    const result = await Payment.deleteMany({ status: 'completed' });
    
    console.log(`[ADMIN] Revenue reset by main admin ${req.user.email}. Deleted ${result.deletedCount} payment records.`);
    
    res.json({ 
      success: true, 
      message: `Revenue reset successfully. ${result.deletedCount} payment records deleted.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('[ADMIN] Reset revenue error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESET ENROLLMENTS (MAIN ADMIN ONLY) ====================
router.post('/reset-enrollments', isMainAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET') {
      return res.status(400).json({ error: 'Type RESET to confirm' });
    }
    
    const enrollmentResult = await Enrollment.deleteMany({});
    const progressResult = await ModuleProgress.deleteMany({});
    const examResult = await ExamAttempt.deleteMany({});
    const examSessionResult = await ExamSession.deleteMany({});
    
    // Reset user enrolled course counts
    await User.updateMany({}, { enrolledCourses: 0 });
    
    console.log(`[ADMIN] All enrollments reset by main admin ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: 'All enrollments and progress reset.',
      enrollmentsDeleted: enrollmentResult.deletedCount,
      progressDeleted: progressResult.deletedCount,
      examsDeleted: examResult.deletedCount + examSessionResult.deletedCount
    });
  } catch (error) {
    console.error('[ADMIN] Reset enrollments error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESET CERTIFICATES (MAIN ADMIN ONLY) ====================
router.post('/reset-certificates', isMainAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET') {
      return res.status(400).json({ error: 'Type RESET to confirm' });
    }
    
    const result = await Certificate.deleteMany({});
    
    console.log(`[ADMIN] All certificates reset by main admin ${req.user.email}. Deleted ${result.deletedCount} certificates.`);
    
    res.json({ 
      success: true, 
      message: `All certificates deleted. ${result.deletedCount} records removed.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('[ADMIN] Reset certificates error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REMOVE ADMIN (DEMOTE TO STUDENT - MAIN ADMIN ONLY) ====================
router.post('/remove-admin', isMainAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot demote the main admin' });
    
    user.role = 'student';
    user.adminPrivileges = {
      manageCourses: true,
      manageVouchers: true,
      manageUsers: true,
      manageAdmins: false,
      approveCertificates: true,
      resetRevenue: false,
      systemSettings: false,
      viewFinance: true
    };
    await user.save();
    
    console.log(`[ADMIN] ${user.email} demoted from admin to student by main admin ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: `${user.name || user.email} is no longer an admin.` 
    });
  } catch (error) {
    console.error('[ADMIN] Remove admin error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UPDATE ADMIN PRIVILEGES (MAIN ADMIN ONLY) ====================
router.post('/update-admin-privileges', isMainAdmin, async (req, res) => {
  try {
    const { userId, privileges } = req.body;
    if (!userId || !privileges) return res.status(400).json({ error: 'User ID and privileges required' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot modify main admin privileges' });
    if (user.role !== 'admin') return res.status(400).json({ error: 'User is not an admin' });
    
    // Merge privileges
    user.adminPrivileges = {
      manageCourses: privileges.manageCourses !== undefined ? privileges.manageCourses : user.adminPrivileges.manageCourses,
      manageVouchers: privileges.manageVouchers !== undefined ? privileges.manageVouchers : user.adminPrivileges.manageVouchers,
      manageUsers: privileges.manageUsers !== undefined ? privileges.manageUsers : user.adminPrivileges.manageUsers,
      manageAdmins: privileges.manageAdmins !== undefined ? privileges.manageAdmins : user.adminPrivileges.manageAdmins,
      approveCertificates: privileges.approveCertificates !== undefined ? privileges.approveCertificates : user.adminPrivileges.approveCertificates,
      resetRevenue: privileges.resetRevenue !== undefined ? privileges.resetRevenue : user.adminPrivileges.resetRevenue,
      systemSettings: privileges.systemSettings !== undefined ? privileges.systemSettings : user.adminPrivileges.systemSettings,
      viewFinance: privileges.viewFinance !== undefined ? privileges.viewFinance : user.adminPrivileges.viewFinance
    };
    await user.save();
    
    console.log(`[ADMIN] Privileges updated for ${user.email} by main admin ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: `Privileges updated for ${user.name || user.email}`,
      privileges: user.adminPrivileges
    });
  } catch (error) {
    console.error('[ADMIN] Update privileges error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET ALL COURSES ====================
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
      price: c.price || c.examPrice || 0,
      examPrice: c.price || c.examPrice || 0,
      pathPrice: c.price || c.examPrice || 0,
      icon: c.icon,
      category: c.category,
      enrolledCount: c.enrolledCount || 0,
      totalModules: c.totalModules || 8,
      modules: c.modules || [],
      displayOrder: c.displayOrder || 0
    }));

    console.log('[ADMIN] Courses fetched:', courses.length);
    res.json(courses);
  } catch (error) {
    console.error('[ADMIN] Courses error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COURSE REORDER ====================
router.put('/courses/reorder', async (req, res) => {
  const { courses } = req.body;
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'Courses array is required' });
  }
  try {
    const updatePromises = courses.map(course =>
      Course.findOneAndUpdate(
        { courseId: course.courseId },
        { displayOrder: course.displayOrder },
        { returnDocument: 'after' }
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

// ==================== CREATE COURSE ====================
router.post('/courses', async (req, res) => {
  const { name, description, price, icon, category, color } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and course fee are required' });
  try {
    const highestOrder = await Course.findOne({ isActive: true }).sort({ displayOrder: -1 });
    const newOrder = highestOrder && highestOrder.displayOrder ? highestOrder.displayOrder + 1 : 0;
    const courseId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
    const course = await Course.create({
      courseId, name, description: description || '', price: parseFloat(price),
      examPrice: parseFloat(price), pathPrice: parseFloat(price),
      icon: icon || 'fa-certificate', category: category || 'Professional', color: color || 'purple',
      totalModules: 8, displayOrder: newOrder, isActive: true, enrolledCount: 0,
      modules: Array.from({ length: 8 }, (_, i) => ({ moduleId: i + 1, name: `Module ${i + 1}`, duration: '30 min', quizQuestions: 10, videoUrl: '' }))
    });
    console.log(`[ADMIN] Course created: ${name} by ${req.user.email}`);
    res.json({ success: true, course: { id: course.courseId, name: course.name } });
  } catch (error) {
    console.error('[ADMIN] Create course error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UPDATE COURSE ====================
router.put('/courses/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price) { updates.examPrice = parseFloat(updates.price); updates.pathPrice = parseFloat(updates.price); }
    const course = await Course.findOneAndUpdate({ courseId: req.params.id }, { $set: updates }, { returnDocument: 'after' });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    console.log(`[ADMIN] Course updated: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true, course: { id: course.courseId, name: course.name, price: course.price || course.examPrice || 0 } });
  } catch (error) {
    console.error('[ADMIN] Update course error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DELETE COURSE ====================
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ courseId: req.params.id });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await Promise.all([Enrollment.deleteMany({ courseId: req.params.id }), ModuleProgress.deleteMany({ courseId: req.params.id }), ExamQuestion.deleteMany({ courseId: req.params.id })]);
    console.log(`[ADMIN] Course deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true, message: 'Course and related data deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== VOUCHERS ====================
router.get('/vouchers', async (req, res) => {
  try { const vouchers = await Voucher.find().sort({ createdAt: -1 }); res.json({ vouchers }); }
  catch (error) { res.json({ vouchers: [] }); }
});
router.post('/vouchers', async (req, res) => {
  const { code, courseId, discountType, discountValue, maxUses, expiresAt } = req.body;
  if (!code || !discountType) return res.status(400).json({ error: 'Code and discount type required' });
  try {
    const existing = await Voucher.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Voucher code exists' });
    const voucher = await Voucher.create({ code: code.toUpperCase(), courseId: courseId || 'all', discountType, discountValue: discountValue || 0, maxUses: maxUses || 1, expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    console.log(`[ADMIN] Voucher created: ${voucher.code} by ${req.user.email}`);
    res.json({ success: true, voucher });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/vouchers/batch', async (req, res) => {
  const { prefix, count, discountType, discountValue, courseId, maxUses, expiresAt } = req.body;
  if (!prefix || !count || count < 1 || count > 500) return res.status(400).json({ error: 'Prefix and count (1-500) required' });
  try {
    const vouchers = [];
    for (let i = 0; i < count; i++) { vouchers.push({ code: `${prefix.toUpperCase()}_${(i + 1).toString().padStart(3, '0')}`, courseId: courseId || 'all', discountType: discountType || 'percentage', discountValue: discountValue || 0, maxUses: maxUses || 1, usedCount: 0, active: true, expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }); }
    await Voucher.insertMany(vouchers, { ordered: false });
    console.log(`[ADMIN] Batch: ${vouchers.length} vouchers by ${req.user.email}`);
    res.json({ success: true, message: `Created ${vouchers.length} vouchers`, vouchers });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/vouchers/:id', async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    res.json({ success: true, message: 'Voucher deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
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
        isMainAdmin: u.isMainAdmin,
        adminPrivileges: u.adminPrivileges,
        createdAt: u.createdAt,
        enrolledCourses: enrolledCount,
        totalSpent
      };
    }));
    console.log(`[ADMIN] Users fetched: ${usersWithStats.length}`);
    res.json({ users: usersWithStats });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/users/:userId', async (req, res) => {
  if (req.params.userId === req.user._id.toString()) return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    const targetUser = await User.findById(req.params.userId);
    if (targetUser && targetUser.isMainAdmin) {
      return res.status(403).json({ error: 'Cannot delete the main admin' });
    }
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await Promise.all([Enrollment.deleteMany({ userId: req.params.userId }), ModuleProgress.deleteMany({ userId: req.params.userId }), Certificate.deleteMany({ userId: req.params.userId }), Payment.deleteMany({ userId: req.params.userId }), ExamSession.deleteMany({ userId: req.params.userId }), ExamAttempt.deleteMany({ userId: req.params.userId })]);
    console.log(`[ADMIN] User deleted: ${user.email} by ${req.user.email}`);
    res.json({ success: true, message: `User ${user.email} deleted` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/make-admin', async (req, res) => {
  try {
    // Only main admin can make others admin
    const currentUser = await User.findById(req.user._id || req.user.id);
    if (!currentUser.isMainAdmin) {
      return res.status(403).json({ error: 'Only the main admin can add admins' });
    }
    
    const { userId, privileges } = req.body;
    
    const user = await User.findById(userId || req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.role = 'admin';
    
    // If privileges provided, use them
    if (privileges) {
      user.adminPrivileges = {
        manageCourses: privileges.manageCourses !== undefined ? privileges.manageCourses : true,
        manageVouchers: privileges.manageVouchers !== undefined ? privileges.manageVouchers : true,
        manageUsers: privileges.manageUsers !== undefined ? privileges.manageUsers : true,
        manageAdmins: privileges.manageAdmins !== undefined ? privileges.manageAdmins : false,
        approveCertificates: privileges.approveCertificates !== undefined ? privileges.approveCertificates : true,
        resetRevenue: privileges.resetRevenue !== undefined ? privileges.resetRevenue : false,
        systemSettings: privileges.systemSettings !== undefined ? privileges.systemSettings : false,
        viewFinance: privileges.viewFinance !== undefined ? privileges.viewFinance : true
      };
    }
    
    await user.save();
    
    console.log(`[ADMIN] ${user.email} made admin by main admin ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: `${user.name} is now an admin`, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        isMainAdmin: user.isMainAdmin,
        adminPrivileges: user.adminPrivileges
      } 
    });
  } catch (error) { 
    console.error('[ADMIN] Make admin error:', error.message);
    res.status(500).json({ error: error.message }); 
  }
});

router.post('/remove-admin', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id || req.user.id);
    if (!currentUser.isMainAdmin) {
      return res.status(403).json({ error: 'Only the main admin can remove admins' });
    }
    
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot demote the main admin' });
    
    user.role = 'student';
    user.adminPrivileges = {
      manageCourses: true, manageVouchers: true, manageUsers: true,
      manageAdmins: false, approveCertificates: true,
      resetRevenue: false, systemSettings: false, viewFinance: true
    };
    await user.save();
    
    console.log(`[ADMIN] ${user.email} demoted from admin by main admin ${req.user.email}`);
    
    res.json({ success: true, message: `${user.name} is no longer an admin` });
  } catch (error) { 
    console.error('[ADMIN] Remove admin error:', error.message);
    res.status(500).json({ error: error.message }); 
  }
});

router.post('/add-admin', async (req, res) => {
  const { name, email, password, userId, privileges } = req.body;
  try {
    const currentUser = await User.findById(req.user._id || req.user.id);
    if (!currentUser.isMainAdmin) {
      return res.status(403).json({ error: 'Only the main admin can add admins' });
    }
    
    if (userId) {
      const existingUser = await User.findById(userId);
      if (!existingUser) return res.status(404).json({ error: 'User not found' });
      
      existingUser.role = 'admin';
      if (privileges) {
        existingUser.adminPrivileges = {
          manageCourses: privileges.manageCourses !== undefined ? privileges.manageCourses : true,
          manageVouchers: privileges.manageVouchers !== undefined ? privileges.manageVouchers : true,
          manageUsers: privileges.manageUsers !== undefined ? privileges.manageUsers : true,
          manageAdmins: privileges.manageAdmins !== undefined ? privileges.manageAdmins : false,
          approveCertificates: privileges.approveCertificates !== undefined ? privileges.approveCertificates : true,
          resetRevenue: privileges.resetRevenue !== undefined ? privileges.resetRevenue : false,
          systemSettings: privileges.systemSettings !== undefined ? privileges.systemSettings : false,
          viewFinance: privileges.viewFinance !== undefined ? privileges.viewFinance : true
        };
      }
      await existingUser.save();
      
      return res.json({ 
        success: true, 
        message: `${existingUser.name} is now an admin`, 
        admin: { 
          id: existingUser._id, 
          name: existingUser.name, 
          email: existingUser.email, 
          role: existingUser.role,
          isMainAdmin: existingUser.isMainAdmin,
          adminPrivileges: existingUser.adminPrivileges
        } 
      });
    }
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      existingEmail.role = 'admin';
      if (privileges) {
        existingEmail.adminPrivileges = {
          manageCourses: privileges.manageCourses !== undefined ? privileges.manageCourses : true,
          manageVouchers: privileges.manageVouchers !== undefined ? privileges.manageVouchers : true,
          manageUsers: privileges.manageUsers !== undefined ? privileges.manageUsers : true,
          manageAdmins: privileges.manageAdmins !== undefined ? privileges.manageAdmins : false,
          approveCertificates: privileges.approveCertificates !== undefined ? privileges.approveCertificates : true,
          resetRevenue: privileges.resetRevenue !== undefined ? privileges.resetRevenue : false,
          systemSettings: privileges.systemSettings !== undefined ? privileges.systemSettings : false,
          viewFinance: privileges.viewFinance !== undefined ? privileges.viewFinance : true
        };
      }
      await existingEmail.save();
      return res.json({ 
        success: true, 
        message: `${existingEmail.name} promoted to admin (account already existed)`, 
        admin: { 
          id: existingEmail._id, 
          name: existingEmail.name, 
          email: existingEmail.email, 
          role: existingEmail.role,
          isMainAdmin: existingEmail.isMainAdmin,
          adminPrivileges: existingEmail.adminPrivileges
        } 
      });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminPrivilegesData = privileges || {
      manageCourses: true, manageVouchers: true, manageUsers: true,
      manageAdmins: false, approveCertificates: true,
      resetRevenue: false, systemSettings: false, viewFinance: true
    };
    
    const newAdmin = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hashedPassword, 
      role: 'admin', 
      xp: 0, 
      level: 1, 
      streak: 0, 
      totalSpent: 0,
      adminPrivileges: adminPrivilegesData
    });
    
    res.json({ 
      success: true, 
      message: `Admin account created for ${name}`, 
      admin: { 
        id: newAdmin._id, 
        name: newAdmin.name, 
        email: newAdmin.email, 
        role: newAdmin.role,
        isMainAdmin: newAdmin.isMainAdmin,
        adminPrivileges: newAdmin.adminPrivileges
      } 
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
      return { id: p._id, userId: p.userId, courseId: p.courseId, score: p.score, certificateId: p.certificateId, submittedAt: p.submittedAt, userName: user ? user.name : 'Unknown', userEmail: user ? user.email : 'Unknown', courseName: course ? course.name : 'Unknown' };
    }));
    res.json({ pending: withDetails });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/certificates/approve', async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(req.body.pendingId, { status: 'issued', issuedAt: new Date() }, { returnDocument: 'after' });
    if (!certificate) return res.status(404).json({ error: 'Not found' });
    await Enrollment.findOneAndUpdate({ userId: certificate.userId, courseId: certificate.courseId }, { status: 'certified' });
    res.json({ success: true, certificate });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/certificates/reject', async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(req.body.pendingId, { status: 'rejected', rejectionReason: req.body.reason || 'No reason provided', rejectedAt: new Date() }, { returnDocument: 'after' });
    if (!certificate) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, message: 'Certificate rejected', certificate });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== CERTIFICATE TEMPLATE SETTINGS ====================
router.get('/certificate-template', async (req, res) => {
  try {
    let template = await CertificateTemplate.findOne();
    if (!template) { template = await CertificateTemplate.create({}); }
    res.json({ template });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Upload certificate template from gallery
router.post('/certificate-template/upload', certificateUpload.single('template'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const imageUrl = '/uploads/certificates/' + req.file.filename;
    let template = await CertificateTemplate.findOne();
    if (!template) { template = await CertificateTemplate.create({ templateImage: imageUrl }); }
    else { template.templateImage = imageUrl; template.updatedAt = new Date(); await template.save(); }
    console.log(`[ADMIN] Certificate template uploaded by ${req.user.email}: ${imageUrl}`);
    res.json({ success: true, imageUrl: imageUrl, message: 'Template uploaded successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Delete certificate template (reset to default)
router.delete('/certificate-template', async (req, res) => {
  try {
    let template = await CertificateTemplate.findOne();
    if (template) {
      if (template.templateImage && template.templateImage.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', '..', 'frontend', template.templateImage);
        if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
      }
      template.templateImage = '/images/certificate-template.png';
      template.signatureImage = '';
      template.updatedAt = new Date();
      await template.save();
    }
    console.log(`[ADMIN] Certificate template reset by ${req.user.email}`);
    res.json({ success: true, message: 'Template removed. Using default.', template });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update template image URL
router.put('/certificate-template/image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });
    let template = await CertificateTemplate.findOne();
    if (!template) { template = await CertificateTemplate.create({ templateImage: imageUrl }); }
    else { template.templateImage = imageUrl; template.updatedAt = new Date(); await template.save(); }
    res.json({ success: true, template });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update template positions and styles
router.put('/certificate-template/settings', async (req, res) => {
  try {
    const { positions, styles, signatureImage } = req.body;
    let template = await CertificateTemplate.findOne();
    if (!template) { 
      template = await CertificateTemplate.create({ 
        positions: positions || {}, 
        styles: styles || {},
        signatureImage: signatureImage || ''
      }); 
    } else {
      if (positions) { template.positions = { ...template.positions.toObject(), ...positions }; }
      if (styles) { template.styles = { ...template.styles.toObject(), ...styles }; }
      if (signatureImage !== undefined) { template.signatureImage = signatureImage; }
      template.updatedAt = new Date();
      await template.save();
    }
    res.json({ success: true, template });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== FINANCE ====================
router.get('/finance', async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth(); const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const [thisMonthResult, lastMonthResult, totalResult] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'completed', completedAt: { $exists: true } } }, { $addFields: { month: { $month: '$completedAt' }, year: { $year: '$completedAt' } } }, { $match: { month: thisMonth + 1, year: thisYear } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed', completedAt: { $exists: true } } }, { $addFields: { month: { $month: '$completedAt' }, year: { $year: '$completedAt' } } }, { $match: { month: lastMonth + 1, year: lastMonthYear } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    res.json({
      thisMonth: thisMonthResult.length > 0 ? Math.round(thisMonthResult[0].total * 100) / 100 : 0,
      lastMonth: lastMonthResult.length > 0 ? Math.round(lastMonthResult[0].total * 100) / 100 : 0,
      total: totalResult.length > 0 ? Math.round(totalResult[0].total * 100) / 100 : 0,
      paymentsCount: await Payment.countDocuments({ status: 'completed' }),
      enrollmentsCount: await Enrollment.countDocuments()
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
