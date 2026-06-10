require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ENSURE DATA DIRECTORY EXISTS ====================
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files if they don't exist
const dataFiles = ['users.json', 'courses.json', 'enrollments.json', 'exams.json', 'payments.json', 'vouchers.json', 'module_progress.json'];
dataFiles.forEach(file => {
  // Seed courses if empty
  try {
    const coursesPath = path.join(dataDir, "courses.json");
    const coursesData = fs.readFileSync(coursesPath, "utf8");
    const parsed = JSON.parse(coursesData);
    if (!parsed.courses || parsed.courses.length === 0) {
      console.log("🌱 Seeding courses...");
      require("./seedCourses");
    } else {
      console.log(`📚 Found ${parsed.courses.length} existing courses`);
    }
  } catch (e) {
    console.log("🌱 Seeding courses...");
    require("./seedCourses");
  }
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    console.log(`📁 Created ${file}`);
  }
});

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/community', require('./routes/community'));

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== SERVE FRONTEND STATIC FILES ====================
// This is the KEY change for Render - serves your HTML/CSS/JS files
const frontendPath = path.join(__dirname, '../frontend');
console.log(`📁 Serving frontend from: ${frontendPath}`);

app.use(express.static(frontendPath));

// For any non-API route, send index.html (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// ==================== ERROR HANDLING MIDDLEWARE ====================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// ==================== 404 HANDLER FOR API ====================
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});

module.exports = app;
