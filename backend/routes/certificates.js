const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON } = require('../utils/jsonDB');
const { generateCertificateId, getDateString, generateId } = require('../utils/helpers');

// Get user's certificates
router.get('/my-certificates', authenticate, async (req, res) => {
  const certificates = readJSON('certificates.json');
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  
  const earned = (certificates.earned || [])
    .filter(c => c.userId === req.user.id)
    .map(c => {
      const course = courses.find(crs => crs.id === c.courseId);
      return {
        id: c.id,
        certificateId: c.certificateId,
        courseId: c.courseId,
        courseName: course ? course.name : 'Unknown Course',
        score: c.score,
        issueDate: c.issueDate
      };
    });
  
  const pending = (certificates.pending || [])
    .filter(c => c.userId === req.user.id)
    .map(c => {
      const course = courses.find(crs => crs.id === c.courseId);
      return {
        id: c.id,
        courseId: c.courseId,
        courseName: course ? course.name : 'Unknown Course',
        score: c.score,
        submittedAt: c.submittedAt,
        status: c.status
      };
    });
  
  res.json({ earned, pending });
});

// Generate certificate HTML (for printing)
router.post('/generate/:certificateId', authenticate, async (req, res) => {
  const { certificateId } = req.params;
  
  const certificates = readJSON('certificates.json');
  const earned = certificates.earned || [];
  const cert = earned.find(c => c.certificateId === certificateId && c.userId === req.user.id);
  
  if (!cert) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  const users = readJSON('users.json');
  const user = users.find(u => u.id === cert.userId);
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  const course = courses.find(c => c.id === cert.courseId);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${course?.name}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; background: #fff; }
    .certificate { width: 800px; margin: 50px auto; padding: 40px; border: 10px solid #8b5cf6; text-align: center; background: linear-gradient(135deg, #fff 0%, #f0f0ff 100%); }
    h1 { font-size: 48px; color: #2c3e50; margin-bottom: 20px; }
    h2 { font-size: 24px; color: #8b5cf6; margin-bottom: 30px; }
    .student-name { font-size: 32px; color: #06b6d4; margin: 30px 0; font-weight: bold; }
    .course-name { font-size: 24px; color: #8b5cf6; margin: 20px 0; }
    .score { font-size: 18px; margin: 20px 0; }
    .certificate-id { font-size: 12px; color: #7f8c8d; margin-top: 40px; }
    .date { font-size: 14px; margin-top: 20px; }
    .seal { margin-top: 30px; font-size: 12px; color: #555; }
    @media print { .certificate { margin: 0; width: 100%; } }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>OBliXel Academy</h1>
    <h2>CERTIFICATE OF COMPLETION</h2>
    <p>This is to certify that</p>
    <div class="student-name">${user?.name || 'Student'}</div>
    <p>has successfully completed</p>
    <div class="course-name">${course?.name || 'Course'}</div>
    <p>with a score of ${cert.score}%</p>
    <div class="certificate-id">Certificate ID: ${cert.certificateId}</div>
    <div class="date">Issued on: ${cert.issueDate}</div>
    <div class="seal">OBliXel Academy | Authorized Certification</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
  
  res.send(html);
});

// Verify certificate (public)
router.get('/verify/:certificateId', async (req, res) => {
  const { certificateId } = req.params;
  const certificates = readJSON('certificates.json');
  const earned = certificates.earned || [];
  const cert = earned.find(c => c.certificateId === certificateId);
  
  if (!cert) {
    return res.status(404).json({ valid: false, message: 'Certificate not found' });
  }
  
  const users = readJSON('users.json');
  const user = users.find(u => u.id === cert.userId);
  const coursesData = readJSON('courses.json');
  const courses = coursesData.courses || coursesData;
  const course = courses.find(c => c.id === cert.courseId);
  
  res.json({
    valid: true,
    certificate: {
      certificateId: cert.certificateId,
      studentName: user?.name || 'Student',
      courseName: course?.name || 'Certification',
      issueDate: cert.issueDate,
      score: cert.score
    }
  });
});

module.exports = router;
