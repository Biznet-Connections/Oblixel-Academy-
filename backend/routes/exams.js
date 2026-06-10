const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON, findById, queryItems, addItem } = require('../utils/jsonDB');
const { generateId, addDays, getDateString, calculateRetakePrice } = require('../utils/helpers');
const constants = require('../utils/constants');

// Start exam - get questions
router.post('/start', authenticate, async (req, res) => {
  const { courseId } = req.body;
  
  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }
  
  // Check if user is enrolled
  const enrollments = readJSON('enrollments.json');
  const enrollment = enrollments.find(
    e => e.userId === req.user.id && e.courseId === courseId
  );
  
  if (!enrollment) {
    return res.status(403).json({ error: 'You must enroll in this course first' });
  }
  
  // Check cooldown
  if (enrollment.cooldownUntil && new Date(enrollment.cooldownUntil) > new Date()) {
    return res.status(403).json({ 
      error: 'Exam on cooldown',
      cooldownUntil: enrollment.cooldownUntil,
      message: `You can retake this exam on ${new Date(enrollment.cooldownUntil).toLocaleDateString()}`
    });
  }
  
  // Get questions for this course
  const examsData = readJSON('exams.json');
  const allQuestions = examsData.questions || [];
  const questions = allQuestions
    .filter(q => q.courseId === courseId)
    .map(q => ({
      id: q.id,
      text: q.text,
      options: q.options
      // Don't send correct answers to frontend
    }));
  
  if (questions.length === 0) {
    return res.status(404).json({ error: 'No questions found for this course' });
  }
  
  // Create exam session
  const examSession = {
    id: generateId(),
    userId: req.user.id,
    courseId,
    startTime: new Date().toISOString(),
    status: 'in_progress'
  };
  
  const examSessions = readJSON('exam_sessions.json') || [];
  examSessions.push(examSession);
  writeJSON('exam_sessions.json', examSessions);
  
  res.json({
    sessionId: examSession.id,
    questions,
    totalQuestions: questions.length,
    timeLimit: 3600, // 60 minutes in seconds
    passingScore: constants.EXAM_PASS_SCORE
  });
});

// Submit exam answers
router.post('/submit', authenticate, async (req, res) => {
  const { sessionId, courseId, answers, timeSpent } = req.body;
  
  if (!sessionId || !courseId || !answers) {
    return res.status(400).json({ error: 'Session ID, course ID, and answers are required' });
  }
  
  // Verify session
  const examSessions = readJSON('exam_sessions.json') || [];
  const session = examSessions.find(s => s.id === sessionId && s.userId === req.user.id);
  
  if (!session) {
    return res.status(400).json({ error: 'Invalid exam session' });
  }
  
  // Get correct answers
  const examsData = readJSON('exams.json');
  const allQuestions = examsData.questions || [];
  const courseQuestions = allQuestions.filter(q => q.courseId === courseId);
  
  // Grade the exam
  let correctCount = 0;
  const gradedAnswers = [];
  
  for (let i = 0; i < courseQuestions.length; i++) {
    const question = courseQuestions[i];
    const userAnswer = answers[i];
    const isCorrect = userAnswer === question.correct;
    
    if (isCorrect) correctCount++;
    
    gradedAnswers.push({
      questionId: question.id,
      userAnswer,
      isCorrect,
      correctAnswer: question.correct
    });
  }
  
  const score = Math.round((correctCount / courseQuestions.length) * 100);
  const passed = score >= constants.EXAM_PASS_SCORE;
  
  // Update enrollment record
  const enrollments = readJSON('enrollments.json');
  const enrollmentIndex = enrollments.findIndex(
    e => e.userId === req.user.id && e.courseId === courseId
  );
  
  if (enrollmentIndex !== -1) {
    enrollments[enrollmentIndex].examAttempts += 1;
    enrollments[enrollmentIndex].lastExamDate = new Date().toISOString();
    enrollments[enrollmentIndex].score = score;
    
    if (passed) {
      enrollments[enrollmentIndex].status = constants.ENROLLMENT_STATUS.PASSED_WAITING;
      
      // Add to pending certificates
      const certificates = readJSON('certificates.json');
      const pendingCert = {
        id: generateId(),
        userId: req.user.id,
        courseId,
        score,
        submittedAt: new Date().toISOString(),
        type: enrollments[enrollmentIndex].type,
        feePaid: enrollments[enrollmentIndex].feePaid || 0,
        status: 'pending'
      };
      
      if (!certificates.pending) certificates.pending = [];
      certificates.pending.push(pendingCert);
      writeJSON('certificates.json', certificates);
    } else {
      // Set cooldown
      const cooldownDate = addDays(new Date(), constants.EXAM_COOLDOWN_DAYS);
      enrollments[enrollmentIndex].cooldownUntil = cooldownDate.toISOString();
      enrollments[enrollmentIndex].status = constants.ENROLLMENT_STATUS.FAILED;
    }
    
    writeJSON('enrollments.json', enrollments);
  }
  
  // Save exam attempt
  const examAttempt = {
    id: generateId(),
    userId: req.user.id,
    courseId,
    sessionId,
    answers: gradedAnswers,
    score,
    passed,
    timeSpent,
    completedAt: new Date().toISOString()
  };
  
  const examAttempts = readJSON('exam_attempts.json') || [];
  examAttempts.push(examAttempt);
  writeJSON('exam_attempts.json', examAttempts);
  
  // Mark session as completed
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  writeJSON('exam_sessions.json', examSessions);
  
  // Calculate retake price if failed
  let retakePrice = null;
  if (!passed) {
    const coursesData = readJSON('courses.json');
    const courses = coursesData.courses || coursesData;
    const course = courses.find(c => c.id === courseId);
    if (course) {
      retakePrice = calculateRetakePrice(course.examPrice);
    }
  }
  
  res.json({
    success: true,
    score,
    passed,
    correctCount,
    totalQuestions: courseQuestions.length,
    message: passed ? '🎉 Congratulations! You passed the exam!' : '❌ You did not pass. Please review the material and try again.',
    ...(retakePrice && { retakePrice, cooldownDays: constants.EXAM_COOLDOWN_DAYS })
  });
});

// Get exam results for a course
router.get('/results/:courseId', authenticate, async (req, res) => {
  const { courseId } = req.params;
  
  const examAttempts = readJSON('exam_attempts.json') || [];
  const userAttempts = examAttempts.filter(
    a => a.userId === req.user.id && a.courseId === courseId
  );
  
  res.json({ attempts: userAttempts });
});

// Get user's exam history
router.get('/history', authenticate, async (req, res) => {
  const examAttempts = readJSON('exam_attempts.json') || [];
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  
  const history = examAttempts
    .filter(a => a.userId === req.user.id)
    .map(a => {
      const course = courses.find(c => c.id === a.courseId);
      return {
        id: a.id,
        courseId: a.courseId,
        courseName: course ? course.name : 'Unknown',
        score: a.score,
        passed: a.passed,
        completedAt: a.completedAt
      };
    })
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  
  res.json({ history });
});

module.exports = router;
