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
const EXAM_COOLDOWN_HOURS = 3;
const EXAM_TIME_LIMIT = 3600;
const EXAM_TOTAL_QUESTIONS = 25;

function generateCertificateCode(courseId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `OBX-${courseId.toUpperCase()}-${code}`;
}

// ==================== START EXAM ====================
router.post('/start', authenticate, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user._id;
  if (!courseId) return res.status(400).json({ error: 'Course ID required' });

  try {
    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (!enrollment) return res.status(403).json({ error: 'Enroll first' });

    // Check cooldown
    if (enrollment.cooldownUntil && enrollment.cooldownUntil > new Date()) {
      const hoursLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60 * 60));
      const minutesLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60));
      const retakeTime = enrollment.cooldownUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const retakeDate = enrollment.cooldownUntil.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      return res.status(403).json({
        error: 'Cooldown',
        message: `Retake available at ${retakeTime} on ${retakeDate}`,
        retakeTime: enrollment.cooldownUntil.toISOString(),
        hoursLeft,
        minutesLeft
      });
    }

    const course = await Course.findOne({ courseId: courseId.toLowerCase() });
    const totalModules = course ? course.totalModules : 8;
    const completedCount = await ModuleProgress.countDocuments({ userId, courseId: courseId.toLowerCase(), completed: true });
    if (completedCount < totalModules) return res.status(403).json({ error: 'Not all modules done', completed: completedCount, total: totalModules });

    // Get questions and shuffle them fresh for every attempt
    let questions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });

    // If not enough questions in DB, use fallbacks
    if (questions.length < EXAM_TOTAL_QUESTIONS) {
      const fallbackQuestions = getFallbackQuestions(courseId);
      const combinedQuestions = [...questions, ...fallbackQuestions];
      questions = combinedQuestions;
    }

    // Shuffle ALL questions before selecting (ensures different set each attempt)
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, EXAM_TOTAL_QUESTIONS);

    // Send question ID, text, and options to frontend
    const safeQuestions = selected.map(q => ({
      id: q._id.toString(),
      text: q.text,
      options: q.options
    }));

    // Save the question IDs in order for this session so we can match answers later
    const session = await ExamSession.create({
      userId,
      courseId: courseId.toLowerCase(),
      startTime: new Date(),
      status: 'in_progress',
      questionCount: safeQuestions.length,
      questionOrder: safeQuestions.map(q => q.id) // Store the order of question IDs
    });

    console.log(`[EXAM] Exam started for ${req.user.email} - ${courseId} - ${safeQuestions.length} questions`);

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

// ==================== SUBMIT EXAM (FIXED - Matches by Question ID) ====================
router.post('/submit', authenticate, async (req, res) => {
  const { sessionId, courseId, answers, timeSpent } = req.body;
  const userId = req.user._id;
  if (!sessionId || !courseId || !answers) return res.status(400).json({ error: 'Missing fields' });

  try {
    const session = await ExamSession.findOne({ _id: sessionId, userId, courseId: courseId.toLowerCase() });
    if (!session) return res.status(400).json({ error: 'Invalid session' });
    if (session.status === 'completed') return res.status(400).json({ error: 'Already submitted' });

    // Get all questions for this course from DB
    let allQuestions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });
    if (allQuestions.length === 0) allQuestions = getFallbackQuestions(courseId);

    // Build a map of question ID -> question object for quick lookup
    const questionMap = {};
    allQuestions.forEach(q => {
      questionMap[q._id.toString()] = q;
    });

    // Also add fallback questions to the map
    const fallbackQs = getFallbackQuestions(courseId);
    fallbackQs.forEach(q => {
      if (!questionMap[q._id]) {
        questionMap[q._id] = q;
      }
    });

    // Get the question order from the session (the order they were shown to the student)
    const questionOrder = session.questionOrder || [];

    let correctCount = 0;
    const wrongAnswers = [];

    // If we have the question order from the session, use it to match answers
    if (questionOrder.length > 0) {
      for (let i = 0; i < questionOrder.length; i++) {
        const questionId = questionOrder[i];
        const userAnswerIndex = (answers[i] !== undefined && answers[i] !== null) ? parseInt(answers[i]) : -1;
        const question = questionMap[questionId];

        if (!question) {
          console.log(`[EXAM] Question not found for ID: ${questionId}`);
          continue;
        }

        if (userAnswerIndex === question.correct) {
          correctCount++;
        } else {
          wrongAnswers.push({
            question: question.text,
            correctAnswer: question.options[question.correct],
            yourAnswer: userAnswerIndex >= 0 && userAnswerIndex < question.options.length ? question.options[userAnswerIndex] : 'Not answered',
            topic: extractTopic(question.text, courseId)
          });
        }
      }
    } else {
      // Fallback: match by index (old method for sessions without questionOrder)
      for (let i = 0; i < answers.length; i++) {
        const userAnswerIndex = (answers[i] !== undefined && answers[i] !== null) ? parseInt(answers[i]) : -1;
        if (i < allQuestions.length) {
          const question = allQuestions[i];
          if (userAnswerIndex === question.correct) {
            correctCount++;
          } else {
            wrongAnswers.push({
              question: question.text,
              correctAnswer: question.options[question.correct],
              yourAnswer: userAnswerIndex >= 0 && userAnswerIndex < question.options.length ? question.options[userAnswerIndex] : 'Not answered',
              topic: extractTopic(question.text, courseId)
            });
          }
        }
      }
    }

    const totalQuestions = questionOrder.length > 0 ? questionOrder.length : Math.min(answers.length, allQuestions.length);
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= EXAM_PASS_SCORE;

    console.log(`[EXAM] Score: ${score}% (${correctCount}/${totalQuestions}) - ${passed ? 'PASSED' : 'FAILED'}`);

    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (enrollment) {
      enrollment.examAttempts = (enrollment.examAttempts || 0) + 1;
      enrollment.lastExamDate = new Date();
      enrollment.score = score;

      if (passed) {
        enrollment.status = 'passed_waiting';
        enrollment.cooldownUntil = null;
        const certificateCode = generateCertificateCode(courseId);
        await Certificate.create({
          userId,
          courseId: courseId.toLowerCase(),
          courseName: enrollment.courseName,
          certificateId: certificateCode,
          score,
          status: 'pending',
          type: enrollment.type,
          submittedAt: new Date()
        });
        console.log(`[EXAM] ✅ Certificate code generated: ${certificateCode} for ${req.user.email}`);
      } else {
        const cd = new Date();
        cd.setHours(cd.getHours() + EXAM_COOLDOWN_HOURS);
        enrollment.cooldownUntil = cd;
        enrollment.status = 'failed';
        console.log(`[EXAM] ❌ Failed. Cooldown until: ${cd.toLocaleTimeString()} for ${req.user.email}`);
      }
      await enrollment.save();
    }

    // Save attempt
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

    session.status = 'completed';
    session.completedAt = new Date();
    session.score = score;
    session.passed = passed;
    await session.save();

    // Get certificate code if passed
    let certificateCode = null;
    if (passed) {
      const cert = await Certificate.findOne({ userId, courseId: courseId.toLowerCase(), status: 'pending' }).sort({ submittedAt: -1 });
      if (cert) certificateCode = cert.certificateId;
    }

    const supportWhatsApp = process.env.SUPPORT_WHATSAPP || '+263714587259';

    // Get retake time if failed
    let retakeTime = null;
    let retakeTimeFormatted = null;
    let retakeDateFormatted = null;
    let hoursLeft = null;
    let minutesLeft = null;

    if (!passed && enrollment && enrollment.cooldownUntil) {
      retakeTime = enrollment.cooldownUntil.toISOString();
      retakeTimeFormatted = enrollment.cooldownUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      retakeDateFormatted = enrollment.cooldownUntil.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      hoursLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60 * 60));
      minutesLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60));
    }

    // Get unique review topics from wrong answers
    const reviewTopics = [...new Set(wrongAnswers.map(wa => wa.topic).filter(Boolean))];

    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      certificateCode,
      supportWhatsApp,
      wrongAnswers,
      reviewTopics,
      retakeTime,
      retakeTimeFormatted,
      retakeDateFormatted,
      hoursLeft,
      minutesLeft,
      cooldownHours: EXAM_COOLDOWN_HOURS,
      message: passed
        ? `🎉 Congratulations! You passed with ${score}%! Your certificate code is: ${certificateCode}. Show this code to the academics team to claim your certificate.`
        : `❌ ${score}%. Need 70%. Retake available after ${EXAM_COOLDOWN_HOURS} hours.`
    });
  } catch (error) {
    console.error('[EXAM] Submit error:', error.message);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// ==================== GET EXAM RESULTS ====================
router.get('/results/:courseId', authenticate, async (req, res) => {
  const attempts = await ExamAttempt.find({ userId: req.user._id, courseId: req.params.courseId.toLowerCase() }).sort({ completedAt: -1 });
  res.json({ attempts });
});

// ==================== GET EXAM HISTORY ====================
router.get('/history', authenticate, async (req, res) => {
  const attempts = await ExamAttempt.find({ userId: req.user._id }).sort({ completedAt: -1 });
  const history = await Promise.all(attempts.map(async (a) => {
    const c = await Course.findOne({ courseId: a.courseId });
    return {
      id: a._id,
      courseId: a.courseId,
      courseName: c ? c.name : 'Unknown',
      courseIcon: c ? c.icon : 'fa-certificate',
      score: a.score,
      passed: a.passed,
      completedAt: a.completedAt
    };
  }));
  res.json({ history });
});

// ==================== HELPER: EXTRACT TOPIC FROM QUESTION ====================
function extractTopic(questionText, courseId) {
  if (!questionText) return null;

  const lowerText = questionText.toLowerCase();

  if (courseId === 'ncp') {
    if (lowerText.includes('osi') || (lowerText.includes('layer') && !lowerText.includes('data link'))) return 'Networking Fundamentals';
    if (lowerText.includes('subnet') || lowerText.includes('ip address') || lowerText.includes('cidr')) return 'IP Addressing & Subnetting';
    if (lowerText.includes('routing') || lowerText.includes('ospf') || lowerText.includes('bgp') || lowerText.includes('rip') || lowerText.includes('eigrp') || lowerText.includes('mpls')) return 'Routing Protocols';
    if (lowerText.includes('vlan') || lowerText.includes('switch') || lowerText.includes('layer 2')) return 'Switching & VLANs';
    if (lowerText.includes('wan') || lowerText.includes('nat') || lowerText.includes('frame relay') || lowerText.includes('atm')) return 'WAN Technologies';
    if (lowerText.includes('firewall') || lowerText.includes('security') || lowerText.includes('vpn') || lowerText.includes('ddos') || lowerText.includes('secure')) return 'Network Security Basics';
    if (lowerText.includes('wireless') || lowerText.includes('wifi') || lowerText.includes('5ghz') || lowerText.includes('802.11')) return 'Wireless Networking';
    if (lowerText.includes('ping') || lowerText.includes('troubleshoot') || lowerText.includes('loopback') || lowerText.includes('qos')) return 'Network Troubleshooting';
  }

  if (courseId === 'ccp') {
    if (lowerText.includes('cpu') || lowerText.includes('ram') || lowerText.includes('brain of computer') || lowerText.includes('input device') || lowerText.includes('ssd') || lowerText.includes('usb') || lowerText.includes('bios')) return 'Computer Fundamentals';
    if (lowerText.includes('hardware') || lowerText.includes('architecture')) return 'Hardware & Architecture';
    if (lowerText.includes('os function') || lowerText.includes('operating system') || lowerText.includes('linux') || lowerText.includes('gui') || lowerText.includes('open source')) return 'Operating Systems';
    if (lowerText.includes('programming') || lowerText.includes('javascript') || lowerText.includes('java') || lowerText.includes('c++') || lowerText.includes('web language')) return 'Programming Basics';
    if (lowerText.includes('http') || lowerText.includes('ip address') || (lowerText.includes('router') && lowerText.includes('packets')) || lowerText.includes('protocol')) return 'Networking Essentials';
    if (lowerText.includes('database') || lowerText.includes('sql')) return 'Database Fundamentals';
    if (lowerText.includes('web') || lowerText.includes('html') || lowerText.includes('css') || lowerText.includes('url')) return 'Web Technologies';
    if (lowerText.includes('malware') || lowerText.includes('phishing') || lowerText.includes('antivirus') || lowerText.includes('encryption') || lowerText.includes('firewall') || lowerText.includes('support') || lowerText.includes('troubleshoot')) return 'IT Support & Troubleshooting';
  }

  if (lowerText.includes('network') || lowerText.includes('protocol') || lowerText.includes('router') || lowerText.includes('switch')) return 'Networking';
  if (lowerText.includes('security') || lowerText.includes('firewall') || lowerText.includes('encrypt')) return 'Security';
  if (lowerText.includes('programming') || lowerText.includes('code') || lowerText.includes('software')) return 'Programming';
  if (lowerText.includes('hardware') || lowerText.includes('cpu') || lowerText.includes('memory')) return 'Hardware';
  if (lowerText.includes('database') || lowerText.includes('sql') || lowerText.includes('data')) return 'Databases';
  if (lowerText.includes('web') || lowerText.includes('html') || lowerText.includes('internet')) return 'Web Technologies';
  if (lowerText.includes('cloud') || lowerText.includes('server')) return 'Cloud Computing';
  if (lowerText.includes('os ') || lowerText.includes('operating system')) return 'Operating Systems';

  return 'General Concepts';
}

// ==================== FALLBACK QUESTIONS ====================
function getFallbackQuestions(courseId) {
  const fb = {
    ncp: [
      { text: 'What does OSI stand for?', options: ['Open System Interconnection', 'Open Source Integration', 'Operating System Interface', 'Online Service Integration'], correct: 0, _id: 'fb_ncp_0' },
      { text: 'Which OSI layer handles routing?', options: ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 4'], correct: 2, _id: 'fb_ncp_1' },
      { text: 'Reliable delivery protocol?', options: ['UDP', 'TCP', 'IP', 'ICMP'], correct: 1, _id: 'fb_ncp_2' },
      { text: 'Class C subnet mask?', options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], correct: 2, _id: 'fb_ncp_3' },
      { text: 'Link-state routing?', options: ['RIP', 'BGP', 'OSPF', 'EIGRP'], correct: 2, _id: 'fb_ncp_4' },
      { text: 'Layer 2 device?', options: ['Router', 'Switch', 'Hub', 'Repeater'], correct: 1, _id: 'fb_ncp_5' },
      { text: 'VLAN purpose?', options: ['Speed', 'Broadcast segmentation', 'Replace routers', 'Encryption'], correct: 1, _id: 'fb_ncp_6' },
      { text: 'Auto IP?', options: ['DNS', 'DHCP', 'HTTP', 'FTP'], correct: 1, _id: 'fb_ncp_7' },
      { text: 'Gigabit speed?', options: ['100 Mbps', '500 Mbps', '1000 Mbps', '10000 Mbps'], correct: 2, _id: 'fb_ncp_8' },
      { text: 'NAT?', options: ['Network Address Translation', 'Network Access Terminal', 'Node Auth Token', 'Network Allocation Table'], correct: 0, _id: 'fb_ncp_9' },
      { text: 'Firewall?', options: ['Speed', 'Filter traffic', 'Assign IPs', 'Manage users'], correct: 1, _id: 'fb_ncp_10' },
      { text: '5GHz WiFi?', options: ['802.11b', '802.11g', '802.11n', '802.11a'], correct: 3, _id: 'fb_ncp_11' },
      { text: 'Ping tests?', options: ['Bandwidth', 'Connectivity', 'Encryption', 'DNS'], correct: 1, _id: 'fb_ncp_12' },
      { text: 'DNS?', options: ['Assign IPs', 'Resolve names', 'Encrypt', 'Route'], correct: 1, _id: 'fb_ncp_13' },
      { text: 'BGP?', options: ['LAN', 'Internet routing', 'Wireless', 'Firewall'], correct: 1, _id: 'fb_ncp_14' },
      { text: 'Ethernet cable?', options: ['Coaxial', 'Fiber', 'Cat5e/Cat6', 'HDMI'], correct: 2, _id: 'fb_ncp_15' },
      { text: 'Loopback?', options: ['192.168.1.1', '10.0.0.1', '127.0.0.1', '255.255.255.0'], correct: 2, _id: 'fb_ncp_16' },
      { text: 'Secure remote?', options: ['Telnet', 'SSH', 'FTP', 'HTTP'], correct: 1, _id: 'fb_ncp_17' },
      { text: 'DDoS?', options: ['Data encryption', 'Distributed Denial of Service', 'Domain deletion', 'Data override'], correct: 1, _id: 'fb_ncp_18' },
      { text: 'Error detection layer?', options: ['Physical', 'Data Link', 'Network', 'Application'], correct: 1, _id: 'fb_ncp_19' },
      { text: 'Router?', options: ['Connect networks', 'Amplify', 'Store data', 'Display'], correct: 0, _id: 'fb_ncp_20' },
      { text: 'VPN?', options: ['Virtual Private Network', 'Very Personal Network', 'Virtual Protocol Node', 'Verified Public Network'], correct: 0, _id: 'fb_ncp_21' },
      { text: 'QoS?', options: ['Quality of Service', 'Quick OS', 'Query Optimization', 'Quantum Standard'], correct: 0, _id: 'fb_ncp_22' },
      { text: 'Subnet mask?', options: ['Identify network vs host', 'Encrypt', 'Speed', 'Assign IPs'], correct: 0, _id: 'fb_ncp_23' },
      { text: 'MPLS?', options: ['Frame Relay', 'ATM', 'MPLS VPN', 'ISDN'], correct: 2, _id: 'fb_ncp_24' }
    ],
    ccp: [
      { text: 'Brain of computer?', options: ['RAM', 'CPU', 'Hard Drive', 'Power Supply'], correct: 1, _id: 'fb_ccp_0' },
      { text: 'RAM?', options: ['Random Access Memory', 'Read Always Memory', 'Rapid App Module', 'Remote Access'], correct: 0, _id: 'fb_ccp_1' },
      { text: 'Input device?', options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'], correct: 2, _id: 'fb_ccp_2' },
      { text: 'Number system?', options: ['Decimal', 'Octal', 'Binary', 'Hexadecimal'], correct: 2, _id: 'fb_ccp_3' },
      { text: 'BIOS?', options: ['Basic Input Output System', 'Binary Integrated OS', 'Basic Integrated Software', 'Boot Input Service'], correct: 0, _id: 'fb_ccp_4' },
      { text: 'Open source OS?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correct: 2, _id: 'fb_ccp_5' },
      { text: 'GUI?', options: ['Graphical User Interface', 'General Utility Interface', 'Graphical Unified Integration', 'Global User Input'], correct: 0, _id: 'fb_ccp_6' },
      { text: 'HTTP?', options: ['HyperText Transfer Protocol', 'High Tech Transfer', 'HyperText Transmission', 'Host Transfer Protocol'], correct: 0, _id: 'fb_ccp_7' },
      { text: 'Web language?', options: ['C++', 'Java', 'JavaScript', 'Assembly'], correct: 2, _id: 'fb_ccp_8' },
      { text: 'Database?', options: ['Organized data', 'Hardware', 'Network protocol', 'OS'], correct: 0, _id: 'fb_ccp_9' },
      { text: 'SQL?', options: ['Structured Query Language', 'Simple Question Language', 'System Quality Logic', 'Standard Query Link'], correct: 0, _id: 'fb_ccp_10' },
      { text: 'Cloud?', options: ['Satellite', 'Internet-based services', 'No electricity', 'Weather'], correct: 1, _id: 'fb_ccp_11' },
      { text: 'IP address?', options: ['Provider Address', 'Unique network identifier', 'Internal Processing', 'Protocol Application'], correct: 1, _id: 'fb_ccp_12' },
      { text: 'HTML?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'HyperTransfer Markup', 'Host Technology Language'], correct: 0, _id: 'fb_ccp_13' },
      { text: 'Malware?', options: ['Malicious software', 'Hardware fault', 'Network error', 'OS bug'], correct: 0, _id: 'fb_ccp_14' },
      { text: 'OS function?', options: ['Manage HW/SW', 'Only run apps', 'Only store files', 'Only internet'], correct: 0, _id: 'fb_ccp_15' },
      { text: 'USB?', options: ['Universal Serial Bus', 'United System Bridge', 'Universal Service Buffer', 'Unified Storage Base'], correct: 0, _id: 'fb_ccp_16' },
      { text: 'Firewall?', options: ['Network security', 'File storage', 'Print', 'Run apps'], correct: 0, _id: 'fb_ccp_17' },
      { text: 'CSS?', options: ['Cascading Style Sheets', 'Computer Style System', 'Creative Style Software', 'Cascading System Styles'], correct: 0, _id: 'fb_ccp_18' },
      { text: 'Phishing?', options: ['Fishing', 'Fraud for info', 'Network test', 'Database query'], correct: 1, _id: 'fb_ccp_19' },
      { text: 'Antivirus?', options: ['Speed PC', 'Detect/remove malware', 'Create docs', 'Manage email'], correct: 1, _id: 'fb_ccp_20' },
      { text: 'SSD?', options: ['Solid State Drive', 'Super Speed Disk', 'System Storage Device', 'Serial Storage Disk'], correct: 0, _id: 'fb_ccp_21' },
      { text: 'URL?', options: ['Uniform Resource Locator', 'Universal Reference Link', 'Unified Resource Language', 'User Reference Locator'], correct: 0, _id: 'fb_ccp_22' },
      { text: 'Encryption?', options: ['Convert to code', 'Delete data', 'Copy data', 'Move data'], correct: 0, _id: 'fb_ccp_23' },
      { text: 'Router?', options: ['Forward packets', 'Store files', 'Display pages', 'Run apps'], correct: 0, _id: 'fb_ccp_24' }
    ]
  };
  const qs = fb[courseId] || fb['ncp'];
  return qs.map(q => ({ courseId, text: q.text, options: q.options, correct: q.correct, _id: q._id }));
}

module.exports = router;
