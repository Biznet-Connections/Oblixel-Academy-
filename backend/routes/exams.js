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

function generateCertificateCode(courseId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `OBX-${courseId.toUpperCase()}-${code}`;
}

router.post('/start', authenticate, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user._id;
  if (!courseId) return res.status(400).json({ error: 'Course ID required' });

  try {
    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (!enrollment) return res.status(403).json({ error: 'Enroll first' });
    if (enrollment.cooldownUntil && enrollment.cooldownUntil > new Date()) {
      const daysLeft = Math.ceil((enrollment.cooldownUntil - new Date()) / (1000 * 60 * 60 * 24));
      return res.status(403).json({ error: 'Cooldown', message: `Retake in ${daysLeft} day(s).` });
    }
    const course = await Course.findOne({ courseId: courseId.toLowerCase() });
    const totalModules = course ? course.totalModules : 8;
    const completedCount = await ModuleProgress.countDocuments({ userId, courseId: courseId.toLowerCase(), completed: true });
    if (completedCount < totalModules) return res.status(403).json({ error: 'Not all modules done', completed: completedCount, total: totalModules });

    let questions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });
    if (questions.length < EXAM_TOTAL_QUESTIONS) questions = getFallbackQuestions(courseId);
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, EXAM_TOTAL_QUESTIONS);
    const safeQuestions = selected.map(q => ({ id: q._id, text: q.text, options: q.options }));

    const session = await ExamSession.create({ userId, courseId: courseId.toLowerCase(), startTime: new Date(), status: 'in_progress', questionCount: safeQuestions.length });
    res.json({ sessionId: session._id, questions: safeQuestions, totalQuestions: safeQuestions.length, timeLimit: EXAM_TIME_LIMIT, passingScore: EXAM_PASS_SCORE });
  } catch (error) { res.status(500).json({ error: 'Failed to start exam' }); }
});

router.post('/submit', authenticate, async (req, res) => {
  const { sessionId, courseId, answers, timeSpent } = req.body;
  const userId = req.user._id;
  if (!sessionId || !courseId || !answers) return res.status(400).json({ error: 'Missing fields' });
  try {
    const session = await ExamSession.findOne({ _id: sessionId, userId, courseId: courseId.toLowerCase() });
    if (!session) return res.status(400).json({ error: 'Invalid session' });
    if (session.status === 'completed') return res.status(400).json({ error: 'Already submitted' });

    let questions = await ExamQuestion.find({ courseId: courseId.toLowerCase() });
    if (questions.length === 0) questions = getFallbackQuestions(courseId);

    let correctCount = 0;
    const totalQuestions = Math.min(answers.length, questions.length);
    for (let i = 0; i < totalQuestions; i++) { if (answers[i] === questions[i].correct) correctCount++; }
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= EXAM_PASS_SCORE;

    const enrollment = await Enrollment.findOne({ userId, courseId: courseId.toLowerCase() });
    if (enrollment) {
      enrollment.examAttempts = (enrollment.examAttempts || 0) + 1;
      enrollment.lastExamDate = new Date();
      enrollment.score = score;
      if (passed) {
        enrollment.status = 'passed_waiting';
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
        const cd = new Date(); cd.setDate(cd.getDate() + EXAM_COOLDOWN_DAYS);
        enrollment.cooldownUntil = cd;
        enrollment.status = 'failed';
      }
      await enrollment.save();
    }

    await ExamAttempt.create({ userId, courseId: courseId.toLowerCase(), sessionId, score, passed, totalQuestions, correctCount, timeSpent: timeSpent || 0, completedAt: new Date() });
    session.status = 'completed'; session.completedAt = new Date(); session.score = score; session.passed = passed; await session.save();

    let retakePrice = null;
    if (!passed) { const course = await Course.findOne({ courseId: courseId.toLowerCase() }); if (course) retakePrice = Math.round(course.examPrice * 0.5 * 100) / 100; }

    // Get certificate code if passed
    let certificateCode = null;
    if (passed) {
      const cert = await Certificate.findOne({ userId, courseId: courseId.toLowerCase(), status: 'pending' }).sort({ submittedAt: -1 });
      if (cert) certificateCode = cert.certificateId;
    }

    // WhatsApp support number
    const supportWhatsApp = process.env.SUPPORT_WHATSAPP || '+263714587259';

    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      certificateCode,
      supportWhatsApp,
      message: passed
        ? `🎉 Congratulations! You passed with ${score}%! Your certificate code is: ${certificateCode}. Show this code to the academics team to claim your certificate.`
        : `❌ ${score}%. Need 70%. Retake in ${EXAM_COOLDOWN_DAYS} days.`,
      ...(retakePrice && { retakePrice, cooldownDays: EXAM_COOLDOWN_DAYS })
    });
  } catch (error) {
    console.error('[EXAM] Submit error:', error.message);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

router.get('/results/:courseId', authenticate, async (req, res) => {
  const attempts = await ExamAttempt.find({ userId: req.user._id, courseId: req.params.courseId.toLowerCase() }).sort({ completedAt: -1 });
  res.json({ attempts });
});

router.get('/history', authenticate, async (req, res) => {
  const attempts = await ExamAttempt.find({ userId: req.user._id }).sort({ completedAt: -1 });
  const history = await Promise.all(attempts.map(async (a) => {
    const c = await Course.findOne({ courseId: a.courseId });
    return { id: a._id, courseId: a.courseId, courseName: c ? c.name : 'Unknown', courseIcon: c ? c.icon : 'fa-certificate', score: a.score, passed: a.passed, completedAt: a.completedAt };
  }));
  res.json({ history });
});

function getFallbackQuestions(courseId) {
  const fb = {
    ncp: [
      { text: 'What does OSI stand for?', options: ['Open System Interconnection', 'Open Source Integration', 'Operating System Interface', 'Online Service Integration'], correct: 0 },
      { text: 'Which OSI layer handles routing?', options: ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 4'], correct: 2 },
      { text: 'Reliable delivery protocol?', options: ['UDP', 'TCP', 'IP', 'ICMP'], correct: 1 },
      { text: 'Class C subnet mask?', options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], correct: 2 },
      { text: 'Link-state routing?', options: ['RIP', 'BGP', 'OSPF', 'EIGRP'], correct: 2 },
      { text: 'Layer 2 device?', options: ['Router', 'Switch', 'Hub', 'Repeater'], correct: 1 },
      { text: 'VLAN purpose?', options: ['Speed', 'Broadcast segmentation', 'Replace routers', 'Encryption'], correct: 1 },
      { text: 'Auto IP?', options: ['DNS', 'DHCP', 'HTTP', 'FTP'], correct: 1 },
      { text: 'Gigabit speed?', options: ['100 Mbps', '500 Mbps', '1000 Mbps', '10000 Mbps'], correct: 2 },
      { text: 'NAT?', options: ['Network Address Translation', 'Network Access Terminal', 'Node Auth Token', 'Network Allocation Table'], correct: 0 },
      { text: 'Firewall?', options: ['Speed', 'Filter traffic', 'Assign IPs', 'Manage users'], correct: 1 },
      { text: '5GHz WiFi?', options: ['802.11b', '802.11g', '802.11n', '802.11a'], correct: 3 },
      { text: 'Ping tests?', options: ['Bandwidth', 'Connectivity', 'Encryption', 'DNS'], correct: 1 },
      { text: 'DNS?', options: ['Assign IPs', 'Resolve names', 'Encrypt', 'Route'], correct: 1 },
      { text: 'BGP?', options: ['LAN', 'Internet routing', 'Wireless', 'Firewall'], correct: 1 },
      { text: 'Ethernet cable?', options: ['Coaxial', 'Fiber', 'Cat5e/Cat6', 'HDMI'], correct: 2 },
      { text: 'Loopback?', options: ['192.168.1.1', '10.0.0.1', '127.0.0.1', '255.255.255.0'], correct: 2 },
      { text: 'Secure remote?', options: ['Telnet', 'SSH', 'FTP', 'HTTP'], correct: 1 },
      { text: 'DDoS?', options: ['Data encryption', 'Distributed Denial of Service', 'Domain deletion', 'Data override'], correct: 1 },
      { text: 'Error detection layer?', options: ['Physical', 'Data Link', 'Network', 'Application'], correct: 1 },
      { text: 'Router?', options: ['Connect networks', 'Amplify', 'Store data', 'Display'], correct: 0 },
      { text: 'VPN?', options: ['Virtual Private Network', 'Very Personal Network', 'Virtual Protocol Node', 'Verified Public Network'], correct: 0 },
      { text: 'QoS?', options: ['Quality of Service', 'Quick OS', 'Query Optimization', 'Quantum Standard'], correct: 0 },
      { text: 'Subnet mask?', options: ['Identify network vs host', 'Encrypt', 'Speed', 'Assign IPs'], correct: 0 },
      { text: 'MPLS?', options: ['Frame Relay', 'ATM', 'MPLS VPN', 'ISDN'], correct: 2 }
    ],
    ccp: [
      { text: 'Brain of computer?', options: ['RAM', 'CPU', 'Hard Drive', 'Power Supply'], correct: 1 },
      { text: 'RAM?', options: ['Random Access Memory', 'Read Always Memory', 'Rapid App Module', 'Remote Access'], correct: 0 },
      { text: 'Input device?', options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'], correct: 2 },
      { text: 'Number system?', options: ['Decimal', 'Octal', 'Binary', 'Hexadecimal'], correct: 2 },
      { text: 'BIOS?', options: ['Basic Input Output System', 'Binary Integrated OS', 'Basic Integrated Software', 'Boot Input Service'], correct: 0 },
      { text: 'Open source OS?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correct: 2 },
      { text: 'GUI?', options: ['Graphical User Interface', 'General Utility Interface', 'Graphical Unified Integration', 'Global User Input'], correct: 0 },
      { text: 'HTTP?', options: ['HyperText Transfer Protocol', 'High Tech Transfer', 'HyperText Transmission', 'Host Transfer Protocol'], correct: 0 },
      { text: 'Web language?', options: ['C++', 'Java', 'JavaScript', 'Assembly'], correct: 2 },
      { text: 'Database?', options: ['Organized data', 'Hardware', 'Network protocol', 'OS'], correct: 0 },
      { text: 'SQL?', options: ['Structured Query Language', 'Simple Question Language', 'System Quality Logic', 'Standard Query Link'], correct: 0 },
      { text: 'Cloud?', options: ['Satellite', 'Internet-based services', 'No electricity', 'Weather'], correct: 1 },
      { text: 'IP address?', options: ['Provider Address', 'Unique network identifier', 'Internal Processing', 'Protocol Application'], correct: 1 },
      { text: 'HTML?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'HyperTransfer Markup', 'Host Technology Language'], correct: 0 },
      { text: 'Malware?', options: ['Malicious software', 'Hardware fault', 'Network error', 'OS bug'], correct: 0 },
      { text: 'OS function?', options: ['Manage HW/SW', 'Only run apps', 'Only store files', 'Only internet'], correct: 0 },
      { text: 'USB?', options: ['Universal Serial Bus', 'United System Bridge', 'Universal Service Buffer', 'Unified Storage Base'], correct: 0 },
      { text: 'Firewall?', options: ['Network security', 'File storage', 'Print', 'Run apps'], correct: 0 },
      { text: 'CSS?', options: ['Cascading Style Sheets', 'Computer Style System', 'Creative Style Software', 'Cascading System Styles'], correct: 0 },
      { text: 'Phishing?', options: ['Fishing', 'Fraud for info', 'Network test', 'Database query'], correct: 1 },
      { text: 'Antivirus?', options: ['Speed PC', 'Detect/remove malware', 'Create docs', 'Manage email'], correct: 1 },
      { text: 'SSD?', options: ['Solid State Drive', 'Super Speed Disk', 'System Storage Device', 'Serial Storage Disk'], correct: 0 },
      { text: 'URL?', options: ['Uniform Resource Locator', 'Universal Reference Link', 'Unified Resource Language', 'User Reference Locator'], correct: 0 },
      { text: 'Encryption?', options: ['Convert to code', 'Delete data', 'Copy data', 'Move data'], correct: 0 },
      { text: 'Router?', options: ['Forward packets', 'Store files', 'Display pages', 'Run apps'], correct: 0 }
    ]
  };
  const qs = fb[courseId] || fb['ncp'];
  return qs.map((q, i) => ({ courseId, text: q.text, options: q.options, correct: q.correct, _id: `fb_${courseId}_${i}` }));
}

module.exports = router;
