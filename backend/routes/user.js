const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const ModuleProgress = require('../models/ModuleProgress');
const Certificate = require('../models/Certificate');
const Payment = require('../models/Payment');
const Course = require('../models/Course');

// ==================== GET USER PROFILE ====================
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get enrollments with progress
    const enrollments = await Enrollment.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedCount = await ModuleProgress.countDocuments({
          userId: req.user._id,
          courseId: enrollment.courseId,
          completed: true
        });

        const course = await Course.findOne({ courseId: enrollment.courseId });
        const totalModules = course ? course.totalModules : enrollment.moduleProgress?.totalModules || 8;

        let nextModuleName = null;
        if (completedCount < totalModules && course) {
          const nextModule = course.modules.find(m => m.moduleId === completedCount + 1);
          nextModuleName = nextModule ? nextModule.name : `Module ${completedCount + 1}`;
        }

        return {
          courseId: enrollment.courseId,
          courseName: enrollment.courseName,
          courseIcon: enrollment.courseIcon,
          type: enrollment.type,
          status: enrollment.status,
          progress: totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0,
          moduleProgress: {
            completedCount,
            totalModules,
            nextModuleName: nextModuleName || (completedCount >= totalModules ? 'All modules completed!' : 'Module 1')
          },
          examAttempts: enrollment.examAttempts,
          score: enrollment.score,
          enrolledAt: enrollment.createdAt
        };
      })
    );

    // Get certificates
    const pendingCerts = await Certificate.countDocuments({
      userId: req.user._id,
      status: 'pending'
    });

    const earnedCerts = await Certificate.countDocuments({
      userId: req.user._id,
      status: 'issued'
    });

    // Calculate total spent
    const payments = await Payment.find({
      userId: req.user._id,
      status: 'completed'
    });

    const totalSpent = Math.round(
      payments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100
    ) / 100;

    // Update user's totalSpent if it differs
    if (user.totalSpent !== totalSpent) {
      user.totalSpent = totalSpent;
      await user.save();
    }

    console.log(`[USER] Profile for ${user.email}: ${enrollmentsWithProgress.length} enrollments, $${totalSpent} spent`);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        totalSpent: totalSpent,
        enrolledCourses: user.enrolledCourses,
        phone: user.phone,
        createdAt: user.createdAt,
        hasProvidedLegalName: user.hasProvidedLegalName || false,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || ''
      },
      stats: {
        enrolledCourses: enrollmentsWithProgress.length,
        pendingCertificates: pendingCerts,
        earnedCertificates: earnedCerts,
        totalSpent: totalSpent
      },
      enrollments: enrollmentsWithProgress,
      pending: pendingCerts,
      earned: earnedCerts
    });
  } catch (error) {
    console.error('[USER] Profile error:', error.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'avatar', 'phone'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        hasProvidedLegalName: user.hasProvidedLegalName || false,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==================== DELETE ACCOUNT ====================
router.delete('/account', authenticate, async (req, res) => {
  const { confirmDelete } = req.body;

  if (confirmDelete !== 'DELETE') {
    return res.status(400).json({ error: 'Type DELETE to confirm account deletion' });
  }

  try {
    const userId = req.user._id;

    // Delete all user data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Enrollment.deleteMany({ userId }),
      ModuleProgress.deleteMany({ userId }),
      Certificate.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      ExamSession.deleteMany({ userId }),
      ExamAttempt.deleteMany({ userId })
    ]);

    console.log(`[USER] Account deleted: ${req.user.email}`);

    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error('[USER] Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Need these models for delete
const ExamSession = require('../models/ExamSession');
const ExamAttempt = require('../models/ExamAttempt');

module.exports = router;
