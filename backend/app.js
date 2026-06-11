require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files if they don't exist
const dataFiles = ['users.json', 'courses.json', 'enrollments.json', 'exams.json', 'payments.json', 'vouchers.json', 'module_progress.json'];
dataFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    console.log(`📁 Created ${file}`);
  }
});

// ==================== SEED ADMIN USER IF NO USERS EXIST ====================
const usersPath = path.join(dataDir, 'users.json');
let users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

if (users.length === 0) {
  console.log('👤 No users found. Creating admin user...');
  
  const adminEmail = process.env.ADMIN_EMAIL || 'mutaurijoe@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'JOELMUTAURI@2005';
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(adminPassword, salt);
  
  const adminUser = {
    id: uuidv4(),
    name: "Admin User",
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    avatar: "A",
    xp: 0,
    level: 1,
    streak: 0,
    totalSpent: 0,
    enrolledCourses: 0,
    createdAt: new Date().toISOString()
  };
  
  users.push(adminUser);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  console.log(`✅ Admin user created: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
} else {
  console.log(`👥 Found ${users.length} existing users`);
}

// ==================== SEED COURSES IF EMPTY ====================
const coursesPath = path.join(dataDir, 'courses.json');
let coursesData = fs.readFileSync(coursesPath, 'utf8');
let courses = JSON.parse(coursesData);

if (courses.length === 0 || !courses.length) {
  console.log('🌱 Seeding 30+ professional certifications...');
  
  const defaultCourses = [
    // Oblixel Certification Series (Branded)
    { id: "ona", name: "Oblixel Network Associate (ONA)", abbreviation: "ONA", level: "Associate", description: "Entry-level networking certification covering fundamentals of network protocols, OSI model, IP addressing, and basic routing.", examPrice: 299, pathPrice: 499, icon: "fa-network-wired", category: "Networking", color: "purple", enrolledCount: 1247, duration: "6 weeks", modules: 6 },
    { id: "onp", name: "Oblixel Network Professional (ONP)", abbreviation: "ONP", level: "Professional", description: "Advanced networking certification covering routing protocols, network security, VLANs, and network automation.", examPrice: 399, pathPrice: 649, icon: "fa-globe", category: "Networking", color: "purple", enrolledCount: 856, duration: "8 weeks", modules: 8, prerequisite: "ONA" },
    { id: "one", name: "Oblixel Network Expert (ONE)", abbreviation: "ONE", level: "Expert", description: "Expert-level networking certification for senior network architects covering MPLS, BGP, SD-WAN, and network design.", examPrice: 549, pathPrice: 849, icon: "fa-crown", category: "Networking", color: "purple", enrolledCount: 234, duration: "10 weeks", modules: 10, prerequisite: "ONP" },
    { id: "oca", name: "Oblixel Cybersecurity Associate (OCA)", abbreviation: "OCA", level: "Associate", description: "Entry-level cybersecurity certification covering security fundamentals, threat types, and basic defense mechanisms.", examPrice: 349, pathPrice: 549, icon: "fa-shield-haltered", category: "Cybersecurity", color: "cyan", enrolledCount: 1892, duration: "6 weeks", modules: 6 },
    { id: "ocp", name: "Oblixel Cybersecurity Professional (OCP)", abbreviation: "OCP", level: "Professional", description: "Professional cybersecurity certification covering ethical hacking, incident response, and security operations.", examPrice: 449, pathPrice: 699, icon: "fa-shield-virus", category: "Cybersecurity", color: "cyan", enrolledCount: 1123, duration: "8 weeks", modules: 8, prerequisite: "OCA" },
    { id: "oce", name: "Oblixel Cybersecurity Expert (OCE)", abbreviation: "OCE", level: "Expert", description: "Expert-level cybersecurity certification for security architects covering threat hunting, forensics, and red teaming.", examPrice: 599, pathPrice: 899, icon: "fa-skull", category: "Cybersecurity", color: "cyan", enrolledCount: 312, duration: "10 weeks", modules: 10, prerequisite: "OCP" },
    { id: "ocp-core", name: "Oblixel Certified Professional (OCP)", abbreviation: "OCP", level: "Foundation", description: "Core professional certification covering essential workplace skills, communication, and problem-solving.", examPrice: 199, pathPrice: 349, icon: "fa-certificate", category: "Professional Skills", color: "gold", enrolledCount: 3421, duration: "4 weeks", modules: 4 },
    { id: "ncp", name: "Network Certified Professional (NCP)", abbreviation: "NCP", level: "Professional", description: "Professional networking certification covering switching, routing, and network troubleshooting.", examPrice: 379, pathPrice: 599, icon: "fa-network-wired", category: "Networking", color: "blue", enrolledCount: 2156, duration: "7 weeks", modules: 7 },
    { id: "ccp", name: "Cybersecurity Certified Professional (CCP)", abbreviation: "CCP", level: "Professional", description: "Professional cybersecurity certification covering security frameworks, risk management, and compliance.", examPrice: 429, pathPrice: 679, icon: "fa-shield-haltered", category: "Cybersecurity", color: "red", enrolledCount: 1876, duration: "8 weeks", modules: 8 },
    { id: "tcp", name: "Telecommunications Certified Professional (TCP)", abbreviation: "TCP", level: "Professional", description: "Professional telecommunications certification covering VoIP, fiber optics, and 5G networks.", examPrice: 399, pathPrice: 629, icon: "fa-phone-alt", category: "Telecommunications", color: "green", enrolledCount: 876, duration: "7 weeks", modules: 7 },
    { id: "wdp", name: "Web Development Professional (WDP)", abbreviation: "WDP", level: "Professional", description: "Full-stack web development certification covering HTML, CSS, JavaScript, React, and Node.js.", examPrice: 449, pathPrice: 699, icon: "fa-code", category: "Development", color: "blue", enrolledCount: 3245, duration: "10 weeks", modules: 10 },
    { id: "adp", name: "App Development Professional (ADP)", abbreviation: "ADP", level: "Professional", description: "Mobile app development certification covering React Native, Flutter, iOS, and Android.", examPrice: 479, pathPrice: 729, icon: "fa-mobile-alt", category: "Development", color: "green", enrolledCount: 1876, duration: "10 weeks", modules: 10 },
    { id: "dap", name: "Data Analytics Professional (DAP)", abbreviation: "DAP", level: "Professional", description: "Data analytics certification covering SQL, Python, Excel, Tableau, and data visualization.", examPrice: 499, pathPrice: 749, icon: "fa-chart-bar", category: "Data Science", color: "teal", enrolledCount: 2341, duration: "9 weeks", modules: 9 },
    { id: "aip", name: "Artificial Intelligence Professional (AIP)", abbreviation: "AIP", level: "Professional", description: "AI certification covering machine learning, neural networks, NLP, and computer vision.", examPrice: 599, pathPrice: 899, icon: "fa-robot", category: "AI", color: "purple", enrolledCount: 1654, duration: "12 weeks", modules: 12 },
    { id: "clp", name: "Cloud Computing Professional (CLP)", abbreviation: "CLP", level: "Professional", description: "Cloud certification covering AWS, Azure, GCP, Kubernetes, and serverless architecture.", examPrice: 549, pathPrice: 799, icon: "fa-cloud", category: "Cloud", color: "cyan", enrolledCount: 2134, duration: "10 weeks", modules: 10 },
    { id: "dmp", name: "Digital Marketing Professional (DMP)", abbreviation: "DMP", level: "Professional", description: "Digital marketing certification covering SEO, SEM, social media, email, and content marketing.", examPrice: 399, pathPrice: 599, icon: "fa-chart-line", category: "Marketing", color: "orange", enrolledCount: 2876, duration: "8 weeks", modules: 8 },
    { id: "bap", name: "Business Administration Professional (BAP)", abbreviation: "BAP", level: "Professional", description: "Business administration certification covering management, operations, and business strategy.", examPrice: 379, pathPrice: 579, icon: "fa-building", category: "Business", color: "navy", enrolledCount: 1987, duration: "8 weeks", modules: 8 },
    { id: "fmp", name: "Financial Management Professional (FMP)", abbreviation: "FMP", level: "Professional", description: "Financial management certification covering accounting, budgeting, and financial analysis.", examPrice: 429, pathPrice: 649, icon: "fa-dollar-sign", category: "Finance", color: "green", enrolledCount: 1654, duration: "8 weeks", modules: 8 },
    { id: "pmp", name: "Project Management Professional (PMP)", abbreviation: "PMP", level: "Professional", description: "Project management certification covering Agile, Scrum, Waterfall, and PMBOK methodologies.", examPrice: 449, pathPrice: 699, icon: "fa-tasks", category: "Management", color: "blue", enrolledCount: 2987, duration: "8 weeks", modules: 8 },
    { id: "acp", name: "Accounting Certified Professional (ACP)", abbreviation: "ACP", level: "Professional", description: "Accounting certification covering financial accounting, managerial accounting, and tax basics.", examPrice: 399, pathPrice: 599, icon: "fa-calculator", category: "Finance", color: "teal", enrolledCount: 1234, duration: "7 weeks", modules: 7 },
    { id: "hrp", name: "Human Resources Professional (HRP)", abbreviation: "HRP", level: "Professional", description: "HR certification covering recruitment, employee relations, compensation, and labor laws.", examPrice: 379, pathPrice: 579, icon: "fa-users", category: "Business", color: "pink", enrolledCount: 1543, duration: "7 weeks", modules: 7 },
    { id: "mcp", name: "Mechanical Certified Professional (MCP)", abbreviation: "MCP", level: "Professional", description: "Mechanical engineering certification covering CAD, thermodynamics, and manufacturing processes.", examPrice: 449, pathPrice: 699, icon: "fa-cogs", category: "Engineering", color: "gray", enrolledCount: 987, duration: "10 weeks", modules: 10 },
    { id: "ecp", name: "Electrical Certified Professional (ECP)", abbreviation: "ECP", level: "Professional", description: "Electrical engineering certification covering circuits, power systems, and electronics.", examPrice: 449, pathPrice: 699, icon: "fa-bolt", category: "Engineering", color: "yellow", enrolledCount: 876, duration: "10 weeks", modules: 10 },
    { id: "acp-auto", name: "Automotive Certified Professional (ACP)", abbreviation: "ACP", level: "Professional", description: "Automotive certification covering vehicle diagnostics, electrical systems, and modern auto tech.", examPrice: 399, pathPrice: 599, icon: "fa-car", category: "Automotive", color: "red", enrolledCount: 765, duration: "8 weeks", modules: 8 },
    { id: "gdp", name: "Graphic Design Professional (GDP)", abbreviation: "GDP", level: "Professional", description: "Graphic design certification covering Photoshop, Illustrator, typography, and branding.", examPrice: 379, pathPrice: 579, icon: "fa-palette", category: "Design", color: "purple", enrolledCount: 2345, duration: "8 weeks", modules: 8 },
    { id: "mep", name: "Media Editing Professional (MEP)", abbreviation: "MEP", level: "Professional", description: "Media editing certification covering Premiere Pro, After Effects, DaVinci Resolve, and final cut.", examPrice: 399, pathPrice: 599, icon: "fa-video", category: "Media", color: "red", enrolledCount: 1567, duration: "8 weeks", modules: 8 },
    { id: "hsp", name: "Hardware Support Professional (HSP)", abbreviation: "HSP", level: "Professional", description: "Hardware support certification covering PC repair, troubleshooting, and IT support fundamentals.", examPrice: 349, pathPrice: 549, icon: "fa-desktop", category: "IT Support", color: "blue", enrolledCount: 1987, duration: "6 weeks", modules: 6 },
    { id: "csp", name: "Customer Service Professional (CSP)", abbreviation: "CSP", level: "Professional", description: "Customer service certification covering communication, conflict resolution, and client management.", examPrice: 299, pathPrice: 499, icon: "fa-headset", category: "Service", color: "green", enrolledCount: 2876, duration: "5 weeks", modules: 5 },
    { id: "esp", name: "Entrepreneurship Skills Professional (ESP)", abbreviation: "ESP", level: "Professional", description: "Entrepreneurship certification covering business planning, funding, marketing, and growth strategies.", examPrice: 429, pathPrice: 649, icon: "fa-chart-line", category: "Business", color: "gold", enrolledCount: 1432, duration: "8 weeks", modules: 8 },
    { id: "lcp", name: "Leadership Certified Professional (LCP)", abbreviation: "LCP", level: "Professional", description: "Leadership certification covering team management, decision making, and organizational behavior.", examPrice: 399, pathPrice: 599, icon: "fa-crown", category: "Leadership", color: "purple", enrolledCount: 1876, duration: "6 weeks", modules: 6 },
    { id: "ttp", name: "Technical Training Professional (TTP)", abbreviation: "TTP", level: "Professional", description: "Technical training certification covering instructional design, delivery methods, and assessment.", examPrice: 379, pathPrice: 579, icon: "fa-chalkboard-teacher", category: "Education", color: "blue", enrolledCount: 876, duration: "6 weeks", modules: 6 }
  ];
  
  courses = { courses: defaultCourses };
  fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2));
  console.log(`✅ Seeded ${defaultCourses.length} professional certifications`);
} else {
  const courseCount = courses.courses ? courses.courses.length : (courses.length || 0);
  console.log(`📚 Found ${courseCount} existing courses`);
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/community', require('./routes/community'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend');
console.log(`📁 Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// For any non-API route, send index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});

module.exports = app;
