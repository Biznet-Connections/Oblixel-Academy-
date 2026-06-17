const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ExamQuestion = require('../models/ExamQuestion');
const ExamSession = require('../models/ExamSession');
const ExamAttempt = require('../models/ExamAttempt');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const ModuleProgress = require('../models/ModuleProgress');

const EXAM_PASS_SCORE = 70;
const EXAM_COOLDOWN_DAYS = 7;
const EXAM_TIME_LIMIT = 3600;
const EXAM_TOTAL_QUESTIONS = 25;

// ==================== START EXAM ====================
router.post('/start', authenticate, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user._id;

  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    // Check enrollment
    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (!enrollment) {
      return res.status(403).json({ error: 'You must enroll in this course first.' });
    }

    // Check cooldown
    if (enrollment.cooldownUntil && enrollment.cooldownUntil > new Date()) {
      const daysLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60 * 60 * 24));
      return res.status(403).json({
        error: 'Exam on cooldown',
        cooldownUntil: enrollment.cooldownUntil,
        message: `Retake available in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`
      });
    }

    // Check all modules completed
    const course = await Course.findOne({ courseId: courseId.toLowerCase() });
    const totalModules = course ? course.totalModules : 8;

    const completedCount = await ModuleProgress.countDocuments({
      userId,
      courseId: courseId.toLowerCase(),
      completed: true
    });

    if (completedCount < totalModules) {
      return res.status(403).json({
        error: 'Not all modules completed',
        completed: completedCount,
        total: totalModules,
        message: `Complete all ${totalModules} modules first. You've done ${completedCount}.`
      });
    }

    // Get questions for this course
    let questions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });

    // If no questions, use fallback
    if (questions.length < EXAM_TOTAL_QUESTIONS) {
      questions = getFallbackQuestions(courseId);
    }

    // Shuffle and select
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, EXAM_TOTAL_QUESTIONS);

    // Remove correct answers from response
    const safeQuestions = selected.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options
    }));

    // Create exam session
    const session = await ExamSession.create({
      userId,
      courseId: courseId.toLowerCase(),
      startTime: new Date(),
      status: 'in_progress',
      questionCount: safeQuestions.length
    });

    console.log(`[EXAM] Started: ${req.user.email} - ${courseId} - Session: ${session._id}`);

    res.json({
      sessionId: session._id,
      questions: safeQuestions,
      totalQuestions: safeQuestions.length,
      timeLimit: EXAM_TIME_LIMIT,
      passingScore: EXAM_PASS_SCORE
    });
  } catch (error) {
    console.error('[EXAM] Start error:', error.message);
    res.status(500).json({ error: 'Failed to start exam' });
  }
});

// ==================== SUBMIT EXAM ====================
router.post('/submit', authenticate, async (req, res) => {
  const { sessionId, courseId, answers, timeSpent } = req.body;
  const userId = req.user._id;

  if (!sessionId || !courseId || !answers) {
    return res.status(400).json({ error: 'Session ID, course ID, and answers are required' });
  }

  try {
    // Verify session
    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
      courseId: courseId.toLowerCase()
    });

    if (!session) {
      return res.status(400).json({ error: 'Invalid exam session' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Exam already submitted' });
    }

    // Get questions with correct answers
    let questions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });
    if (questions.length === 0) {
      questions = getFallbackQuestions(courseId);
    }

    // Grade the exam
    let correctCount = 0;
    const totalQuestions = Math.min(answers.length, questions.length);

    for (let i = 0; i < totalQuestions; i++) {
      if (answers[i] === questions[i].correct) correctCount++;
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= EXAM_PASS_SCORE;

    // Update enrollment
    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (enrollment) {
      enrollment.examAttempts = (enrollment.examAttempts || 0) + 1;
      enrollment.lastExamDate = new Date();
      enrollment.score = score;

      if (passed) {
        enrollment.status = 'passed_waiting';

        // Create pending certificate
        await Certificate.create({
          userId,
          courseId: courseId.toLowerCase(),
          courseName: enrollment.courseName,
          score,
          status: 'pending',
          type: enrollment.type,
          submittedAt: new Date()
        });

        console.log(`[EXAM] PASSED: ${req.user.email} - ${courseId} - ${score}%`);
      } else {
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() + EXAM_COOLDOWN_DAYS);
        enrollment.cooldownUntil = cooldownDate;
        enrollment.status = 'failed';

        console.log(`[EXAM] FAILED: ${req.user.email} - ${courseId} - ${score}%`);
      }

      await enrollment.save();
    }

    // Save exam attempt
    await ExamAttempt.create({
      userId,
      courseId: courseId.toLowerCase(),
      sessionId,
      score,
      passed,
      totalQuestions,
      correctCount,
      timeSpent: timeSpent || 0,
      completedAt: new Date()
    });

    // Mark session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    session.score = score;
    session.passed = passed;
    await session.save();

    // Calculate retake price if failed
    let retakePrice = null;
    if (!passed) {
      const course = await Course.findOne({ courseId: courseId.toLowerCase() });
      if (course) {
        retakePrice = Math.round(course.examPrice * 0.5 * 100) / 100;
      }
    }

    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      message: passed
        ? '🎉 Congratulations! You passed! Certificate pending admin approval.'
        : `❌ Score: ${score}%. Need ${EXAM_PASS_SCORE}%. Retake in ${EXAM_COOLDOWN_DAYS} days.`,
      ...(retakePrice && { retakePrice, cooldownDays: EXAM_COOLDOWN_DAYS })
    });
  } catch (error) {
    console.error('[EXAM] Submit error:', error.message);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// ==================== GET EXAM RESULTS ====================
router.get('/results/:courseId', authenticate, async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({
      userId: req.user._id,
      courseId: req.params.courseId.toLowerCase()
    }).sort({ completedAt: -1 });

    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// ==================== GET EXAM HISTORY ====================
router.get('/history', authenticate, async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({ userId: req.user._id })
      .sort({ completedAt: -1 });

    // Get course names
    const history = await Promise.all(attempts.map(async (a) => {
      const course = await Course.findOne({ courseId: a.courseId });
      return {
        id: a._id,
        courseId: a.courseId,
        courseName: course ? course.name : 'Unknown',
        courseIcon: course ? course.icon : 'fa-certificate',
        score: a.score,
        passed: a.passed,
        completedAt: a.completedAt
      };
    }));

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ==================== FALLBACK QUESTIONS ====================
function getFallbackQuestions(courseId) {
  const fallback = {
    ncp: [
      { text: 'What does OSI stand for?', options: ['Open System Interconnection', 'Open Source Integration', 'Operating System Interface', 'Online Service Integration'], correct: 0 },
      { text: 'Which OSI layer handles routing?', options: ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 4'], correct: 2 },
      { text: 'What protocol ensures reliable delivery?', options: ['UDP', 'TCP', 'IP', 'ICMP'], correct: 1 },
      { text: 'Class C default subnet mask?', options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], correct: 2 },
      { text: 'Link-state routing protocol?', options: ['RIP', 'BGP', 'OSPF', 'EIGRP'], correct: 2 },
      { text: 'Layer 2 device?', options: ['Router', 'Switch', 'Hub', 'Repeater'], correct: 1 },
      { text: 'VLAN purpose?', options: ['Speed', 'Broadcast segmentation', 'Replace routers', 'Encryption'], correct: 1 },
      { text: 'Auto IP assignment?', options: ['DNS', 'DHCP', 'HTTP', 'FTP'], correct: 1 },
      { text: 'Gigabit Ethernet speed?', options: ['100 Mbps', '500 Mbps', '1000 Mbps', '10000 Mbps'], correct: 2 },
      { text: 'NAT stands for?', options: ['Network Address Translation', 'Network Access Terminal', 'Node Auth Token', 'Network Allocation Table'], correct: 0 },
      { text: 'Firewall function?', options: ['Speed network', 'Filter traffic', 'Assign IPs', 'Manage users'], correct: 1 },
      { text: '5GHz WiFi standard?', options: ['802.11b', '802.11g', '802.11n', '802.11a'], correct: 3 },
      { text: 'Connectivity test command?', options: ['ipconfig', 'ping', 'tracert', 'nslookup'], correct: 1 },
      { text: 'DNS function?', options: ['Assign IPs', 'Resolve names to IPs', 'Encrypt data', 'Route packets'], correct: 1 },
      { text: 'BGP used for?', options: ['LAN routing', 'Internet inter-domain routing', 'Wireless', 'Firewall config'], correct: 1 },
      { text: 'Ethernet cable type?', options: ['Coaxial', 'Fiber', 'Cat5e/Cat6', 'HDMI'], correct: 2 },
      { text: 'Loopback IP?', options: ['192.168.1.1', '10.0.0.1', '127.0.0.1', '255.255.255.0'], correct: 2 },
      { text: 'Secure remote access?', options: ['Telnet', 'SSH', 'FTP', 'HTTP'], correct: 1 },
      { text: 'DDoS meaning?', options: ['Data encryption', 'Distributed Denial of Service', 'Domain deletion', 'Data override'], correct: 1 },
      { text: 'Error detection layer?', options: ['Physical', 'Data Link', 'Network', 'Application'], correct: 1 },
      { text: 'Router function?', options: ['Connect networks', 'Amplify signal', 'Store data', 'Display pages'], correct: 0 },
      { text: 'VPN stands for?', options: ['Virtual Private Network', 'Very Personal Network', 'Virtual Protocol Node', 'Verified Public Network'], correct: 0 },
      { text: 'QoS meaning?', options: ['Quality of Service', 'Quick OS', 'Query Optimization', 'Quantum Standard'], correct: 0 },
      { text: 'Subnet mask purpose?', options: ['Identify network vs host', 'Encrypt data', 'Speed routing', 'Assign IPs'], correct: 0 },
      { text: 'MPLS used in?', options: ['Frame Relay', 'ATM', 'MPLS VPN', 'ISDN'], correct: 2 }
    ],
    ccp: [
      { text: 'Brain of computer?', options: ['RAM', 'CPU', 'Hard Drive', 'Power Supply'], correct: 1 },
      { text: 'RAM stands for?', options: ['Random Access Memory', 'Read Always Memory', 'Rapid App Module', 'Remote Access Management'], correct: 0 },
      { text: 'Input device?', options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'], correct: 2 },
      { text: 'Computer number system?', options: ['Decimal', 'Octal', 'Binary', 'Hexadecimal'], correct: 2 },
      { text: 'BIOS meaning?', options: ['Basic Input Output System', 'Binary Integrated OS', 'Basic Integrated Software', 'Boot Input Service'], correct: 0 },
      { text: 'Open source OS?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correct: 2 },
      { text: 'GUI stands for?', options: ['Graphical User Interface', 'General Utility Interface', 'Graphical Unified Integration', 'Global User Input'], correct: 0 },
      { text: 'HTTP meaning?', options: ['HyperText Transfer Protocol', 'High Tech Transfer', 'HyperText Transmission', 'Host Transfer Protocol'], correct: 0 },
      { text: 'Web dev language?', options: ['C++', 'Java', 'JavaScript', 'Assembly'], correct: 2 },
      { text: 'What is a database?', options: ['Organized data collection', 'Hardware component', 'Network protocol', 'Operating system'], correct: 0 },
      { text: 'SQL stands for?', options: ['Structured Query Language', 'Simple Question Language', 'System Quality Logic', 'Standard Query Link'], correct: 0 },
      { text: 'Cloud computing?', options: ['Satellite computing', 'Internet-based services', 'No electricity needed', 'Weather simulation'], correct: 1 },
      { text: 'IP address?', options: ['Provider Address', 'Unique network identifier', 'Internal Processing', 'Protocol Application'], correct: 1 },
      { text: 'HTML meaning?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'HyperTransfer Markup', 'Host Technology Language'], correct: 0 },
      { text: 'Malware?', options: ['Malicious software', 'Hardware fault', 'Network error', 'OS bug'], correct: 0 },
      { text: 'OS main function?', options: ['Manage hardware/software', 'Only run apps', 'Only store files', 'Only connect internet'], correct: 0 },
      { text: 'USB meaning?', options: ['Universal Serial Bus', 'United System Bridge', 'Universal Service Buffer', 'Unified Storage Base'], correct: 0 },
      { text: 'Firewall purpose?', options: ['Network security', 'File storage', 'Print documents', 'Run applications'], correct: 0 },
      { text: 'CSS meaning?', options: ['Cascading Style Sheets', 'Computer Style System', 'Creative Style Software', 'Cascading System Styles'], correct: 0 },
      { text: 'Phishing?', options: ['Fishing online', 'Fraud for sensitive info', 'Network testing', 'Database query'], correct: 1 },
      { text: 'Antivirus purpose?', options: ['Speed up PC', 'Detect/remove malware', 'Create documents', 'Manage emails'], correct: 1 },
      { text: 'SSD?', options: ['Solid State Drive', 'Super Speed Disk', 'System Storage Device', 'Serial Storage Disk'], correct: 0 },
      { text: 'URL meaning?', options: ['Uniform Resource Locator', 'Universal Reference Link', 'Unified Resource Language', 'User Reference Locator'], correct: 0 },
      { text: 'Encryption?', options: ['Converting data to code', 'Deleting data', 'Copying data', 'Moving data'], correct: 0 },
      { text: 'Router in network?', options: ['Forward packets between networks', 'Store files', 'Display pages', 'Run apps'], correct: 0 }
    ]
  };

  const questions = fallback[courseId] || fallback['ncp'];
  return questions.map((q, i) => ({
    courseId,
    text: q.text,
    options: q.options,
    correct: q.correct,
    _id: `fallback_${courseId}_${i}`
  }));
}

module.exports = router;
