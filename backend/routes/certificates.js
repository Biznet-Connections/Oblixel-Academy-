const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');

// ==================== GET MY CERTIFICATES ====================
router.get('/my-certificates', authenticate, async (req, res) => {
  try {
    const [pending, earned] = await Promise.all([
      Certificate.find({ userId: req.user._id, status: 'pending' }).sort({ submittedAt: -1 }),
      Certificate.find({ userId: req.user._id, status: 'issued' }).sort({ issuedAt: -1 })
    ]);

    // Add course names
    const withCourseNames = async (certs) => {
      return Promise.all(certs.map(async (cert) => {
        const course = await Course.findOne({ courseId: cert.courseId });
        return {
          id: cert._id,
          courseId: cert.courseId,
          courseName: course ? course.name : cert.courseName || 'Unknown Course',
          certificateId: cert.certificateId,
          score: cert.score,
          status: cert.status,
          submittedAt: cert.submittedAt,
          issuedAt: cert.issuedAt,
          type: cert.type
        };
      }));
    };

    res.json({
      pending: await withCourseNames(pending),
      earned: await withCourseNames(earned)
    });
  } catch (error) {
    console.error('[CERTS] Error:', error.message);
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

// ==================== VERIFY CERTIFICATE (PUBLIC) ====================
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
      status: 'issued'
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const user = await User.findById(certificate.userId);
    const course = await Course.findOne({ courseId: certificate.courseId });

    res.json({
      verified: true,
      certificate: {
        id: certificate.certificateId,
        studentName: user ? user.name : 'Unknown',
        courseName: course ? course.name : certificate.courseName,
        score: certificate.score,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

module.exports = router;
