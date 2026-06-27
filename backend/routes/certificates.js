const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

// ==================== GET MY CERTIFICATES ====================
router.get('/my-certificates', authenticate, async (req, res) => {
  try {
    const certificates = await Certificate.find({ 
      userId: req.user._id || req.user.id,
      status: 'issued'
    }).sort({ createdAt: -1 });

    const user = await User.findById(req.user._id || req.user.id);
    const studentName = user ? (user.fullName || user.name) : 'Student';

    const formattedEarned = certificates.map(c => ({
      certificateId: c.certificateId,
      courseName: c.courseName,
      courseId: c.courseId,
      score: c.score,
      issueDate: c.issueDate || c.issuedAt || c.submittedAt,
      expiryDate: c.expiryDate || null,
      verifyUrl: c.verifyUrl || '',
      issuedAt: c.issuedAt || c.submittedAt,
      status: c.status,
      studentName: c.studentName || studentName,
      studentFirstName: c.studentFirstName || '',
      studentLastName: c.studentLastName || ''
    }));

    console.log(`[CERTS] ${studentName} has ${formattedEarned.length} certificates`);

    res.json({
      earned: formattedEarned,
      pending: []
    });
  } catch (error) {
    console.error('[CERTS] Error:', error.message);
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

// ==================== GET CERTIFICATE DATA FOR DOWNLOAD ====================
router.get('/:certificateId/download', authenticate, async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
      userId: req.user._id || req.user.id
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const user = await User.findById(req.user._id || req.user.id);

    let template = await CertificateTemplate.findOne();
    if (!template) {
      template = await CertificateTemplate.create({});
    }

    // Format dates for display
    const issueDateFormatted = certificate.issueDate
      ? new Date(certificate.issueDate).toLocaleDateString('en-US', {
          day: 'numeric', month: 'long', year: 'numeric'
        })
      : new Date(certificate.issuedAt || certificate.createdAt || new Date()).toLocaleDateString('en-US', {
          day: 'numeric', month: 'long', year: 'numeric'
        });

    const expiryDateFormatted = certificate.expiryDate
      ? new Date(certificate.expiryDate).toLocaleDateString('en-US', {
          day: 'numeric', month: 'long', year: 'numeric'
        })
      : '';

    // Get verify URL from certificate or build from template
    const verifyUrlBase = template.verifyUrlBase || 'oblixel-academy-platform.onrender.com/verify/';
    const verifyUrl = certificate.verifyUrl || (verifyUrlBase + certificate.certificateId);

    // Use certificate's stored name, or fall back to user's current name
    const studentName = certificate.studentName || (user ? (user.fullName || user.name) : 'Student');

    console.log(`[CERTS] Certificate download data sent for ${studentName} - ${certificate.certificateId}`);
    console.log(`[CERTS]   issueDate: ${issueDateFormatted}`);
    console.log(`[CERTS]   expiryDate: ${expiryDateFormatted || '(none)'}`);
    console.log(`[CERTS]   verifyUrl: ${verifyUrl}`);

    res.json({
      certificate: {
        studentName: studentName,
        courseName: certificate.courseName,
        certificateId: certificate.certificateId,
        issueDate: issueDateFormatted,
        expiryDate: expiryDateFormatted,
        score: certificate.score,
        verifyUrl: verifyUrl
      },
      template: {
        imageUrl: template.templateImage,
        positions: template.positions,
        styles: template.styles,
        signatureImage: template.signatureImage || '',
        customTexts: template.customTexts || []
      }
    });
  } catch (error) {
    console.error('[CERTS] Download error:', error.message);
    res.status(500).json({ error: 'Failed to get certificate data' });
  }
});

// ==================== VERIFY CERTIFICATE (PUBLIC - NO AUTH REQUIRED) ====================
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId
    });

    if (!certificate) {
      return res.json({
        valid: false,
        message: 'Certificate not found in our system.'
      });
    }

    // Check if expired
    let isExpired = false;
    if (certificate.expiryDate) {
      const now = new Date();
      const expiryDate = new Date(certificate.expiryDate);
      now.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      isExpired = expiryDate < now;
    }

    const user = await User.findById(certificate.userId);

    res.json({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName || (user ? (user.fullName || user.name) : 'Unknown'),
        courseName: certificate.courseName,
        score: certificate.score,
        issueDate: certificate.issueDate || certificate.issuedAt || certificate.submittedAt,
        expiryDate: certificate.expiryDate || null,
        isExpired: isExpired,
        status: isExpired ? 'expired' : certificate.status
      }
    });
  } catch (error) {
    console.error('[CERTS] Verify error:', error.message);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

module.exports = router;
