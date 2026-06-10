const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/jsonDB');

// ==================== AUTHENTICATION & ADMIN CHECK ====================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'oblixel_super_secret_key_2026');
    const users = readJSON('users.json') || [];
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(authenticate);
router.use(isAdmin);

// ==================== STATS DASHBOARD ====================
router.get('/stats', async (req, res) => {
  try {
    const users = readJSON('users.json') || [];
    const coursesData = readJSON('courses.json') || { courses: [] };
    const courses = coursesData.courses || coursesData || [];
    const enrollments = readJSON('enrollments.json') || [];
    const payments = readJSON('payments.json') || [];
    let vouchers = readJSON('vouchers.json') || [];
    const certificates = readJSON('certificates.json') || { pending: [], earned: [] };
    
    if (!Array.isArray(vouchers)) vouchers = [];
    
    const pendingCertificates = Array.isArray(certificates.pending) ? certificates.pending.length : 0;
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalStudents = users.filter(u => u.role === 'student').length;
    const activeVouchers = vouchers.filter(v => v.active !== false).length;
    
    res.json({
      totalStudents,
      totalCourses: courses.length,
      totalRevenue,
      pendingCertificates,
      activeVouchers,
      totalEnrollments: enrollments.length,
      totalPayments: payments.length
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    res.status(500).json({ error: 'Failed to load stats: ' + error.message });
  }
});

// ==================== COURSE MANAGEMENT ====================
router.get('/courses', async (req, res) => {
  try {
    const coursesData = readJSON('courses.json');
    const courses = coursesData.courses || coursesData || [];
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

router.post('/courses', async (req, res) => {
  const { name, description, examPrice, pathPrice, icon, category, color } = req.body;
  if (!name || !examPrice) {
    return res.status(400).json({ error: 'Name and exam price are required' });
  }
  try {
    const coursesData = readJSON('courses.json');
    let courses = coursesData.courses || coursesData || [];
    const newCourse = {
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name,
      description: description || `Professional certification in ${name}`,
      examPrice: parseFloat(examPrice),
      pathPrice: parseFloat(pathPrice) || parseFloat(examPrice) * 1.5,
      icon: icon || 'fa-certificate',
      category: category || 'Professional',
      color: color || 'purple',
      enrolledCount: 0,
      createdAt: new Date().toISOString()
    };
    courses.push(newCourse);
    writeJSON('courses.json', { courses });
    res.json({ success: true, course: newCourse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const coursesData = readJSON('courses.json');
    let courses = coursesData.courses || coursesData || [];
    const courseIndex = courses.findIndex(c => c.id === id);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }
    courses[courseIndex] = { ...courses[courseIndex], ...updates };
    writeJSON('courses.json', { courses });
    res.json({ success: true, course: courses[courseIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const coursesData = readJSON('courses.json');
    let courses = coursesData.courses || coursesData || [];
    const filteredCourses = courses.filter(c => c.id !== id);
    if (filteredCourses.length === courses.length) {
      return res.status(404).json({ error: 'Course not found' });
    }
    writeJSON('courses.json', { courses: filteredCourses });
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ==================== VOUCHER MANAGEMENT (WITH BATCH CREATE) ====================
router.get('/vouchers', async (req, res) => {
  try {
    let vouchers = readJSON('vouchers.json') || [];
    if (!Array.isArray(vouchers)) vouchers = [];
    res.json({ vouchers });
  } catch (error) {
    res.json({ vouchers: [] });
  }
});

// Single voucher creation
router.post('/vouchers', async (req, res) => {
  const { code, courseId, discountType, discountValue, maxUses, expiresAt } = req.body;
  if (!code || !discountType) {
    return res.status(400).json({ error: 'Code and discount type are required' });
  }
  try {
    let vouchers = readJSON('vouchers.json') || [];
    if (!Array.isArray(vouchers)) vouchers = [];
    const existingVoucher = vouchers.find(v => v.code === code);
    if (existingVoucher) {
      return res.status(400).json({ error: 'Voucher code already exists' });
    }
    const { v4: uuidv4 } = require('uuid');
    const newVoucher = {
      id: uuidv4(),
      code: code.toUpperCase(),
      courseId: courseId || 'all',
      discountType,
      discountValue: discountValue || 0,
      maxUses: maxUses || 1,
      usedCount: 0,
      active: true,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    vouchers.push(newVoucher);
    writeJSON('vouchers.json', vouchers);
    res.json({ success: true, voucher: newVoucher });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

// BATCH CREATE VOUCHERS
router.post('/vouchers/batch', async (req, res) => {
  const { prefix, count, discountType, discountValue, courseId, maxUses, expiresAt } = req.body;
  
  if (!prefix || !count || !discountType) {
    return res.status(400).json({ error: 'Prefix, count, and discount type are required' });
  }
  
  if (count < 1 || count > 500) {
    return res.status(400).json({ error: 'Count must be between 1 and 500' });
  }
  
  try {
    let vouchers = readJSON('vouchers.json') || [];
    if (!Array.isArray(vouchers)) vouchers = [];
    const { v4: uuidv4 } = require('uuid');
    const newVouchers = [];
    
    for (let i = 0; i < count; i++) {
      const suffix = (i + 1).toString().padStart(3, '0');
      const code = `${prefix.toUpperCase()}_${suffix}`;
      
      // Check if code already exists, add random suffix if needed
      let finalCode = code;
      let counter = 1;
      while (vouchers.find(v => v.code === finalCode) || newVouchers.find(v => v.code === finalCode)) {
        finalCode = `${code}_${counter}`;
        counter++;
      }
      
      newVouchers.push({
        id: uuidv4(),
        code: finalCode,
        courseId: courseId || 'all',
        discountType,
        discountValue: discountValue || 0,
        maxUses: maxUses || 1,
        usedCount: 0,
        active: true,
        expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      });
    }
    
    const allVouchers = [...vouchers, ...newVouchers];
    writeJSON('vouchers.json', allVouchers);
    
    res.json({ 
      success: true, 
      message: `Created ${newVouchers.length} vouchers`,
      vouchers: newVouchers 
    });
  } catch (error) {
    console.error('[ADMIN] Batch voucher error:', error);
    res.status(500).json({ error: 'Failed to create batch vouchers' });
  }
});

router.delete('/vouchers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let vouchers = readJSON('vouchers.json') || [];
    if (!Array.isArray(vouchers)) vouchers = [];
    const filteredVouchers = vouchers.filter(v => v.id !== id);
    if (filteredVouchers.length === vouchers.length) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    writeJSON('vouchers.json', filteredVouchers);
    res.json({ success: true, message: 'Voucher deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete voucher' });
  }
});

// ==================== USER MANAGEMENT (WITH DELETE) ====================
router.get('/users', async (req, res) => {
  try {
    const users = readJSON('users.json') || [];
    const enrollments = readJSON('enrollments.json') || [];
    const payments = readJSON('payments.json') || [];

    const usersWithStats = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      enrolledCourses: enrollments.filter(e => e.userId === user.id).length,
      totalSpent: payments.filter(p => p.userId === user.id).reduce((sum, p) => sum + (p.amount || 0), 0)
    }));
    res.json({ users: usersWithStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// DELETE USER - Complete removal
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Prevent admin from deleting themselves
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  try {
    const users = readJSON('users.json') || [];
    const enrollments = readJSON('enrollments.json') || [];
    const certificates = readJSON('certificates.json') || { pending: [], earned: [] };
    const payments = readJSON('payments.json') || [];
    const examAttempts = readJSON('exam_attempts.json') || [];
    const chatHistory = readJSON('chat_history.json') || [];
    
    const userExists = users.find(u => u.id === userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove user from all collections
    const filteredUsers = users.filter(u => u.id !== userId);
    const filteredEnrollments = enrollments.filter(e => e.userId !== userId);
    const filteredPending = (certificates.pending || []).filter(p => p.userId !== userId);
    const filteredEarned = (certificates.earned || []).filter(e => e.userId !== userId);
    const filteredPayments = payments.filter(p => p.userId !== userId);
    const filteredExamAttempts = examAttempts.filter(e => e.userId !== userId);
    const filteredChatHistory = chatHistory.filter(c => c.userId !== userId);
    
    writeJSON('users.json', filteredUsers);
    writeJSON('enrollments.json', filteredEnrollments);
    writeJSON('certificates.json', { pending: filteredPending, earned: filteredEarned });
    writeJSON('payments.json', filteredPayments);
    writeJSON('exam_attempts.json', filteredExamAttempts);
    writeJSON('chat_history.json', filteredChatHistory);
    
    console.log(`[ADMIN] User deleted: ${userExists.email} (${userId}) by ${req.user.email}`);
    res.json({ success: true, message: `User ${userExists.email} has been deleted` });
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/make-admin', async (req, res) => {
  const { userId } = req.body;
  try {
    const users = readJSON('users.json') || [];
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    users[userIndex].role = 'admin';
    writeJSON('users.json', users);
    res.json({ success: true, message: 'User is now an admin' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to make admin' });
  }
});

router.post('/remove-admin', async (req, res) => {
  const { userId } = req.body;
  try {
    const users = readJSON('users.json') || [];
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }
    users[userIndex].role = 'student';
    writeJSON('users.json', users);
    res.json({ success: true, message: 'Admin role removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

// ==================== CERTIFICATE MANAGEMENT ====================
router.get('/pending-certificates', async (req, res) => {
  try {
    const certificates = readJSON('certificates.json') || { pending: [], earned: [] };
    const users = readJSON('users.json') || [];
    const coursesData = readJSON('courses.json') || { courses: [] };
    const courses = coursesData.courses || coursesData || [];
    const pending = certificates.pending || [];
    const pendingWithDetails = pending.map(p => {
      const user = users.find(u => u.id === p.userId);
      const course = courses.find(c => c.id === p.courseId);
      return {
        ...p,
        userEmail: user?.email || 'Unknown',
        userName: user?.name || 'Unknown',
        courseName: course?.name || 'Unknown Course'
      };
    });
    res.json({ pending: pendingWithDetails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending certificates' });
  }
});

router.post('/certificates/approve', async (req, res) => {
  const { pendingId } = req.body;
  try {
    const certificates = readJSON('certificates.json') || { pending: [], earned: [] };
    const pendingList = certificates.pending || [];
    const pendingIndex = pendingList.findIndex(p => p.id === pendingId);
    if (pendingIndex === -1) {
      return res.status(404).json({ error: 'Pending certificate not found' });
    }
    const approved = { ...pendingList[pendingIndex] };
    approved.issuedAt = new Date().toISOString();
    approved.certificateId = `OBX-${approved.courseId.toUpperCase()}-${Date.now()}`;
    const earnedList = certificates.earned || [];
    earnedList.push(approved);
    pendingList.splice(pendingIndex, 1);
    writeJSON('certificates.json', { pending: pendingList, earned: earnedList });
    res.json({ success: true, message: 'Certificate approved', certificate: approved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve certificate' });
  }
});

router.post('/certificates/reject', async (req, res) => {
  const { pendingId, reason } = req.body;
  try {
    const certificates = readJSON('certificates.json') || { pending: [], earned: [] };
    const pendingList = certificates.pending || [];
    const pendingIndex = pendingList.findIndex(p => p.id === pendingId);
    if (pendingIndex === -1) {
      return res.status(404).json({ error: 'Pending certificate not found' });
    }
    pendingList.splice(pendingIndex, 1);
    writeJSON('certificates.json', { pending: pendingList, earned: certificates.earned || [] });
    res.json({ success: true, message: 'Certificate rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject certificate' });
  }
});

// ==================== FINANCE SUMMARY (REAL DATA) ====================
router.get('/finance', async (req, res) => {
  try {
    const payments = readJSON('payments.json') || [];
    const vouchers = readJSON('vouchers.json') || [];
    const enrollments = readJSON('enrollments.json') || [];
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    
    const thisMonthPayments = payments.filter(p => {
      const date = new Date(p.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    
    const lastMonthPayments = payments.filter(p => {
      const date = new Date(p.createdAt);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
    
    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate discount impact from vouchers
    let totalDiscountApplied = 0;
    enrollments.forEach(e => {
      if (e.voucherCode) {
        const voucher = vouchers.find(v => v.code === e.voucherCode);
        if (voucher) {
          if (voucher.discountType === 'percentage') {
            totalDiscountApplied += (e.originalPrice || 0) * (voucher.discountValue / 100);
          } else if (voucher.discountType === 'fixed') {
            totalDiscountApplied += voucher.discountValue;
          } else if (voucher.discountType === 'free') {
            totalDiscountApplied += (e.originalPrice || 0);
          }
        }
      }
    });
    
    res.json({
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      total: totalRevenue,
      discountImpact: totalDiscountApplied,
      netRevenue: totalRevenue - totalDiscountApplied,
      paymentsCount: payments.length,
      enrollmentsCount: enrollments.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load finance data' });
  }
});

// ==================== ENROLLMENT MANAGEMENT ====================
router.get('/enrollments', async (req, res) => {
  try {
    const enrollments = readJSON('enrollments.json') || [];
    const users = readJSON('users.json') || [];
    const coursesData = readJSON('courses.json') || { courses: [] };
    const courses = coursesData.courses || coursesData || [];
    const enrollmentsWithDetails = enrollments.map(enrollment => {
      const user = users.find(u => u.id === enrollment.userId);
      const course = courses.find(c => c.id === enrollment.courseId);
      return {
        ...enrollment,
        userEmail: user?.email || 'Unknown',
        userName: user?.name || 'Unknown',
        courseName: course?.name || 'Unknown Course'
      };
    });
    res.json({ enrollments: enrollmentsWithDetails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});

module.exports = router;
