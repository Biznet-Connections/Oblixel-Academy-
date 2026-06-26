const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');

// ==================== GET MY CERTIFICATES ====================
router.get('/my-certificates', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    const studentName = user ? (user.fullName || user.name) : (req.user.name || 'Student');

    const earned = await Certificate.find({ 
      userId: req.user._id || req.user.id, 
      status: 'issued' 
    }).sort({ issuedAt: -1 });

    const formattedEarned = earned.map(c => ({
      id: c._id,
      certificateId: c.certificateId,
      courseName: c.courseName,
      courseId: c.courseId,
      score: c.score,
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

    const issueDate = certificate.issuedAt
      ? new Date(certificate.issuedAt).toLocaleDateString('en-US', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : new Date().toLocaleDateString('en-US', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });

    // Use certificate's stored name, or fall back to user's current name
    const studentName = certificate.studentName || (user ? (user.fullName || user.name) : 'Student');

    console.log(`[CERTS] Certificate download data sent for ${studentName} - ${certificate.certificateId}`);

    res.json({
      certificate: {
        studentName: studentName,
        courseName: certificate.courseName,
        certificateId: certificate.certificateId,
        issueDate: issueDate,
        score: certificate.score
      },
      template: {
        imageUrl: template.templateImage,
        positions: template.positions,
        styles: template.styles
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

    const user = await User.findById(certificate.userId);

    res.json({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName || (user ? (user.fullName || user.name) : 'Unknown'),
        courseName: certificate.courseName,
        score: certificate.score,
        issuedAt: certificate.issuedAt || certificate.submittedAt,
        status: certificate.status
      }
    });
  } catch (error) {
    console.error('[CERTS] Verify error:', error.message);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

module.exports = router;
