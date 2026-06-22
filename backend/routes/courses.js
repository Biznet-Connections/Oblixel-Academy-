const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ModuleProgress = require('../models/ModuleProgress');
const authenticate = require('../middleware/auth');

// ==================== GET ALL COURSES ====================
router.get('/', async (req, res) => {
  try {
    const ncpCourse = await Course.findOne({ courseId: 'ncp' });
    const ccpCourse = await Course.findOne({ courseId: 'ccp' });
    const otherCourses = await Course.find({
      courseId: { $nin: ['ncp', 'ccp', 'ona', 'onp'] },
      isActive: true
    }).sort({ displayOrder: 1, enrolledCount: -1 });

    const sortedCourses = [ncpCourse, ccpCourse, ...otherCourses].filter(Boolean);

    const courses = sortedCourses.map(c => ({
      id: c.courseId,
      name: c.name,
      abbreviation: c.abbreviation,
      level: c.level,
      description: c.description,
      price: c.price || c.examPrice || 0,
      examPrice: c.price || c.examPrice || 0,
      pathPrice: c.price || c.examPrice || 0,
      icon: c.icon,
      category: c.category,
      color: c.color,
      enrolledCount: c.enrolledCount,
      duration: c.duration,
      modules: c.totalModules,
      prerequisite: c.prerequisite || null,
      displayOrder: c.displayOrder || 0
    }));

    res.json({ courses });
  } catch (error) {
    console.error('[COURSES] Error:', error.message);
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

// ==================== GET COURSE DETAILS ====================
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase(), isActive: true });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const modules = course.modules.map(m => ({
      id: m.moduleId,
      name: m.name,
      duration: m.duration,
      quizQuestions: m.quizQuestions,
      videoUrl: m.videoUrl
    }));

    const coursePrice = course.price || course.examPrice || 0;

    res.json({
      course: {
        id: course.courseId,
        name: course.name,
        description: course.description,
        price: coursePrice,
        examPrice: coursePrice,
        pathPrice: coursePrice,
        icon: course.icon,
        category: course.category,
        color: course.color,
        duration: course.duration,
        modules: course.totalModules,
        enrolledCount: course.enrolledCount,
        prerequisite: course.prerequisite
      },
      modules,
      totalModules: course.totalModules
    });
  } catch (error) {
    console.error('[COURSES] Error:', error.message);
    res.status(500).json({ error: 'Failed to load course details' });
  }
});

// ==================== GET MODULE PROGRESS ====================
router.get('/:id/progress', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const completedProgress = await ModuleProgress.find({
      userId,
      courseId: id.toLowerCase(),
      completed: true
    });

    const completedModuleIds = completedProgress.map(p => p.moduleId);
    const completedCount = completedModuleIds.length;
    const totalModules = course.totalModules;

    const modulesStatus = [];
    for (let i = 1; i <= totalModules; i++) {
      const progress = completedProgress.find(p => p.moduleId === i);
      modulesStatus.push({
        moduleId: i,
        completed: progress ? true : false,
        unlocked: i === 1 || completedModuleIds.includes(i - 1),
        quizScore: progress ? progress.quizScore : null,
        completedAt: progress ? progress.completedAt : null
      });
    }

    const examUnlocked = completedCount >= totalModules && totalModules > 0;

    let nextModuleName = null;
    if (!examUnlocked) {
      const nextModule = modulesStatus.find(m => m.unlocked && !m.completed);
      if (nextModule) {
        const moduleData = course.modules.find(m => m.moduleId === nextModule.moduleId);
        nextModuleName = moduleData ? moduleData.name : `Module ${nextModule.moduleId}`;
      }
    }

    console.log(`[COURSES] Progress for ${req.user.email} on ${id}: ${completedCount}/${totalModules}, examUnlocked: ${examUnlocked}`);

    res.json({
      progress: {
        courseId: id,
        completedCount,
        totalModules,
        modules: modulesStatus,
        examUnlocked,
        nextModuleName: nextModuleName || (examUnlocked ? 'Final Exam Ready!' : 'Continue learning'),
        percentComplete: totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0
      }
    });
  } catch (error) {
    console.error('[COURSES] Progress error:', error.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// ==================== COMPLETE MODULE ====================
router.post('/:id/modules/:moduleId/complete', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const { quizScore } = req.body;
  const userId = req.user._id;

  if (quizScore === undefined || quizScore === null) {
    return res.status(400).json({ error: 'Quiz score is required' });
  }

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await ModuleProgress.findOneAndUpdate(
      { userId, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
      {
        completed: true,
        quizScore: parseInt(quizScore),
        completedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    const completedCount = await ModuleProgress.countDocuments({
      userId,
      courseId: id.toLowerCase(),
      completed: true
    });

    const progressPercent = Math.round((completedCount / course.totalModules) * 100);
    const examUnlocked = completedCount >= course.totalModules;

    let nextModuleName = null;
    if (completedCount < course.totalModules) {
      const nextModule = course.modules.find(m => m.moduleId === completedCount + 1);
      nextModuleName = nextModule ? nextModule.name : `Module ${completedCount + 1}`;
    }

    await Enrollment.findOneAndUpdate(
      { userId, courseId: id.toLowerCase() },
      {
        progress: progressPercent,
        'moduleProgress.completedCount': completedCount,
        'moduleProgress.totalModules': course.totalModules,
        'moduleProgress.nextModuleName': nextModuleName || 'Final Exam Ready!',
        'moduleProgress.examUnlocked': examUnlocked
      },
      { returnDocument: 'after' }
    );

    console.log(`[COURSES] Module ${moduleId} completed by ${req.user.email} - ${id} - Score: ${quizScore}% - Exam Unlocked: ${examUnlocked}`);

    res.json({
      success: true,
      message: `Module ${moduleId} completed! Score: ${quizScore}%`,
      examUnlocked,
      completedCount,
      totalModules: course.totalModules
    });
  } catch (error) {
    console.error('[COURSES] Complete module error:', error.message);
    res.status(500).json({ error: 'Failed to complete module' });
  }
});

// ==================== ENROLL IN COURSE ====================
router.post('/enroll', authenticate, async (req, res) => {
  const { courseId, type, voucherCode } = req.body;
  const userId = req.user._id;

  if (!courseId || !type) {
    return res.status(400).json({ error: 'Course ID and type are required' });
  }

  try {
    const course = await Course.findOne({ courseId: courseId.toLowerCase(), isActive: true });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const existingEnrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (existingEnrollment) {
      return res.status(400).json({
        error: 'Already enrolled',
        alreadyEnrolled: true,
        courseId
      });
    }

    const enrollment = await Enrollment.create({
      userId,
      courseId: courseId.toLowerCase(),
      courseName: course.name,
      courseIcon: course.icon,
      type: type || 'course',
      status: 'enrolled',
      progress: 0,
      moduleProgress: {
        completedCount: 0,
        totalModules: course.totalModules,
        nextModuleName: course.modules.length > 0 ? course.modules[0].name : 'Module 1',
        examUnlocked: false
      },
      examAttempts: 0,
      voucherCode: voucherCode || null
    });

    await Course.findOneAndUpdate(
      { courseId: courseId.toLowerCase() },
      { $inc: { enrolledCount: 1 } }
    );

    await User.findByIdAndUpdate(userId, { $inc: { enrolledCourses: 1 } });

    console.log(`[COURSES] ${req.user.email} enrolled in ${course.name}`);

    res.json({
      success: true,
      message: `Enrolled in ${course.name}`,
      enrollment: {
        id: enrollment._id,
        courseId: enrollment.courseId,
        courseName: enrollment.courseName,
        type: enrollment.type,
        status: enrollment.status
      }
    });
  } catch (error) {
    console.error('[COURSES] Enroll error:', error.message);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// ==================== GET USER ENROLLMENTS ====================
router.get('/enrollments/me', authenticate, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedCount = await ModuleProgress.countDocuments({
          userId: req.user._id,
          courseId: enrollment.courseId,
          completed: true
        });

        const course = await Course.findOne({ courseId: enrollment.courseId });
        const totalModules = course ? course.totalModules : enrollment.moduleProgress?.totalModules || 8;
        const examUnlocked = completedCount >= totalModules;

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
            examUnlocked,
            nextModuleName: nextModuleName || (examUnlocked ? 'Final Exam Ready!' : 'Continue learning')
          },
          examAttempts: enrollment.examAttempts,
          score: enrollment.score,
          enrolledAt: enrollment.createdAt
        };
      })
    );

    res.json({ enrollments: enrollmentsWithProgress });
  } catch (error) {
    console.error('[COURSES] Enrollments error:', error.message);
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});

const User = require('../models/User');

module.exports = router;
