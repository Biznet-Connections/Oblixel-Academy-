const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON, addItem, findById } = require('../utils/jsonDB');
const { generateId } = require('../utils/helpers');

// COURSE MODULES DATA
const COURSE_MODULES = {
  cyber: [
    { id: 1, name: "Introduction to Cybersecurity", duration: "45 min", quizQuestions: 5, videoUrl: "https://www.youtube.com/watch?v=inWWhr5tnEA" },
    { id: 2, name: "Network Security Fundamentals", duration: "60 min", quizQuestions: 5, videoUrl: "https://www.youtube.com/watch?v=9G9I_8UvGgA" },
    { id: 3, name: "SOC Operations", duration: "50 min", quizQuestions: 5, videoUrl: null },
    { id: 4, name: "Incident Response", duration: "55 min", quizQuestions: 5, videoUrl: null },
    { id: 5, name: "Threat Hunting", duration: "60 min", quizQuestions: 5, videoUrl: null },
    { id: 6, name: "Penetration Testing", duration: "70 min", quizQuestions: 5, videoUrl: null },
    { id: 7, name: "Security Compliance", duration: "40 min", quizQuestions: 5, videoUrl: null },
    { id: 8, name: "Final Review", duration: "60 min", quizQuestions: 10, videoUrl: null }
  ],
  cloud: [
    { id: 1, name: "Cloud Computing Basics", duration: "45 min", quizQuestions: 5, videoUrl: "https://www.youtube.com/watch?v=2LaAJqXMP_s" },
    { id: 2, name: "AWS Fundamentals", duration: "60 min", quizQuestions: 5, videoUrl: "https://www.youtube.com/watch?v=Z3SYDTUhI4M" },
    { id: 3, name: "Azure Services", duration: "50 min", quizQuestions: 5, videoUrl: null },
    { id: 4, name: "Google Cloud Platform", duration: "55 min", quizQuestions: 5, videoUrl: null },
    { id: 5, name: "Kubernetes & Containers", duration: "70 min", quizQuestions: 5, videoUrl: null },
    { id: 6, name: "DevOps Practices", duration: "60 min", quizQuestions: 5, videoUrl: null }
  ],
  ccna: [
    { id: 1, name: "Networking Fundamentals", duration: "60 min", quizQuestions: 5, videoUrl: "https://www.youtube.com/watch?v=H7-NR3Q3BeI" },
    { id: 2, name: "IP Addressing & Subnetting", duration: "90 min", quizQuestions: 10, videoUrl: null },
    { id: 3, name: "Routing Protocols", duration: "75 min", quizQuestions: 5, videoUrl: null },
    { id: 4, name: "Switching Concepts", duration: "70 min", quizQuestions: 5, videoUrl: null },
    { id: 5, name: "Network Security", duration: "60 min", quizQuestions: 5, videoUrl: null },
    { id: 6, name: "Network Automation", duration: "50 min", quizQuestions: 5, videoUrl: null },
    { id: 7, name: "Troubleshooting", duration: "80 min", quizQuestions: 5, videoUrl: null },
    { id: 8, name: "Final Exam Prep", duration: "90 min", quizQuestions: 10, videoUrl: null }
  ]
};

function getCourseModules(courseId) {
  if (COURSE_MODULES[courseId]) return COURSE_MODULES[courseId];
  // Generate default modules for any course
  return Array.from({ length: 6 }, (_, idx) => ({
    id: idx + 1,
    name: `Module ${idx + 1}`,
    duration: `${45 + idx * 5} min`,
    quizQuestions: 5,
    videoUrl: null
  }));
}

// Get all courses
router.get('/', async (req, res) => {
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  res.json({ courses });
});

// Get single course by ID with modules
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const modules = getCourseModules(id);
  
  res.json({ course, modules });
});

// Get user's module progress for a course
router.get('/:id/progress', authenticate, async (req, res) => {
  const { id: courseId } = req.params;
  
  let progressData = readJSON('module_progress.json');
  const userProgress = progressData.find(p => p.userId === req.user.id && p.courseId === courseId);
  
  if (!userProgress) {
    const modules = getCourseModules(courseId);
    const defaultProgress = {
      userId: req.user.id,
      courseId,
      modules: modules.map((m, idx) => ({
        moduleId: m.id,
        completed: idx === 0,
        quizScore: null,
        unlocked: idx === 0
      })),
      totalModules: modules.length,
      completedCount: 1,
      examUnlocked: false,
      updatedAt: new Date().toISOString()
    };
    res.json({ progress: defaultProgress });
  } else {
    res.json({ progress: userProgress });
  }
});

// Save module progress
router.post('/:id/progress', authenticate, async (req, res) => {
  const { id: courseId } = req.params;
  const { progress } = req.body;
  
  let progressData = readJSON('module_progress.json');
  const existingIndex = progressData.findIndex(p => p.userId === req.user.id && p.courseId === courseId);
  
  const newProgress = {
    ...progress,
    userId: req.user.id,
    courseId,
    updatedAt: new Date().toISOString()
  };
  
  if (existingIndex !== -1) {
    progressData[existingIndex] = newProgress;
  } else {
    progressData.push(newProgress);
  }
  
  writeJSON('module_progress.json', progressData);
  
  res.json({ success: true, progress: newProgress });
});

// Complete a module
router.post('/:id/modules/:moduleId/complete', authenticate, async (req, res) => {
  const { id: courseId, moduleId } = req.params;
  const { quizScore } = req.body;
  
  let progressData = readJSON('module_progress.json');
  let userProgress = progressData.find(p => p.userId === req.user.id && p.courseId === courseId);
  
  if (!userProgress) {
    const modules = getCourseModules(courseId);
    userProgress = {
      userId: req.user.id,
      courseId,
      modules: modules.map((m, idx) => ({
        moduleId: m.id,
        completed: false,
        quizScore: null,
        unlocked: idx === 0
      })),
      totalModules: modules.length,
      completedCount: 0,
      examUnlocked: false
    };
    progressData.push(userProgress);
  }
  
  const moduleIndex = userProgress.modules.findIndex(m => m.moduleId === parseInt(moduleId));
  if (moduleIndex !== -1 && !userProgress.modules[moduleIndex].completed) {
    userProgress.modules[moduleIndex].completed = true;
    userProgress.modules[moduleIndex].quizScore = quizScore;
    userProgress.completedCount = userProgress.modules.filter(m => m.completed).length;
    
    // Unlock next module if exists
    if (moduleIndex + 1 < userProgress.modules.length) {
      userProgress.modules[moduleIndex + 1].unlocked = true;
    }
    
    // Check if exam should be unlocked
    userProgress.examUnlocked = userProgress.completedCount === userProgress.totalModules;
    
    const index = progressData.findIndex(p => p.userId === req.user.id && p.courseId === courseId);
    progressData[index] = userProgress;
    writeJSON('module_progress.json', progressData);
    
    // Also update enrollment progress
    const enrollments = readJSON('enrollments.json');
    const enrollmentIndex = enrollments.findIndex(e => e.userId === req.user.id && e.courseId === courseId);
    if (enrollmentIndex !== -1) {
      enrollments[enrollmentIndex].progress = (userProgress.completedCount / userProgress.totalModules) * 100;
      writeJSON('enrollments.json', enrollments);
    }
    
    console.log(`[COURSES] User ${req.user.id} completed module ${moduleId} of ${courseId} with score ${quizScore}%`);
    
    res.json({ 
      success: true, 
      message: `Module completed! Score: ${quizScore}%`,
      progress: userProgress,
      examUnlocked: userProgress.examUnlocked
    });
  } else {
    res.json({ success: false, message: 'Module already completed or not found' });
  }
});

// Enroll in course (requires authentication)
router.post('/enroll', authenticate, async (req, res) => {
  const { courseId, type, paymentMethod, voucherCode } = req.body;

  if (!courseId || !type) {
    return res.status(400).json({ error: 'Course ID and type are required' });
  }

  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  const course = courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const enrollments = readJSON('enrollments.json');
  const existingEnrollment = enrollments.find(
    e => e.userId === req.user.id && e.courseId === courseId
  );

  if (existingEnrollment) {
    return res.status(400).json({ error: 'Already enrolled in this course' });
  }

  let price = type === 'exam_only' ? course.examPrice : course.pathPrice;
  let discountApplied = 0;
  let usedVoucher = null;

  if (voucherCode) {
    const vouchers = readJSON('vouchers.json');
    const voucher = vouchers.find(v =>
      v.code === voucherCode &&
      v.active &&
      (v.courseId === courseId || v.courseId === 'all') &&
      v.usedCount < v.maxUses &&
      new Date(v.expiresAt) > new Date()
    );

    if (voucher) {
      usedVoucher = voucher;
      if (voucher.discountType === 'free') {
        discountApplied = price;
        price = 0;
      } else if (voucher.discountType === 'percentage') {
        discountApplied = price * (voucher.discountValue / 100);
        price = price - discountApplied;
      }
    }
  }

  const modules = getCourseModules(courseId);
  const enrollment = {
    id: generateId(),
    userId: req.user.id,
    courseId,
    type,
    status: 'enrolled',
    progress: type === 'exam_only' ? 100 : 0,
    examAttempts: 0,
    lastExamDate: null,
    cooldownUntil: null,
    feePaid: price,
    enrolledAt: new Date().toISOString(),
    voucherUsed: usedVoucher ? usedVoucher.code : null,
    discountApplied
  };

  enrollments.push(enrollment);
  writeJSON('enrollments.json', enrollments);

  if (usedVoucher) {
    const vouchers = readJSON('vouchers.json');
    const voucherIndex = vouchers.findIndex(v => v.id === usedVoucher.id);
    if (voucherIndex !== -1) {
      vouchers[voucherIndex].usedCount += 1;
      writeJSON('vouchers.json', vouchers);
    }
  }

  course.enrolledCount = (course.enrolledCount || 0) + 1;
  writeJSON('courses.json', { courses });

  const users = readJSON('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex !== -1) {
    users[userIndex].totalSpent = (users[userIndex].totalSpent || 0) + price;
    writeJSON('users.json', users);
  }

  const payments = readJSON('payments.json');
  const payment = {
    id: generateId(),
    userId: req.user.id,
    courseId,
    amount: price,
    originalAmount: type === 'exam_only' ? course.examPrice : course.pathPrice,
    discount: discountApplied,
    currency: 'USD',
    method: paymentMethod || 'mock',
    status: 'completed',
    transactionId: `mock_${Date.now()}`,
    voucherCode: voucherCode || null,
    createdAt: new Date().toISOString()
  };
  payments.push(payment);
  writeJSON('payments.json', payments);

  // Create initial module progress
  let progressData = readJSON('module_progress.json');
  const existingProgress = progressData.find(p => p.userId === req.user.id && p.courseId === courseId);
  if (!existingProgress && type !== 'exam_only') {
    const newProgress = {
      userId: req.user.id,
      courseId,
      modules: modules.map((m, idx) => ({
        moduleId: m.id,
        completed: idx === 0,
        quizScore: null,
        unlocked: idx === 0
      })),
      totalModules: modules.length,
      completedCount: 1,
      examUnlocked: false,
      createdAt: new Date().toISOString()
    };
    progressData.push(newProgress);
    writeJSON('module_progress.json', progressData);
  }

  res.json({
    success: true,
    message: `Successfully enrolled in ${course.name}`,
    enrollment: {
      id: enrollment.id,
      courseId,
      courseName: course.name,
      type,
      price,
      originalPrice: type === 'exam_only' ? course.examPrice : course.pathPrice,
      discountApplied
    }
  });
});

// Get user's enrolled courses
router.get('/enrollments/me', authenticate, async (req, res) => {
  const enrollments = readJSON('enrollments.json');
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  const progressData = readJSON('module_progress.json');

  const userEnrollments = enrollments
    .filter(e => e.userId === req.user.id)
    .map(e => {
      const course = courses.find(c => c.id === e.courseId);
      const progress = progressData.find(p => p.userId === req.user.id && p.courseId === e.courseId);
      return {
        ...e,
        courseName: course ? course.name : 'Unknown Course',
        courseIcon: course ? course.icon : 'fa-book',
        courseColor: course ? course.color : 'gray',
        moduleProgress: progress ? {
          completedCount: progress.completedCount,
          totalModules: progress.totalModules,
          percentComplete: (progress.completedCount / progress.totalModules) * 100
        } : null
      };
    });

  res.json({ enrollments: userEnrollments });
});

module.exports = router;
