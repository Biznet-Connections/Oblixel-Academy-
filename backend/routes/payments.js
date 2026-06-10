const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON } = require('../utils/jsonDB');

// Create checkout session
router.post('/create-checkout', authenticate, async (req, res) => {
  const { courseId, type, voucherCode, billingInfo } = req.body;
  
  if (!courseId || !type) {
    return res.status(400).json({ error: 'Course ID and type are required' });
  }
  
  try {
    const coursesData = readJSON('courses.json');
    const courses = coursesData.courses || coursesData || [];
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    let amount = type === 'exam_only' ? course.examPrice : course.pathPrice;
    let discount = 0;
    let voucherInfo = null;
    
    // Apply voucher if provided
    if (voucherCode) {
      const vouchers = readJSON('vouchers.json') || [];
      const voucher = vouchers.find(v => v.code === voucherCode && v.active);
      
      if (voucher) {
        const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < new Date();
        const hasUsesLeft = voucher.usedCount < (voucher.maxUses || 1);
        const appliesToCourse = voucher.courseId === 'all' || voucher.courseId === courseId;
        
        if (!isExpired && hasUsesLeft && appliesToCourse) {
          if (voucher.discountType === 'free') {
            discount = amount;
          } else if (voucher.discountType === 'percentage') {
            discount = amount * (voucher.discountValue / 100);
          } else if (voucher.discountType === 'fixed') {
            discount = voucher.discountValue;
          }
          voucherInfo = voucher;
        }
      }
    }
    
    const finalAmount = Math.max(0, amount - discount);
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    
    // Create payment record
    const payments = readJSON('payments.json') || [];
    payments.push({
      id: uuidv4(),
      sessionId,
      userId: req.user.id,
      courseId,
      type,
      originalAmount: amount,
      discountAmount: discount,
      amount: finalAmount,
      voucherCode: voucherCode || null,
      status: 'pending',
      billingInfo,
      createdAt: new Date().toISOString()
    });
    
    writeJSON('payments.json', payments);
    
    res.json({
      sessionId,
      amount: finalAmount,
      originalAmount: amount,
      discount,
      courseName: course.name
    });
  } catch (error) {
    console.error('[PAYMENT] Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

// Confirm payment
router.post('/confirm-payment/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const { paymentMethod, billingInfo } = req.body;
  
  try {
    const payments = readJSON('payments.json') || [];
    const paymentIndex = payments.findIndex(p => p.sessionId === sessionId);
    
    if (paymentIndex === -1) {
      return res.status(404).json({ error: 'Payment session not found' });
    }
    
    const payment = payments[paymentIndex];
    
    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed' });
    }
    
    // Update payment status
    payments[paymentIndex].status = 'completed';
    payments[paymentIndex].paymentMethod = paymentMethod;
    payments[paymentIndex].completedAt = new Date().toISOString();
    if (billingInfo) payments[paymentIndex].billingInfo = { ...payment.billingInfo, ...billingInfo };
    
    writeJSON('payments.json', payments);
    
    // Create enrollment
    const enrollments = readJSON('enrollments.json') || [];
    const { v4: uuidv4 } = require('uuid');
    
    enrollments.push({
      id: uuidv4(),
      userId: req.user.id,
      courseId: payment.courseId,
      type: payment.type,
      status: 'enrolled',
      enrolledAt: new Date().toISOString(),
      progress: 0,
      moduleProgress: [],
      examAttempts: 0,
      voucherCode: payment.voucherCode,
      amountPaid: payment.amount
    });
    
    writeJSON('enrollments.json', enrollments);
    
    // Update voucher usage count if voucher was used
    if (payment.voucherCode) {
      const vouchers = readJSON('vouchers.json') || [];
      const voucherIndex = vouchers.findIndex(v => v.code === payment.voucherCode);
      if (voucherIndex !== -1) {
        vouchers[voucherIndex].usedCount += 1;
        writeJSON('vouchers.json', vouchers);
      }
    }
    
    // Update user's total spent
    const users = readJSON('users.json') || [];
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex !== -1) {
      users[userIndex].totalSpent = (users[userIndex].totalSpent || 0) + payment.amount;
      writeJSON('users.json', users);
    }
    
    res.json({
      success: true,
      message: 'Payment confirmed and enrollment created',
      enrollmentId: enrollments[enrollments.length - 1].id
    });
  } catch (error) {
    console.error('[PAYMENT] Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Validate voucher code
router.post('/validate-voucher', async (req, res) => {
  const { code, courseId } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Voucher code is required' });
  }
  
  try {
    const vouchers = readJSON('vouchers.json') || [];
    const voucher = vouchers.find(v => v.code === code.toUpperCase() && v.active);
    
    if (!voucher) {
      return res.json({ valid: false, message: 'Invalid voucher code' });
    }
    
    const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < new Date();
    if (isExpired) {
      return res.json({ valid: false, message: 'Voucher has expired' });
    }
    
    const hasUsesLeft = voucher.usedCount < (voucher.maxUses || 1);
    if (!hasUsesLeft) {
      return res.json({ valid: false, message: 'Voucher has reached maximum uses' });
    }
    
    const appliesToCourse = voucher.courseId === 'all' || voucher.courseId === courseId;
    if (!appliesToCourse && courseId) {
      return res.json({ valid: false, message: 'Voucher does not apply to this course' });
    }
    
    let discountText = '';
    if (voucher.discountType === 'free') {
      discountText = 'FREE';
    } else if (voucher.discountType === 'percentage') {
      discountText = `${voucher.discountValue}% off`;
    } else {
      discountText = `$${voucher.discountValue} off`;
    }
    
    res.json({
      valid: true,
      voucher,
      message: `✅ Voucher applied! ${discountText}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate voucher' });
  }
});

// Get user payment history
router.get('/my-payments', authenticate, async (req, res) => {
  try {
    const payments = readJSON('payments.json') || [];
    const userPayments = payments.filter(p => p.userId === req.user.id && p.status === 'completed');
    res.json({ payments: userPayments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payment history' });
  }
});

module.exports = router;
