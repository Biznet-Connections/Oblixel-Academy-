const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Voucher = require('../models/Voucher');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const linkwa = require('../utils/linkwa');

// ==================== HELPERS ====================

async function enrollUser({ userId, course, type, amountPaid, originalPrice, voucherCode, paymentMethod }) {
  // Idempotency — don't double-enroll
  const existing = await Enrollment.findOne({ userId, courseId: course.courseId });
  if (existing) return { alreadyEnrolled: true, enrollment: existing };

  const enrollment = await Enrollment.create({
    userId,
    courseId: course.courseId,
    courseName: course.name,
    courseIcon: course.icon,
    type,
    status: 'enrolled',
    progress: 0,
    moduleProgress: {
      completedCount: 0,
      totalModules: course.totalModules,
      nextModuleName: course.modules.length > 0 ? course.modules[0].name : 'Module 1',
    },
    examAttempts: 0,
    voucherCode: voucherCode || null,
    amountPaid: Math.round(amountPaid * 100) / 100,
    originalPrice: Math.round(originalPrice * 100) / 100,
  });

  await Course.findOneAndUpdate(
    { courseId: course.courseId },
    { $inc: { enrolledCount: 1 } }
  );

  await User.findByIdAndUpdate(userId, {
    $inc: { totalSpent: amountPaid, enrolledCourses: 1 }
  });

  console.log(`[PAYMENT] ✅ Enrolled via ${paymentMethod}: user ${userId} → ${course.name} ($${amountPaid})`);
  return { alreadyEnrolled: false, enrollment };
}

// ==================== VALIDATE VOUCHER (unchanged) ====================
router.post('/validate-voucher', async (req, res) => {
  const { code, courseId } = req.body;
  if (!code) return res.status(400).json({ error: 'Voucher code is required' });

  try {
    const voucher = await Voucher.findOne({
      code: code.toUpperCase(),
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    });

    if (!voucher) return res.json({ valid: false, message: 'Invalid voucher code.' });
    if (voucher.usedCount >= voucher.maxUses)
      return res.json({ valid: false, message: 'This voucher has already been used.' });

    if (courseId && voucher.courseId !== 'all' && voucher.courseId !== courseId.toLowerCase()) {
      const vc = await Course.findOne({ courseId: voucher.courseId });
      return res.json({ valid: false, message: `This voucher is only valid for ${vc ? vc.name : voucher.courseId}.` });
    }

    let discountText = '';
    if (voucher.discountType === 'free') discountText = '🎉 FREE enrollment!';
    else if (voucher.discountType === 'percentage') discountText = `${voucher.discountValue}% off`;
    else if (voucher.discountType === 'fixed') discountText = `$${voucher.discountValue} off`;

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
      message: `✅ Voucher applied! ${discountText}`
    });
  } catch (error) {
    console.error('[VOUCHER] Validation error:', error.message);
    res.status(500).json({ error: 'Failed to validate voucher' });
  }
});

// ==================== CREATE CHECKOUT (VOUCHER AUTO-ENROLL) ====================
router.post('/create-checkout', authenticate, async (req, res) => {
  const { courseId, type, voucherCode, billingInfo } = req.body;
  const userId = req.user._id;

  if (!courseId || !type) return res.status(400).json({ error: 'Course ID and type are required' });

  try {
    const course = await Course.findOne({ courseId: courseId.toLowerCase(), isActive: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Already enrolled', alreadyEnrolled: true, courseId });

    let amount = type === 'exam_only' ? course.examPrice : (course.pathPrice || course.examPrice);
    let discount = 0;
    let voucherInfo = null;

    if (!voucherCode) {
      return res.status(400).json({
        error: 'No voucher code provided. Use Linkwa payment instead.',
        useLinkwa: true
      });
    }

    const voucher = await Voucher.findOne({
      code: voucherCode.toUpperCase(),
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    });

    if (!voucher) return res.status(400).json({ error: 'Invalid or expired voucher code.' });
    if (voucher.usedCount >= voucher.maxUses)
      return res.status(400).json({ error: 'This voucher has already been used.', code: 'VOUCHER_EXHAUSTED' });

    if (voucher.courseId !== 'all' && voucher.courseId !== courseId.toLowerCase()) {
      const vc = await Course.findOne({ courseId: voucher.courseId });
      return res.status(400).json({ error: `This voucher is only valid for ${vc ? vc.name : voucher.courseId}.` });
    }

    if (voucher.discountType === 'free') discount = amount;
    else if (voucher.discountType === 'percentage') discount = Math.round((amount * (voucher.discountValue / 100)) * 100) / 100;
    else if (voucher.discountType === 'fixed') discount = Math.min(voucher.discountValue, amount);

    voucherInfo = voucher;

    const finalAmount = Math.round(Math.max(0, amount - discount) * 100) / 100;
    const sessionId = uuidv4();

    await Payment.create({
      sessionId,
      userId,
      courseId: courseId.toLowerCase(),
      type,
      originalAmount: Math.round(amount * 100) / 100,
      discountAmount: Math.round(discount * 100) / 100,
      amount: finalAmount,
      voucherCode: voucherCode.toUpperCase(),
      voucherDiscountType: voucherInfo.discountType,
      voucherDiscountValue: voucherInfo.discountValue,
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

    const { enrollment } = await enrollUser({
      userId, course, type,
      amountPaid: finalAmount,
      originalPrice: amount,
      voucherCode: voucherCode.toUpperCase(),
      paymentMethod: 'voucher'
    });

    // Atomic voucher usage
    await Voucher.findOneAndUpdate(
      { code: voucherCode.toUpperCase(), $expr: { $lt: ['$usedCount', '$maxUses'] } },
      { $inc: { usedCount: 1 } }
    );
    const uv = await Voucher.findOne({ code: voucherCode.toUpperCase() });
    if (uv && uv.usedCount >= uv.maxUses) { uv.active = false; await uv.save(); }

    res.json({
      success: true,
      autoEnrolled: true,
      message: `🎉 Voucher applied! You've been enrolled in ${course.name}.`,
      sessionId,
      amount: finalAmount,
      originalAmount: amount,
      discount,
      courseName: course.name,
      courseId,
      enrollmentId: enrollment._id
    });
  } catch (error) {
    console.error('[PAYMENT] Create checkout error:', error.message);
    res.status(500).json({ error: 'Failed to create checkout: ' + error.message });
  }
});

// ==================== INITIATE LINKWA PAYMENT ====================
router.post('/initiate', authenticate, async (req, res) => {
  console.log('[INITIATE] Request from', req.user.email, 'body:', JSON.stringify(req.body));
  const { courseId, type, phone } = req.body;
  const userId = req.user._id;

  if (!courseId || !type) return res.status(400).json({ error: 'Course ID and type are required' });

  try {
    const course = await Course.findOne({ courseId: courseId.toLowerCase(), isActive: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Already enrolled', alreadyEnrolled: true, courseId });

    const amount = type === 'exam_only' ? course.examPrice : (course.pathPrice || course.examPrice);
    const sessionId = `OMX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const appUrl = process.env.APP_URL || 'http://localhost:5001';
    const returnUrl = `${appUrl}/payment-complete?reference=${sessionId}`;

    console.log('[INITIATE] Calling Linkwa with amount:', amount, 'for course:', course.courseId);
    const link = await linkwa.createPaymentLink({
      amount,
      name: `${course.name} — ${type === 'exam_only' ? 'Exam Only' : 'Full Learning Path'}`,
      description: `Enrollment for ${course.name} (${course.abbreviation || course.courseId})`,
      returnUrl,
      phone: phone || req.user.phone,
      email: req.user.email,
    });

    if (!link.success) {
      return res.status(400).json({ error: link.message || 'Linkwa payment failed to initiate' });
    }

    const payment = await Payment.create({
      sessionId,
      userId,
      courseId: courseId.toLowerCase(),
      type,
      originalAmount: Math.round(amount * 100) / 100,
      discountAmount: 0,
      amount: Math.round(amount * 100) / 100,
      status: 'pending',
      paymentMethod: 'linkwa',
      linkwaCheckoutUrl: link.checkoutUrl,
      linkwaExternalLinkId: link.externalPaymentLinkId,
      linkwaShortUrl: link.shortUrl || null,
      billingInfo: {
        firstName: req.user.name || 'Student',
        lastName: '',
        email: req.user.email,
        phone: phone || req.user.phone || '',
        country: 'Zimbabwe'
      }
    });

    console.log(`[PAYMENT] 🔗 Linkwa initiated: ${sessionId} for ${course.name} ($${amount})`);

    res.json({
      success: true,
      sessionId,
      checkoutUrl: link.checkoutUrl,
      amount,
      courseName: course.name,
      status: 'pending'
    });
  } catch (error) {
    console.error('[PAYMENT] Initiate error:', error.message);
    res.status(500).json({ error: 'Failed to initiate payment: ' + error.message });
  }
});

// ==================== CHECK PAYMENT STATUS ====================
router.get('/status/:sessionId', async (req, res) => {
  console.log('[STATUS] Checking:', req.params.sessionId, 'query:', JSON.stringify(req.query));
  const { sessionId } = req.params;
  const { short_url, payment_reference } = req.query;

  try {
    let currentUser = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select('-password');
      } catch (e) { /* ignore */ }
    }

    const payment = await Payment.findOne({ sessionId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const hasLinkwaProof = short_url && payment_reference;
    const isOwner = currentUser && String(payment.userId) === String(currentUser._id);
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isOwner && !isAdmin && !hasLinkwaProof) {
      return res.status(403).json({ error: 'Not authorized to view this payment' });
    }

    // Already settled?
    if (payment.status === 'completed' || payment.status === 'failed') {
      return res.json({
        sessionId: payment.sessionId,
        status: payment.status,
        amount: payment.amount,
        courseId: payment.courseId,
        paidAt: payment.paidAt || payment.completedAt,
        courseName: (await Course.findOne({ courseId: payment.courseId }))?.name
      });
    }

    // Verify with Linkwa
    const sUrl = short_url || payment.linkwaShortUrl;
    const pRef = payment_reference || payment.linkwaPaymentReference;

    if (sUrl && pRef) {
      const result = await linkwa.getPaymentStatus(sUrl, pRef);
      if (result.success && (result.status === 'PAID' || result.status === 'paid')) {
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.completedAt = new Date();
        payment.linkwaShortUrl = sUrl;
        payment.linkwaPaymentReference = pRef;
        await payment.save();

        const course = await Course.findOne({ courseId: payment.courseId });
        if (course) {
          await enrollUser({
            userId: payment.userId,
            course,
            type: payment.type,
            amountPaid: payment.amount,
            originalPrice: payment.originalAmount,
            voucherCode: null,
            paymentMethod: 'linkwa'
          });
        }
      }
    }

    const course = await Course.findOne({ courseId: payment.courseId });
    res.json({
      sessionId: payment.sessionId,
      status: payment.status,
      amount: payment.amount,
      courseId: payment.courseId,
      courseName: course?.name,
      paidAt: payment.paidAt
    });
  } catch (error) {
    console.error('[PAYMENT] Status error:', error.message);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ==================== LINKWA WEBHOOK ====================
// NOTE: mounted in app.js BEFORE express.json() with raw body
async function handleLinkwaWebhook(rawBodyBuffer, signature) {
  const raw = rawBodyBuffer.toString('utf8');

  if (!linkwa.verifySignature(raw, signature)) {
    console.warn('[WEBHOOK] ❌ Invalid signature');
    return { ok: false, status: 401, message: 'Invalid signature' };
  }

  let body;
  try { body = JSON.parse(raw); } catch (e) { return { ok: false, status: 400, message: 'Invalid JSON' }; }

  console.log('[WEBHOOK] 📩 Linkwa event:', body.status, body.external_payment_link_id);

  if (body.status !== 'PAID' && body.status !== 'paid') {
    return { ok: true, status: 200, message: 'Not a paid event' };
  }

  const externalId = body.external_payment_link_id;
  if (!externalId) return { ok: true, status: 200, message: 'No external link id' };

  const payment = await Payment.findOne({ linkwaExternalLinkId: externalId });
  if (!payment) return { ok: true, status: 200, message: 'No matching payment' };
  if (payment.status === 'completed') return { ok: true, status: 200, message: 'Already processed' };

  if (Number(body.amount) !== Number(payment.amount)) {
    payment.status = 'failed';
    payment.failureReason = `Amount mismatch: expected ${payment.amount}, got ${body.amount}`;
    await payment.save();
    console.error('[WEBHOOK] ❌ Amount mismatch for', payment.sessionId);
    return { ok: true, status: 200, message: 'Amount mismatch' };
  }

  payment.status = 'completed';
  payment.paidAt = new Date();
  payment.completedAt = new Date();
  payment.webhookPayload = body;
  if (body.short_url) payment.linkwaShortUrl = body.short_url;
  if (body.payment_reference) payment.linkwaPaymentReference = body.payment_reference;
  await payment.save();

  const course = await Course.findOne({ courseId: payment.courseId });
  if (course) {
    await enrollUser({
      userId: payment.userId,
      course,
      type: payment.type,
      amountPaid: payment.amount,
      originalPrice: payment.originalAmount,
      voucherCode: null,
      paymentMethod: 'linkwa'
    });
  }

  console.log('[WEBHOOK] ✅ Enrolled user via Linkwa webhook');
  return { ok: true, status: 200, message: 'Processed' };
}

// ==================== PAYMENT HISTORY ====================
router.get('/my-payments', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user._id,
      status: { $in: ['completed', 'paid'] }
    }).sort({ completedAt: -1 });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payment history' });
  }
});

module.exports = router;
module.exports.handleLinkwaWebhook = handleLinkwaWebhook;
