const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Voucher = require('../models/Voucher');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');

// ==================== CREATE CHECKOUT (VOUCHER AUTO-ENROLL) ====================
router.post('/create-checkout', authenticate, async (req, res) => {
  const { courseId, type, voucherCode, billingInfo } = req.body;
  const userId = req.user._id;

  if (!courseId || !type) {
    return res.status(400).json({ error: 'Course ID and type are required' });
  }

  try {
    const course = await Course.findOne({ courseId: courseId.toLowerCase(), isActive: true });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (existingEnrollment) {
      return res.status(400).json({
        error: 'Already enrolled',
        message: 'You are already enrolled. Redirecting to course dashboard.',
        courseId: courseId,
        alreadyEnrolled: true
      });
    }

    let amount = type === 'exam_only' ? course.examPrice : course.pathPrice;
    let discount = 0;
    let voucherInfo = null;

    // Apply voucher if provided
    if (voucherCode) {
      const voucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),
        active: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (!voucher) {
        return res.status(400).json({ error: 'Invalid or expired voucher code.' });
      }

      if (voucher.usedCount >= voucher.maxUses) {
        return res.status(400).json({
          error: 'This voucher has already been used. Each code works only ONCE.',
          code: 'VOUCHER_EXHAUSTED'
        });
      }

      if (voucher.courseId !== 'all' && voucher.courseId !== courseId.toLowerCase()) {
        const voucherCourse = await Course.findOne({ courseId: voucher.courseId });
        return res.status(400).json({
          error: `This voucher is only valid for ${voucherCourse ? voucherCourse.name : voucher.courseId}.`
        });
      }

      if (voucher.discountType === 'free') {
        discount = amount;
      } else if (voucher.discountType === 'percentage') {
        discount = Math.round((amount * (voucher.discountValue / 100)) * 100) / 100;
      } else if (voucher.discountType === 'fixed') {
        discount = Math.min(voucher.discountValue, amount);
      }

      voucherInfo = voucher;
    } else {
      // No voucher - payment methods coming soon
      return res.status(400).json({
        error: 'Payment methods coming soon. Please use a valid voucher code to enroll.',
        comingSoon: true
      });
    }

    const finalAmount = Math.round(Math.max(0, amount - discount) * 100) / 100;
    const sessionId = uuidv4();

    // Create payment record
    await Payment.create({
      sessionId,
      userId,
      courseId: courseId.toLowerCase(),
      type,
      originalAmount: Math.round(amount * 100) / 100,
      discountAmount: Math.round(discount * 100) / 100,
      amount: finalAmount,
      voucherCode: voucherCode ? voucherCode.toUpperCase() : null,
      voucherDiscountType: voucherInfo ? voucherInfo.discountType : null,
      voucherDiscountValue: voucherInfo ? voucherInfo.discountValue : null,
      status: 'completed',
      paymentMethod: 'voucher',
      billingInfo: billingInfo || {
        firstName: req.user.name || 'Student',
        lastName: '',
        email: req.user.email,
        phone: '',
        country: 'Zimbabwe'
      },
      completedAt: new Date()
    });

    // Create enrollment (all modules start uncompleted)
    const enrollment = await Enrollment.create({
      userId,
      courseId: courseId.toLowerCase(),
      courseName: course.name,
      courseIcon: course.icon,
      type,
      status: 'enrolled',
      progress: 0,
      moduleProgress: {
        completedCount: 0,
        totalModules: course.totalModules,
        nextModuleName: course.modules.length > 0 ? course.modules[0].name : 'Module 1'
      },
      examAttempts: 0,
      voucherCode: voucherCode ? voucherCode.toUpperCase() : null,
      amountPaid: finalAmount,
      originalPrice: Math.round(amount * 100) / 100
    });

    // Update voucher usage atomically
    if (voucherInfo) {
      await Voucher.findOneAndUpdate(
        {
          code: voucherCode.toUpperCase(),
          $expr: { $lt: ['$usedCount', '$maxUses'] }
        },
        {
          $inc: { usedCount: 1 }
        }
      );

      // Deactivate if max uses reached
      const updatedVoucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });
      if (updatedVoucher && updatedVoucher.usedCount >= updatedVoucher.maxUses) {
        updatedVoucher.active = false;
        await updatedVoucher.save();
      }
    }

    // Update user totals
    await User.findByIdAndUpdate(userId, {
      $inc: {
        totalSpent: finalAmount,
        enrolledCourses: 1
      }
    });

    // Update course enrolled count
    await Course.findOneAndUpdate(
      { courseId: courseId.toLowerCase() },
      { $inc: { enrolledCount: 1 } }
    );

    console.log(`[PAYMENT] ✅ Voucher auto-enroll: ${req.user.email} → ${course.name} (${voucherCode}) - $${finalAmount}`);

    res.json({
      success: true,
      autoEnrolled: true,
      message: `🎉 Voucher applied! You've been enrolled in ${course.name}.`,
      sessionId,
      amount: finalAmount,
      originalAmount: Math.round(amount * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      courseName: course.name,
      courseId: courseId,
      enrollmentId: enrollment._id
    });
  } catch (error) {
    console.error('[PAYMENT] Create checkout error:', error.message);
    res.status(500).json({ error: 'Failed to create checkout: ' + error.message });
  }
});

// ==================== CONFIRM PAYMENT (FUTURE USE) ====================
router.post('/confirm-payment/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const payment = await Payment.findOne({ sessionId, userId: req.user._id });

    if (!payment) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    res.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ==================== VALIDATE VOUCHER ====================
router.post('/validate-voucher', async (req, res) => {
  const { code, courseId } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Voucher code is required' });
  }

  try {
    const voucher = await Voucher.findOne({
      code: code.toUpperCase(),
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (!voucher) {
      return res.json({ valid: false, message: 'Invalid voucher code. Please check and try again.' });
    }

    if (voucher.usedCount >= voucher.maxUses) {
      return res.json({
        valid: false,
        message: 'This voucher has already been used. Each code works only ONCE.'
      });
    }

    if (courseId && voucher.courseId !== 'all' && voucher.courseId !== courseId.toLowerCase()) {
      const voucherCourse = await Course.findOne({ courseId: voucher.courseId });
      return res.json({
        valid: false,
        message: `This voucher is only valid for ${voucherCourse ? voucherCourse.name : voucher.courseId}.`
      });
    }

    let discountText = '';
    if (voucher.discountType === 'free') {
      discountText = '🎉 FREE enrollment!';
    } else if (voucher.discountType === 'percentage') {
      discountText = `${voucher.discountValue}% off`;
    } else if (voucher.discountType === 'fixed') {
      discountText = `$${voucher.discountValue} off`;
    }

    res.json({
      valid: true,
      voucher: {
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        courseId: voucher.courseId,
        maxUses: voucher.maxUses,
        usedCount: voucher.usedCount
      },
      message: `✅ Voucher applied! ${discountText} — Enrolling now...`
    });
  } catch (error) {
    console.error('[VOUCHER] Validation error:', error.message);
    res.status(500).json({ error: 'Failed to validate voucher' });
  }
});

// ==================== GET PAYMENT HISTORY ====================
router.get('/my-payments', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user._id,
      status: 'completed'
    }).sort({ completedAt: -1 });

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payment history' });
  }
});

module.exports = router;
