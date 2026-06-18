// ==================== obliXel Academy v10.0 - COMPLETE APP.JS PART 1 ====================
// DEPLOYMENT READY: Single server (backend serves frontend)
// v10: NCP & CCP replace ONA & ONP, AI Widget landing page only, voucher instant auto-enroll
// Module quizzes: 10 questions, 70% pass, retry shuffles
// Notes: clean • bullets, AI Teacher unique UI vs Widget
// Facebook: https://www.facebook.com/obliXel
console.log('🚀 obliXel Academy v10.0 - Loading Complete App Part 1');

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentPage = "landing";
let coursesData = [];
let currentCourseModules = null;
let currentModuleProgress = null;
let currentQuizQuestions = null;
let currentQuizOriginalOrder = null; // For shuffling on retry
let currentExamSession = null;
let examTimerInterval = null;
let lastScrollY = 0;
let navbarVisible = true;
let userEnrollmentsCache = []; // Cache enrollments to check already-enrolled

// AI Chat History (remembers conversation until widget is closed)
let aiChatHistory = [
  { role: "assistant", content: "Hi! I'm ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓" }
];

// Track if AI widget conversation is active (persists until user closes)
let aiWidgetActive = false;

// Auto-detect API URL - works on localhost AND Render!
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

console.log('[APP] Using API_BASE_URL:', API_BASE_URL);

// ==================== HELPER FUNCTIONS ====================
function showToast(message, type = "info") {
  console.log(`[TOAST] ${type}: ${message}`);
  const toast = document.createElement('div');
  toast.className = "toast-msg";
  let icon = 'fa-bell';
  let color = 'text-cyan-400';

  if (type === 'success') {
    icon = 'fa-circle-check';
    color = 'text-green-400';
  } else if (type === 'error') {
    icon = 'fa-circle-exclamation';
    color = 'text-red-400';
  } else if (type === 'warning') {
    icon = 'fa-triangle-exclamation';
    color = 'text-yellow-400';
  }

  toast.innerHTML = `<i class="fa-solid ${icon} ${color} mr-2"></i>${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function debugLog(action, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 ${action}`, data ? data : '');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Round money to 2 decimal places
function formatMoney(amount) {
  return parseFloat(amount || 0).toFixed(2);
}

// ==================== PASSWORD VALIDATION - SIMPLE (ONLY LENGTH >= 5) ====================
function isPasswordValid(password) {
  return password.length >= 5;
}

// ==================== PASSWORD INPUT FIX - STRONG FORCE LTR ====================
function fixPasswordInputs() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    if (!input) return;

    input.setAttribute('dir', 'ltr');
    input.style.direction = 'ltr';
    input.style.unicodeBidi = 'normal';
    input.style.textAlign = 'left';
    input.style.letterSpacing = 'normal';
    input.style.setProperty('direction', 'ltr', 'important');
    input.style.setProperty('unicode-bidi', 'normal', 'important');

    input.classList.remove('rtl', 'text-right', 'text-center');
    input.removeAttribute('dir');
    input.setAttribute('dir', 'ltr');

    let cursorPos = 0;

    input.addEventListener('input', function(e) {
      cursorPos = this.selectionStart;
      this.style.direction = 'ltr';
      this.style.unicodeBidi = 'normal';
      const currentValue = this.value;
      this.value = currentValue;
      setTimeout(() => {
        if (this.selectionStart !== cursorPos) {
          this.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    });

    input.addEventListener('keydown', function() {
      this.style.direction = 'ltr';
      this.style.unicodeBidi = 'normal';
      cursorPos = this.selectionStart;
    });

    input.addEventListener('focus', function() {
      this.style.direction = 'ltr';
      this.style.unicodeBidi = 'normal';
      cursorPos = this.selectionStart;
    });

    input.addEventListener('blur', function() {
      this.style.direction = 'ltr';
      this.style.unicodeBidi = 'normal';
    });
  });
}

function applyAllPasswordFixes() {
  setTimeout(() => {
    fixPasswordInputs();
  }, 50);
}

// ==================== API REQUEST FUNCTION ====================
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  debugLog(`API ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (error) {
    debugLog(`API Error: ${error.message}`);
    throw error;
  }
}

// ==================== NAVBAR STYLE BASED ON LOGIN STATE ====================
function updateNavbarStyle() {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;

  if (currentUser) {
    navbar.classList.remove('landing-navbar');
    navbar.classList.add('dashboard-navbar');
    const logo = document.getElementById('navbarLogo');
    if (logo) logo.style.display = 'none';
    const hamburger = document.getElementById('mobileMenuBtn');
    if (hamburger) hamburger.style.display = 'block';
  } else {
    navbar.classList.remove('dashboard-navbar');
    navbar.classList.add('landing-navbar');
    const logo = document.getElementById('navbarLogo');
    if (logo) logo.style.display = 'flex';
    const hamburger = document.getElementById('mobileMenuBtn');
    if (hamburger) hamburger.style.display = 'none';
  }
}

// ==================== NAVBAR AUTO-HIDE ON SCROLL ====================
function initNavbarAutoHide() {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      if (navbarVisible) {
        navbar.classList.add('navbar-hidden');
        navbarVisible = false;
      }
    } else {
      if (!navbarVisible) {
        navbar.classList.remove('navbar-hidden');
        navbarVisible = true;
      }
    }
    lastScrollY = currentScrollY;
  });

  document.addEventListener('touchstart', (e) => {
    if (e.touches[0].clientY < 80 && !navbarVisible) {
      navbar.classList.remove('navbar-hidden');
      navbarVisible = true;
      setTimeout(() => {
        if (window.scrollY > 100 && navbarVisible) {
          navbar.classList.add('navbar-hidden');
          navbarVisible = false;
        }
      }, 3000);
    }
  });
}

// ==================== AUTH API CALLS ====================
async function register(name, email, password) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
}

async function login(email, password, rememberMe) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe })
  });
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
    }
  }
  return data;
}

async function getCurrentUser() {
  return apiRequest('/auth/me');
}

async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  currentUser = null;
  userEnrollmentsCache = [];
  aiChatHistory = [
    { role: "assistant", content: "Hi! I'm ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓" }
  ];
  aiWidgetActive = false;
  updateAuthUI();
  updateNavbarStyle();
  renderPage('landing');
  showToast('Logged out successfully', 'success');
}

// ==================== COURSE API CALLS ====================
async function getCourses() {
  const data = await apiRequest('/courses');
  return data.courses || [];
}

async function getCourseDetails(courseId) {
  return apiRequest(`/courses/${courseId}`);
}

async function enroll(courseId, type, voucherCode = null) {
  return apiRequest('/courses/enroll', {
    method: 'POST',
    body: JSON.stringify({ courseId, type, voucherCode })
  });
}

async function getMyEnrollments() {
  return apiRequest('/courses/enrollments/me');
}

async function getModuleProgress(courseId) {
  return apiRequest(`/courses/${courseId}/progress`);
}

async function completeModule(courseId, moduleId, quizScore) {
  return apiRequest(`/courses/${courseId}/modules/${moduleId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ quizScore })
  });
}

// ==================== EXAM API CALLS ====================
async function startExam(courseId) {
  return apiRequest('/exams/start', {
    method: 'POST',
    body: JSON.stringify({ courseId })
  });
}

async function submitExam(sessionId, courseId, answers, timeSpent) {
  return apiRequest('/exams/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, courseId, answers, timeSpent })
  });
}

// ==================== CERTIFICATE API CALLS ====================
async function getMyCertificates() {
  return apiRequest('/certificates/my-certificates');
}

// ==================== PAYMENT API CALLS ====================
async function createCheckout(courseId, type, voucherCode, billingInfo) {
  return apiRequest('/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ courseId, type, voucherCode, billingInfo })
  });
}

async function confirmPayment(sessionId, paymentMethod, billingInfo) {
  return apiRequest(`/payments/confirm-payment/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod, billingInfo })
  });
}

async function validateVoucher(code, courseId) {
  console.log(`[VOUCHER] Validating code: ${code} for course: ${courseId}`);
  try {
    const response = await apiRequest('/payments/validate-voucher', {
      method: 'POST',
      body: JSON.stringify({ code, courseId })
    });
    console.log('[VOUCHER] Response:', response);
    return response;
  } catch (error) {
    console.error('[VOUCHER] Error:', error);
    return { valid: false, message: error.message || 'Failed to validate voucher' };
  }
}

// ==================== AI API CALLS ====================
async function sendAIMessage(message) {
  try {
    aiChatHistory.push({ role: "user", content: message });

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        history: aiChatHistory.slice(-20)
      })
    });
    const data = await response.json();
    const aiResponse = data.response || data.message || "I'm here to help!";

    let formattedResponse = aiResponse;
    const whatsappNumber = "+263714587259";
    if (aiResponse.includes(whatsappNumber)) {
      formattedResponse = aiResponse.replace(
        new RegExp(escapeRegex(whatsappNumber), 'g'),
        `<a href="https://wa.me/${whatsappNumber.replace(/\+/g, '')}" target="_blank" class="whatsapp-link">${whatsappNumber}</a>`
      );
    }

    aiChatHistory.push({ role: "assistant", content: aiResponse });
    return { response: formattedResponse };
  } catch (error) {
    console.error('[AI] Error:', error);
    return { response: "Sorry, I'm having trouble connecting. Please try again later." };
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateAINotes(courseId, moduleName) {
  return apiRequest('/ai/generate-notes', {
    method: 'POST',
    body: JSON.stringify({ courseId, moduleName })
  });
}

async function generateAIGuiz(courseId, moduleName, topic) {
  return apiRequest('/ai/generate-quiz', {
    method: 'POST',
    body: JSON.stringify({ courseId, moduleName, topic, numberOfQuestions: 10 })
  });
}

// ==================== USER API CALLS ====================
async function getUserProfile() {
  return apiRequest('/user/profile');
}

async function updateUserProfile(data) {
  return apiRequest('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteAccount(confirm) {
  return apiRequest('/user/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmDelete: confirm })
  });
}

// ==================== ADMIN API CALLS ====================
async function getAdminStats() {
  return apiRequest('/admin/stats');
}

async function getAllUsers() {
  return apiRequest('/admin/users');
}

async function makeAdmin(userId) {
  return apiRequest('/admin/make-admin', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

async function removeAdmin(userId) {
  return apiRequest('/admin/remove-admin', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

async function createCourse(courseData) {
  return apiRequest('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
}

async function updateCourse(courseId, courseData) {
  return apiRequest(`/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(courseData)
  });
}

async function deleteCourse(courseId) {
  return apiRequest(`/admin/courses/${courseId}`, {
    method: 'DELETE'
  });
}

async function createVoucher(voucherData) {
  return apiRequest('/admin/vouchers', {
    method: 'POST',
    body: JSON.stringify(voucherData)
  });
}

async function createBatchVouchers(batchData) {
  return apiRequest('/admin/vouchers/batch', {
    method: 'POST',
    body: JSON.stringify(batchData)
  });
}

async function getVouchers() {
  return apiRequest('/admin/vouchers');
}

async function deleteVoucher(voucherId) {
  return apiRequest(`/admin/vouchers/${voucherId}`, {
    method: 'DELETE'
  });
}

async function deleteUserByAdmin(userId) {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE'
  });
}

async function getPendingCertificates() {
  return apiRequest('/admin/pending-certificates');
}

async function approveCertificate(pendingId) {
  return apiRequest('/admin/certificates/approve', {
    method: 'POST',
    body: JSON.stringify({ pendingId })
  });
}

async function rejectCertificate(pendingId, reason) {
  return apiRequest('/admin/certificates/reject', {
    method: 'POST',
    body: JSON.stringify({ pendingId, reason })
  });
}

async function getFinanceData() {
  return apiRequest('/admin/finance');
}

// ==================== YOUTUBE METADATA ====================
async function getYouTubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^/]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchYouTubeMetadata(url) {
  const videoId = await getYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    const data = await response.json();

    return {
      videoId,
      title: data.title,
      channel: data.author_name,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    console.error('Failed to fetch YouTube metadata:', error);
    return {
      videoId,
      title: 'Watch Video',
      channel: 'YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }
}

function renderYouTubeCard(metadata) {
  if (!metadata) return '';
  return `
    <div class="youtube-card glass rounded-xl overflow-hidden">
      <a href="${metadata.watchUrl}" target="_blank" rel="noopener noreferrer" class="block">
        <div class="relative">
          <img src="${metadata.thumbnail}" alt="${metadata.title}" class="w-full object-cover">
          <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition">
            <i class="fa-solid fa-play text-5xl text-white"></i>
          </div>
        </div>
        <div class="p-3">
          <h4 class="font-semibold text-sm">${escapeHtml(metadata.title)}</h4>
          <p class="text-gray-400 text-xs mt-1"><i class="fab fa-youtube text-red-500 mr-1"></i>${escapeHtml(metadata.channel)}</p>
        </div>
      </a>
    </div>
  `;
}

// ==================== CHECK AUTH STATUS ====================
async function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  try {
    const data = await getCurrentUser();
    currentUser = data.user || data;
    debugLog('User authenticated', { name: currentUser.name, role: currentUser.role });
    // Cache enrollments after auth
    try {
      const enrollmentData = await getMyEnrollments();
      userEnrollmentsCache = enrollmentData.enrollments || [];
    } catch (e) {
      userEnrollmentsCache = [];
    }
    return true;
  } catch (e) {
    localStorage.removeItem('auth_token');
    currentUser = null;
    userEnrollmentsCache = [];
    return false;
  }
}

// Check if user is already enrolled in a course
function isAlreadyEnrolled(courseId) {
  return userEnrollmentsCache.some(e => e.courseId === courseId);
}

// Get enrollment for a course
function getEnrollmentForCourse(courseId) {
  return userEnrollmentsCache.find(e => e.courseId === courseId);
}

// ==================== UPDATE NAVIGATION UI ====================
function updateAuthUI() {
  const authDiv = document.getElementById('auth-buttons');
  const userControls = document.getElementById('user-controls');
  const avatar = document.getElementById('user-avatar');
  const adminLink = document.getElementById('admin-nav-link');
  const adminLinkMobile = document.getElementById('admin-nav-link-mobile');
  const logoutBtn = document.getElementById('logout-btn');
  const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
  const aiBtn = document.getElementById('aiChatButton');
  const navLinks = document.querySelectorAll('.nav-link, .nav-link-mobile');
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburgerBtn = document.getElementById('mobileMenuBtn');

  if (currentUser) {
    if (authDiv) authDiv.classList.add('hidden');
    if (userControls) userControls.classList.remove('hidden');
    if (avatar) avatar.innerText = currentUser.avatar || currentUser.name?.charAt(0) || 'U';
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
    // AI chat button HIDDEN when logged in (only on landing page)
    if (aiBtn) aiBtn.classList.add('hidden');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';

    const navbarLogo = document.getElementById('navbarLogo');
    if (navbarLogo) navbarLogo.style.display = 'none';

    if (currentUser.role === 'admin') {
      if (adminLink) adminLink.classList.remove('hidden');
      if (adminLinkMobile) adminLinkMobile.classList.remove('hidden');
    } else {
      if (adminLink) adminLink.classList.add('hidden');
      if (adminLinkMobile) adminLinkMobile.classList.add('hidden');
    }

    navLinks.forEach(link => {
      if (link.classList.contains('nav-link') || link.classList.contains('nav-link-mobile')) {
        link.style.display = 'flex';
      }
    });

    if (mobileMenu) mobileMenu.classList.add('hidden');
  } else {
    if (authDiv) authDiv.classList.remove('hidden');
    if (userControls) userControls.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
    // Show AI chat button on landing page (when not logged in)
    if (aiBtn) aiBtn.classList.remove('hidden');
    if (hamburgerBtn) hamburgerBtn.style.display = 'none';

    const navbarLogo = document.getElementById('navbarLogo');
    if (navbarLogo) navbarLogo.style.display = 'flex';

    navLinks.forEach(link => {
      if (link.classList.contains('nav-link') || link.classList.contains('nav-link-mobile')) {
        link.style.display = 'none';
      }
    });

    if (adminLink) adminLink.classList.add('hidden');
    if (adminLinkMobile) adminLinkMobile.classList.add('hidden');
    if (mobileMenu) mobileMenu.classList.add('hidden');
  }
}

// ==================== LOAD COURSES ====================
async function loadCourses() {
  try {
    const data = await getCourses();
    coursesData = data;
    console.log(`✅ Loaded ${coursesData.length} courses successfully`);
    return coursesData;
  } catch (error) {
    console.error('❌ Failed to load courses:', error);
    coursesData = [];
    return [];
  }
}

// ==================== PAGE RENDERING DISPATCHER ====================
function renderPage(page) {
  if (currentUser && page === 'landing') {
    page = 'dashboard';
  }

  currentPage = page;
  debugLog(`Rendering page: ${page}`);

  if (page === 'landing') renderLandingPage();
  else if (page === 'dashboard') renderDashboard();
  else if (page === 'courses') renderCourses();
  else if (page === 'exams') renderExams();
  else if (page === 'certificates') renderCertificates();
  else if (page === 'profile') renderProfile();
  else if (page === 'admin') renderAdmin();
  else if (page === 'community') {
    window.open('https://whatsapp.com/channel/0029Vb8ApfmC6Zvo5QJ5LO3R', '_blank');
    renderPage('dashboard');
  }
  else if (page === 'login') renderLogin();
  else if (page === 'register') renderRegister();
  else renderLandingPage();
}

// ==================== END OF PART 1 ====================
console.log('✅ Part 1 (Core & Auth) loaded - NCP/CCP ready, AI Widget landing only, Voucher instant auto-enroll, 10 questions per module, 70% pass');
// ==================== PART 2: USER FEATURES & PAGES ====================
console.log('🚀 Loading Part 2 (All Pages, AI Teacher, Final Exam, Admin Reorder, Add Admin, Like/Dislike, Certificate Codes)');

// ==================== LANDING PAGE ====================
function renderLandingPage() {
  console.log('🏠 Rendering landing page with', coursesData.length, 'courses');
  const root = document.getElementById('app-root');

  // NCP and CCP first, then remaining courses
  const ncpCourse = coursesData.find(c => c.id === 'ncp');
  const ccpCourse = coursesData.find(c => c.id === 'ccp');
  const otherCourses = coursesData.filter(c => c.id !== 'ncp' && c.id !== 'ccp');
  const featuredCourses = [ncpCourse, ccpCourse, ...otherCourses].filter(Boolean).slice(0, 6);

  const globalPartners = [
    { name: "Google", icon: "fab fa-google", url: "https://cloud.google.com", color: "#4285F4" },
    { name: "AWS", icon: "fab fa-aws", url: "https://aws.amazon.com", color: "#FF9900" },
    { name: "Meta", icon: "fab fa-meta", url: "https://meta.com", color: "#0064E1" },
    { name: "Microsoft", icon: "fab fa-microsoft", url: "https://microsoft.com", color: "#00A4EF" },
    { name: "IBM", icon: "fab fa-ibm", url: "https://ibm.com", color: "#052FAD" },
    { name: "Harvard", icon: "fas fa-university", url: "https://harvard.edu", color: "#A51C30" },
    { name: "MIT", icon: "fas fa-link", url: "https://mit.edu", color: "#A31F34" },
    { name: "Stanford", icon: "fas fa-robot", url: "https://stanford.edu", color: "#8C1515" }
  ];

  const marqueePartners = [
    { name: "Google", icon: "fab fa-google", color: "#4285F4" },
    { name: "Cisco", icon: "fab fa-cisco", color: "#1BA0D7" },
    { name: "AWS", icon: "fab fa-aws", color: "#FF9900" },
    { name: "Microsoft", icon: "fab fa-microsoft", color: "#00A4EF" },
    { name: "Meta", icon: "fab fa-meta", color: "#0064E1" }
  ];

  root.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <section class="min-h-[80vh] flex items-center">
        <div class="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">
          <div data-aos="fade-right">
            <p class="uppercase tracking-[6px] text-cyan-400 text-sm mb-5">Future Of Professional Certification</p>
            <h1 class="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight">Build Your <span class="gradient-text">Global Skills</span></h1>
            <p class="mt-4 sm:mt-6 text-gray-400 text-sm sm:text-base lg:text-lg">Enterprise-level certification platform. Join 42,000+ successful professionals with 25+ certifications including NCP & CCP.</p>
            <div class="flex gap-3 sm:gap-5 mt-6 sm:mt-10">
              <button id="landingStartBtn" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 sm:px-8 py-2 sm:py-4 rounded-2xl font-bold text-sm sm:text-base glow">Start Learning</button>
              <button id="landingExploreBtn" class="glass px-5 sm:px-8 py-2 sm:py-4 rounded-2xl font-bold text-sm sm:text-base">Explore</button>
            </div>
            <div class="flex gap-4 sm:gap-10 mt-8 sm:mt-12">
              <div><h2 class="text-3xl sm:text-4xl font-black gradient-text">42,000+</h2><p class="text-gray-400 text-xs sm:text-sm">Students</p></div>
              <div><h2 class="text-3xl sm:text-4xl font-black gradient-text">${coursesData.length}+</h2><p class="text-gray-400 text-xs sm:text-sm">Certifications</p></div>
              <div><h2 class="text-3xl sm:text-4xl font-black gradient-text">98%</h2><p class="text-gray-400 text-xs sm:text-sm">Success</p></div>
            </div>
          </div>
          <div data-aos="fade-left">
            <div class="glass rounded-3xl p-5 sm:p-6 glow">
              <div class="flex justify-between items-center mb-4 sm:mb-8">
                <div><h2 class="font-bold text-xl sm:text-2xl">Student Dashboard</h2><p class="text-gray-400 text-xs sm:text-sm">Certification Portal</p></div>
                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center font-black text-sm sm:text-xl">${currentUser ? (currentUser.avatar || currentUser.name?.charAt(0) || 'U') : '👤'}</div>
              </div>
              <div class="stats-grid">
                <div class="glass rounded-2xl p-3 sm:p-5 text-center"><i class="fa-solid fa-graduation-cap text-cyan-400 text-xl sm:text-3xl"></i><h3 class="mt-2 sm:mt-4 text-xl sm:text-3xl font-black">0</h3><p class="text-gray-400 text-xs sm:text-sm">Enrolled</p></div>
                <div class="glass rounded-2xl p-3 sm:p-5 text-center"><i class="fa-solid fa-award text-purple-400 text-xl sm:text-3xl"></i><h3 class="mt-2 sm:mt-4 text-xl sm:text-3xl font-black">0</h3><p class="text-gray-400 text-xs sm:text-sm">Certificates</p></div>
              </div>
              ${!currentUser ? `<div class="mt-4 sm:mt-6 p-2 sm:p-4 bg-purple-500/20 rounded-2xl text-center"><p class="text-xs sm:text-sm">✨ <a href="#" id="guestSignupBtn" class="text-cyan-400 font-bold">Sign up</a> to see your dashboard</p></div>` : `<div class="mt-3 sm:mt-4 text-center text-green-400 text-xs sm:text-sm"><i class="fa-regular fa-circle-check mr-1"></i> Welcome back, ${currentUser.name}!</div>`}
            </div>
          </div>
        </div>
      </section>

      <section class="py-6 sm:py-10">
        <div class="glass rounded-3xl py-3 sm:py-6 marquee">
          <div class="marquee-content">${marqueePartners.map(p => `<span class="text-sm sm:text-xl font-bold mx-3 sm:mx-6" style="color: ${p.color}"><i class="${p.icon} mr-1 sm:mr-2"></i>${p.name}</span>`).join('')}${marqueePartners.map(p => `<span class="text-sm sm:text-xl font-bold mx-3 sm:mx-6" style="color: ${p.color}"><i class="${p.icon} mr-1 sm:mr-2"></i>${p.name}</span>`).join('')}</div>
        </div>
      </section>

      <section class="py-10 sm:py-16" id="certifications">
        <div class="text-center mb-6 sm:mb-12" data-aos="fade-up">
          <h2 class="text-3xl sm:text-5xl font-black">Featured <span class="gradient-text">Certifications</span></h2>
          <p class="text-gray-400 text-sm sm:text-base mt-2">Industry-recognized credentials — NCP & CCP now available!</p>
        </div>
        <div class="courses-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          ${featuredCourses.length > 0 ? featuredCourses.map(cert => {
            const enrolled = currentUser && isAlreadyEnrolled(cert.id);
            return `
            <div class="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 card-hover" data-aos="fade-up">
              <div class="flex justify-between items-start"><i class="fa-solid ${cert.icon || 'fa-certificate'} text-3xl sm:text-4xl text-purple-400"></i><span class="text-xs glass px-2 sm:px-3 py-1 rounded-full">${cert.category || 'Certification'}</span></div>
              <h3 class="text-lg sm:text-2xl font-bold mt-3 sm:mt-4">${escapeHtml(cert.name)}</h3>
              <p class="text-gray-400 text-xs sm:text-sm mt-2">${escapeHtml(cert.description?.substring(0, 80) || 'Professional certification')}</p>
              <div class="flex items-center gap-2 mt-2 text-gray-400 text-xs"><i class="fa-solid fa-users"></i><span>${(cert.enrolledCount || 0).toLocaleString()}+ students</span></div>
              <div class="mt-4"><button onclick="window.handleEnrollClick('${cert.id}')" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:bg-purple-500 py-2 rounded-xl text-sm font-medium transition">${enrolled ? '📖 Continue Learning' : '🎯 Enroll Now'}</button></div>
            </div>
          `}).join('') : '<div class="col-span-3 text-center py-10"><p class="text-yellow-400">Loading courses...</p></div>'}
        </div>
        <div class="text-center mt-8 sm:mt-12"><button id="seeAllCoursesBtn" class="glass px-5 sm:px-8 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base">🔍 See All ${coursesData.length} Certifications →</button></div>
      </section>

      <section class="py-10 sm:py-16">
        <div class="text-center mb-6 sm:mb-12" data-aos="fade-up"><h2 class="text-3xl sm:text-4xl font-black">🌍 Global Partners</h2></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          ${globalPartners.map(p => `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="glass rounded-2xl p-3 sm:p-5 text-center transition hover:scale-105"><i class="${p.icon} text-3xl sm:text-4xl" style="color: ${p.color}"></i><h3 class="font-bold text-xs sm:text-sm mt-2">${p.name}</h3></a>`).join('')}
        </div>
      </section>

      <footer class="border-t border-white/10 py-6 sm:py-12 mt-6 sm:mt-10">
        <div class="flex flex-wrap justify-center gap-3 sm:gap-6 mb-3 sm:mb-6 text-xl sm:text-2xl">
          <a href="https://www.facebook.com/obliXel" target="_blank" rel="noopener noreferrer" data-social="fb"><i class="fab fa-facebook"></i></a>
          <a href="#" data-social="ig"><i class="fab fa-instagram"></i></a>
          <a href="#" data-social="li"><i class="fab fa-linkedin"></i></a>
          <a href="#" data-social="yt"><i class="fab fa-youtube"></i></a>
          <a href="#" data-social="x"><i class="fab fa-twitter"></i></a>
          <a href="https://wa.me/263714587259" target="_blank" rel="noopener noreferrer" id="whatsapp-link"><i class="fab fa-whatsapp"></i></a>
        </div>
        <p class="text-center text-gray-500 text-xs sm:text-sm">© 2026 obliXel Academy — The future of professional certification</p>
      </footer>
    </div>
  `;

  document.getElementById('landingStartBtn')?.addEventListener('click', () => currentUser ? renderPage('dashboard') : renderPage('login'));
  document.getElementById('landingExploreBtn')?.addEventListener('click', () => document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('seeAllCoursesBtn')?.addEventListener('click', () => renderPage('courses'));
  document.getElementById('guestSignupBtn')?.addEventListener('click', (e) => { e.preventDefault(); renderPage('register'); });

  // Show AI chat button on landing page
  if (!currentUser) {
    const aiBtn = document.getElementById('aiChatButton');
    if (aiBtn) aiBtn.classList.remove('hidden');
  }
}

window.handleEnrollClick = function(courseId) {
  if (!currentUser) {
    showToast('Please login first to enroll in courses', 'warning');
    renderPage('login');
    return;
  }

  // Check if already enrolled
  if (isAlreadyEnrolled(courseId)) {
    showToast('You are already enrolled! Redirecting to course...', 'info');
    setTimeout(() => renderCourseDashboard(courseId), 500);
    return;
  }

  openCheckout(courseId);
};

// ==================== REGISTER PAGE ====================
function renderRegister() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="flex items-center justify-center min-h-[70vh] p-4">
      <div class="max-w-md w-full glass rounded-3xl p-6" data-aos="fade-up">
        <button onclick="window.renderPage('landing')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back</button>
        <div class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center text-2xl font-black mx-auto">O</div>
          <h2 class="text-2xl font-black gradient-text mt-4">Join obliXel</h2>
          <p class="text-gray-400 text-sm mt-1">Start your certification journey</p>
        </div>

        <input id="regName" placeholder="Full name" class="w-full bg-transparent border border-white/20 rounded-xl p-3 my-3 text-sm focus:outline-none focus:border-cyan-400 transition" autocomplete="off">
        <input id="regEmail" type="email" placeholder="Email address" class="w-full bg-transparent border border-white/20 rounded-xl p-3 my-3 text-sm focus:outline-none focus:border-cyan-400 transition" autocomplete="off">

        <div class="relative my-3">
          <input id="regPass" type="password" placeholder="Create password" class="w-full bg-transparent border border-white/20 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-cyan-400 transition" style="direction: ltr !important; unicode-bidi: normal !important;" autocomplete="off">
          <button id="toggleRegPass" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fa-regular fa-eye"></i></button>
        </div>

        <button id="doRegister" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 py-3 rounded-xl font-bold glow mt-4">Create Account</button>

        <p class="text-center mt-4 text-sm">Already have an account? <a href="#" id="switchToLogin" class="text-cyan-400 hover:underline">Sign in →</a></p>
      </div>
    </div>
  `;

  const passwordInput = document.getElementById('regPass');
  passwordInput.setAttribute('dir', 'ltr');
  passwordInput.style.direction = 'ltr';
  passwordInput.style.unicodeBidi = 'normal';

  passwordInput.addEventListener('keydown', function(e) {
    this.style.direction = 'ltr';
    this.style.unicodeBidi = 'normal';
  });

  passwordInput.addEventListener('input', function(e) {
    this.style.direction = 'ltr';
    this.style.unicodeBidi = 'normal';
    const pos = this.selectionStart;
    setTimeout(() => { this.setSelectionRange(pos, pos); }, 0);
  });

  document.getElementById('doRegister').addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = passwordInput.value;

    if (!name || !email || !password) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (password.length < 5) {
      showToast('Password must be at least 5 characters', 'error');
      return;
    }

    try {
      await register(name, email, password);
      showToast('Account created! Please login', 'success');
      renderPage('login');
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
    }
  });

  document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); renderPage('login'); });

  let vis = false;
  document.getElementById('toggleRegPass').addEventListener('click', () => {
    vis = !vis;
    passwordInput.type = vis ? 'text' : 'password';
    passwordInput.style.direction = 'ltr';
    passwordInput.style.unicodeBidi = 'normal';
  });

  applyAllPasswordFixes();
}

// ==================== LOGIN PAGE ====================
function renderLogin() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="flex items-center justify-center min-h-[70vh] p-4">
      <div class="max-w-md w-full glass rounded-3xl p-6" data-aos="fade-up">
        <button onclick="window.renderPage('landing')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back</button>
        <div class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center text-2xl font-black mx-auto">O</div>
          <h2 class="text-2xl font-black gradient-text mt-4">Welcome Back</h2>
        </div>

        <input id="loginEmail" type="email" placeholder="Email" class="w-full bg-transparent border border-white/20 rounded-xl p-3 my-3 text-sm" autocomplete="off">

        <div class="relative my-3">
          <input id="loginPass" type="password" placeholder="Password" class="w-full bg-transparent border border-white/20 rounded-xl p-3 pr-12 text-sm" style="direction: ltr !important; unicode-bidi: normal !important;" autocomplete="off">
          <button id="togglePassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fa-regular fa-eye"></i></button>
        </div>

        <div class="flex justify-between items-center mb-4">
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="rememberMe"> <span>Remember me</span></label>
          <a href="#" id="forgotPasswordLink" class="text-cyan-400 text-sm hover:underline">Forgot password?</a>
        </div>

        <button id="doLogin" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 py-3 rounded-xl font-bold glow">Sign In</button>

        <p class="text-center mt-4 text-sm">Don't have an account? <a href="#" id="switchToRegister" class="text-cyan-400 hover:underline">Create account →</a></p>
      </div>
    </div>
  `;

  const loginPass = document.getElementById('loginPass');
  loginPass.setAttribute('dir', 'ltr');
  loginPass.style.direction = 'ltr';
  loginPass.style.unicodeBidi = 'normal';

  loginPass.addEventListener('keydown', function(e) {
    this.style.direction = 'ltr';
    this.style.unicodeBidi = 'normal';
  });

  loginPass.addEventListener('input', function(e) {
    this.style.direction = 'ltr';
    this.style.unicodeBidi = 'normal';
    const pos = this.selectionStart;
    setTimeout(() => { this.setSelectionRange(pos, pos); }, 0);
  });

  document.getElementById('doLogin').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = loginPass.value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
      showToast('Please enter email and password', 'error');
      return;
    }

    try {
      const data = await login(email, password, rememberMe);
      currentUser = data.user;
      // Refresh enrollment cache
      try {
        const enrollmentData = await getMyEnrollments();
        userEnrollmentsCache = enrollmentData.enrollments || [];
      } catch (e) {
        userEnrollmentsCache = [];
      }
      showToast(`Welcome ${currentUser.name}!`, 'success');
      updateAuthUI();
      updateNavbarStyle();
      await loadCourses();
      renderPage('dashboard');
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
    }
  });

  document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); renderPage('register'); });
  document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter your email address:');
    if (email) {
      try {
        await forgotPassword(email);
        showToast('Password reset link sent to your email', 'success');
      } catch (error) {
        showToast('Failed to send reset link', 'error');
      }
    }
  });

  let vis = false;
  document.getElementById('togglePassword').addEventListener('click', () => {
    const input = document.getElementById('loginPass');
    vis = !vis;
    input.type = vis ? 'text' : 'password';
    input.style.direction = 'ltr';
    input.style.unicodeBidi = 'normal';
  });

  applyAllPasswordFixes();
}

// ==================== DASHBOARD PAGE (No inline AI - uses widget bubble) ====================
async function renderDashboard() {
  if (!currentUser) {
    renderPage('login');
    return;
  }

  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading dashboard...</p></div>';

  try {
    const profileData = await getUserProfile();
    const user = profileData.user;
    const stats = profileData.stats;
    const enrollmentsData = profileData.enrollments || [];
    // Refresh cache
    userEnrollmentsCache = enrollmentsData;
    const certificatesData = await getMyCertificates();
    const pending = certificatesData.pending || [];
    const earned = certificatesData.earned || [];
    const streak = user.streak || 7;

    root.innerHTML = `
      <div class="max-w-7xl mx-auto fade-in">
        <div class="glass rounded-3xl p-6 mb-6" data-aos="fade-up">
          <div class="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 class="text-2xl sm:text-4xl font-black">Welcome back, ${user.name.split(' ')[0]}! 👋</h1>
              <p class="text-gray-400 text-sm mt-1">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="flex gap-3">
              <div class="glass px-4 py-2 rounded-xl text-center"><i class="fa-solid fa-fire-flame text-orange-500"></i><span class="ml-1 font-bold">${streak} day streak</span></div>
              <div class="glass px-4 py-2 rounded-xl text-center"><i class="fa-solid fa-chart-line text-purple-400"></i><span class="ml-1">Level ${user.level || 1}</span></div>
            </div>
          </div>
          ${enrollmentsData.length === 0 ? `<div class="mt-3 p-3 bg-purple-500/20 rounded-xl"><p class="text-sm"><i class="fa-regular fa-star text-yellow-400 mr-2"></i>Enroll in your first course to begin your certification journey! 🚀</p></div>` : ''}
        </div>

        <div class="stats-grid mb-8">
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-book-open text-cyan-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-cyan-400">${stats.enrolledCourses || 0}</h3><p class="text-xs text-gray-400">Enrolled</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-hourglass-half text-yellow-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-yellow-400">${pending.length}</h3><p class="text-xs text-gray-400">Pending</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-certificate text-green-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-green-400">${earned.length}</h3><p class="text-xs text-gray-400">Certificates</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-dollar-sign text-purple-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-purple-400">$${formatMoney(user.totalSpent || 0)}</h3><p class="text-xs text-gray-400">Spent</p></div>
        </div>

        <h2 class="text-xl sm:text-2xl font-bold mb-4"><i class="fa-regular fa-clock mr-2 text-cyan-400"></i> Continue Learning</h2>
        <div class="space-y-4 mb-10">
          ${enrollmentsData.length > 0 ? enrollmentsData.map(e => `
            <div class="glass rounded-2xl p-5 card-hover continue-learning-card" data-aos="fade-up">
              <div class="flex justify-between items-start flex-wrap gap-3 mb-3">
                <div><div class="flex items-center gap-2"><i class="fa-solid ${e.courseIcon || 'fa-certificate'} text-purple-400 text-xl"></i><h3 class="text-lg sm:text-xl font-bold">${escapeHtml(e.courseName)}</h3></div><p class="text-gray-400 text-xs sm:text-sm mt-1">${e.type === 'exam_only' ? 'Exam Only' : 'Learning Path'} • ${e.moduleProgress?.completedCount || 0}/${e.moduleProgress?.totalModules || 8} modules completed</p></div>
                <span class="text-xs px-3 py-1 rounded-full ${e.status === 'enrolled' ? 'bg-green-500/20 text-green-400' : e.status === 'passed_waiting' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${e.status === 'enrolled' ? 'Active' : e.status === 'passed_waiting' ? 'Pending Cert' : 'Failed'}</span>
              </div>
              <div class="w-full bg-gray-700 h-2 rounded-full mb-3"><div class="bg-gradient-to-r from-purple-600 to-cyan-500 h-2 rounded-full transition-all" style="width: ${e.progress || 0}%"></div></div>
              <p class="text-xs text-gray-400 mb-3">Next: ${e.moduleProgress?.nextModuleName || 'All modules completed! Take the exam!'}</p>
              <div class="flex gap-3 flex-wrap"><button onclick="window.renderCourseDashboard('${e.courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2 rounded-xl text-sm font-medium">Continue →</button><button onclick="window.startExam('${e.courseId}')" class="glass px-5 py-2 rounded-xl text-sm">🎯 Take Exam</button></div>
            </div>
          `).join('') : '<div class="glass rounded-2xl p-10 text-center"><p>No enrollments yet. <button onclick="renderPage(\'courses\')" class="text-cyan-400 hover:underline">Browse Courses →</button></p></div>'}
        </div>

        <h2 class="text-xl sm:text-2xl font-bold mb-4"><i class="fa-regular fa-star mr-2 text-yellow-400"></i> Recommended For You</h2>
        <div class="courses-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          ${coursesData.filter(c => !enrollmentsData.some(e => e.courseId === c.id)).slice(0, 3).map(c => `
            <div class="glass rounded-2xl p-4 card-hover"><i class="fa-solid ${c.icon || 'fa-certificate'} text-3xl text-purple-400 mb-2"></i><h3 class="font-bold">${escapeHtml(c.name)}</h3><p class="text-gray-400 text-xs mt-1">${escapeHtml(c.description?.substring(0, 60))}...</p><button onclick="window.handleEnrollClick('${c.id}')" class="w-full mt-3 bg-purple-600/50 hover:bg-purple-600 py-2 rounded-xl text-sm transition">Enroll Now</button></div>
          `).join('')}
        </div>

        <div class="glass rounded-2xl p-5"><h2 class="text-lg font-bold mb-3"><i class="fa-solid fa-users mr-2 text-cyan-400"></i> Study Together</h2><div class="flex items-center gap-2 mb-4"><span class="online-dot"></span><span class="text-sm text-gray-400">42 students online now • 3 active study groups</span></div><div class="flex gap-3 flex-wrap"><button class="glass px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition">Join Study Group</button><button class="glass px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition">Find Study Partner</button></div></div>
      </div>
    `;

    // Show AI widget on dashboard
    const aiBtn = document.getElementById('aiChatButton');
    if (aiBtn) aiBtn.classList.remove('hidden');
  } catch (error) {
    console.error('Dashboard error:', error);
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load dashboard: ${error.message}</p><button onclick="renderPage('landing')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Go Home</button></div>`;
  }
}

// ==================== COURSES PAGE ====================
async function renderCourses() {
  const root = document.getElementById('app-root');
  if (coursesData.length === 0) {
    await loadCourses();
  }

  // NCP and CCP first
  const ncpCourse = coursesData.find(c => c.id === 'ncp');
  const ccpCourse = coursesData.find(c => c.id === 'ccp');
  const otherCourses = coursesData.filter(c => c.id !== 'ncp' && c.id !== 'ccp');
  const sortedCourses = [ncpCourse, ccpCourse, ...otherCourses].filter(Boolean);

  let filteredCourses = [...sortedCourses];
  let searchTerm = '';

  function renderCourseList() {
    const coursesContainer = document.getElementById('coursesContainer');
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (!coursesContainer) return;

    if (filteredCourses.length === 0) {
      coursesContainer.innerHTML = `<div class="col-span-3 text-center py-10"><p class="text-yellow-400">No courses found matching "${escapeHtml(searchTerm)}"</p></div>`;
      if (searchResultsCount) searchResultsCount.innerText = `0 of ${coursesData.length}`;
      return;
    }

    coursesContainer.innerHTML = filteredCourses.map(cert => {
      const enrolled = currentUser && isAlreadyEnrolled(cert.id);
      return `
      <div class="glass rounded-2xl p-5 card-hover course-card" data-course-name="${escapeHtml(cert.name).toLowerCase()}">
        <i class="fa-solid ${cert.icon || 'fa-certificate'} text-4xl text-purple-400"></i>
        <h3 class="text-xl font-bold mt-3">${escapeHtml(cert.name)}</h3>
        <p class="text-gray-400 text-sm mt-1">${escapeHtml(cert.description?.substring(0, 80) || 'Professional certification')}</p>
        <div class="flex items-center gap-2 mt-2 text-gray-400 text-xs"><i class="fa-solid fa-users"></i><span>${(cert.enrolledCount || 0).toLocaleString()}+ students</span></div>
        <p class="text-xs mt-2">💰 Exam: $${cert.examPrice} | Path: $${cert.pathPrice}</p>
        <button onclick="window.handleEnrollClick('${cert.id}')" class="w-full mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 py-2 rounded-xl text-sm">${enrolled ? '📖 Continue Learning' : '🎯 Enroll Now'}</button>
      </div>
    `}).join('');

    if (searchResultsCount) searchResultsCount.innerText = `${filteredCourses.length} of ${coursesData.length}`;
  }

  root.innerHTML = `
    <div class="max-w-7xl mx-auto fade-in">
      <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 class="text-2xl sm:text-4xl font-black">📚 All Certifications</h1>
        <div class="search-container">
          <i class="fa-solid fa-search search-icon"></i>
          <input type="text" id="courseSearchInput" placeholder="Search certifications..." class="search-input" autocomplete="off">
          <button id="clearSearchBtn" class="search-clear hidden"><i class="fa-solid fa-times-circle"></i></button>
        </div>
      </div>

      <p class="text-gray-400 text-sm mb-4" id="searchResultsCount">${coursesData.length} of ${coursesData.length} courses</p>

      <div id="coursesContainer" class="courses-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      </div>
    </div>
  `;

  renderCourseList();

  const searchInput = document.getElementById('courseSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');

  function filterCourses() {
    searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm === '') {
      filteredCourses = [...sortedCourses];
      clearBtn.classList.add('hidden');
    } else {
      filteredCourses = sortedCourses.filter(course =>
        course.name.toLowerCase().includes(searchTerm) ||
        (course.description && course.description.toLowerCase().includes(searchTerm)) ||
        (course.category && course.category.toLowerCase().includes(searchTerm))
      );
      clearBtn.classList.remove('hidden');
    }
    renderCourseList();
  }

  searchInput.addEventListener('input', filterCourses);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterCourses();
    searchInput.focus();
  });
}

// ==================== EXAMS PAGE ====================
async function renderExams() {
  if (!currentUser) { renderPage('login'); return; }

  try {
    const enrollments = await getMyEnrollments();
    const activeExams = enrollments.enrollments?.filter(e => e.status !== 'failed') || [];
    const root = document.getElementById('app-root');

    root.innerHTML = `
      <div class="max-w-4xl mx-auto fade-in">
        <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>
        <h1 class="text-2xl font-black mb-6">🎯 Certification Exams</h1>
        ${activeExams.length > 0 ? activeExams.map(e => `
          <div class="glass rounded-2xl p-5 mb-4 flex justify-between items-center flex-wrap gap-3">
            <div><h2 class="text-xl font-bold">${escapeHtml(e.courseName)}</h2><p class="text-gray-400">Attempts: ${e.examAttempts || 0}</p>${e.score ? `<p class="text-xs ${e.score >= 70 ? 'text-green-400' : 'text-red-400'}">Last score: ${e.score}%</p>` : ''}</div>
            <button onclick="window.startExam('${e.courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2 rounded-xl text-sm">Start Final Exam →</button>
          </div>
        `).join('') : '<div class="glass rounded-3xl p-12 text-center"><p>No active exams available.</p><button onclick="renderPage(\'courses\')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Browse Courses</button></div>'}
      </div>
    `;
  } catch (error) {
    document.getElementById('app-root').innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load exams</p></div>`;
  }
}

// ==================== CERTIFICATES PAGE ====================
async function renderCertificates() {
  if (!currentUser) { renderPage('login'); return; }

  try {
    const certData = await getMyCertificates();
    const earned = certData.earned || [];
    const pending = certData.pending || [];
    const root = document.getElementById('app-root');

    root.innerHTML = `
      <div class="max-w-4xl mx-auto fade-in">
        <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>
        <h1 class="text-2xl font-black mb-6">🏅 My Certificates</h1>
        ${pending.length > 0 ? pending.map(cer => `
          <div class="glass rounded-2xl p-5 mb-4 border border-yellow-500/30">
            <div class="flex justify-between flex-wrap gap-3">
              <div><h2 class="text-xl font-bold">${escapeHtml(cer.courseName)}</h2><p class="text-yellow-400 text-sm">⏳ Pending Admin Approval</p><p class="text-sm">Score: ${cer.score}%</p><p class="text-sm text-cyan-400 mt-1">Code: <span class="certificate-code-display">${cer.certificateId || 'N/A'}</span></p></div>
              <i class="fa-solid fa-hourglass-half text-3xl text-yellow-400"></i>
            </div>
          </div>
        `).join('') : ''}
        ${earned.length > 0 ? earned.map(cer => `
          <div class="glass rounded-2xl p-5 mb-4">
            <div class="flex justify-between flex-wrap gap-3">
              <div><h2 class="text-2xl font-bold">${escapeHtml(cer.courseName)}</h2><p class="text-gray-400 text-sm">ID: ${cer.certificateId}</p><p class="text-sm">Issued: ${formatDate(cer.issuedAt || cer.issueDate)} | Score: ${cer.score}%</p></div>
              <i class="fa-solid fa-certificate text-4xl text-cyan-400"></i>
            </div>
            <div class="mt-3 flex gap-3 flex-wrap">
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.downloadCertificate('${cer.certificateId}')"><i class="fa-regular fa-file-pdf"></i> Download PDF</button>
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.shareToLinkedIn('${cer.certificateId}')"><i class="fa-brands fa-linkedin"></i> Share</button>
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.verifyCertificate('${cer.certificateId}')"><i class="fa-solid fa-check-circle"></i> Verify</button>
            </div>
          </div>
        `).join('') : (pending.length === 0 ? '<div class="glass rounded-3xl p-12 text-center"><p>No certificates yet. Complete an exam to earn your first certificate!</p><button onclick="renderPage(\'dashboard\')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Start Learning</button></div>' : '')}
      </div>
    `;
  } catch (error) {
    document.getElementById('app-root').innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load certificates</p></div>`;
  }
}

// ==================== PROFILE PAGE ====================
async function renderProfile() {
  if (!currentUser) { renderPage('login'); return; }

  try {
    const profileData = await getUserProfile();
    const user = profileData.user;
    const root = document.getElementById('app-root');

    root.innerHTML = `
      <div class="max-w-4xl mx-auto fade-in">
        <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>
        <div class="glass rounded-3xl p-6">
          <div class="flex items-center gap-5 flex-wrap">
            <div class="w-20 h-20 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center text-3xl font-black">${user.avatar || user.name.charAt(0)}</div>
            <div><h1 class="text-2xl font-black">${escapeHtml(user.name)}</h1><p class="text-gray-400 text-sm">${user.email} • ${user.role === 'admin' ? 'Admin' : 'Student'}</p><p class="text-xs text-cyan-400">Member since ${formatDate(user.createdAt)}</p></div>
          </div>
          <div class="stats-grid mt-6">
            <div class="glass rounded-xl p-3 text-center"><h3 class="text-xl font-black text-cyan-400">${user.xp || 0}</h3><p class="text-xs">XP</p></div>
            <div class="glass rounded-xl p-3 text-center"><h3 class="text-xl font-black text-purple-400">${user.level || 1}</h3><p class="text-xs">Level</p></div>
            <div class="glass rounded-xl p-3 text-center"><h3 class="text-xl font-black text-yellow-400">$${formatMoney(user.totalSpent || 0)}</h3><p class="text-xs">Spent</p></div>
            <div class="glass rounded-xl p-3 text-center"><h3 class="text-xl font-black text-green-400">${user.streak || 0}</h3><p class="text-xs">Day Streak</p></div>
          </div>
          <button id="deleteAccountBtn" class="mt-6 glass px-4 py-2 rounded-xl text-red-400 text-sm w-full hover:bg-red-500/10 transition">Delete Account</button>
        </div>
      </div>
    `;

    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
      const confirmMsg = prompt('Type "DELETE" to permanently delete your account:');
      if (confirmMsg === 'DELETE') {
        try { await deleteAccount('DELETE'); logout(); showToast('Account deleted', 'success'); renderPage('landing'); }
        catch (error) { showToast('Failed to delete account', 'error'); }
      }
    });
  } catch (error) {
    document.getElementById('app-root').innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load profile</p></div>`;
  }
}

// ==================== COURSE DASHBOARD WITH FINAL EXAM AS 9TH ITEM ====================
async function renderCourseDashboard(courseId) {
  if (!currentUser) { renderPage('login'); return; }

  console.log(`📚 Rendering course dashboard for ${courseId}`);
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading course...</p></div>';

  try {
    const courseData = await getCourseDetails(courseId);
    const course = courseData.course;
    const modules = courseData.modules;
    const progressData = await getModuleProgress(courseId);
    const progress = progressData.progress;

    currentCourseModules = modules;
    currentModuleProgress = progress;

    const completedCount = progress.completedCount || 0;
    const totalModules = modules.length;
    const percentComplete = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;
    const examUnlocked = progress.examUnlocked || (completedCount >= totalModules && totalModules > 0);

    // AI Teacher profiles with unique UI themes
    const aiTeachers = {
      ncp: { name: 'Professor Carlos', title: 'Network Certified Instructor • 12 Years', avatar: '📡', message: '"Subnetting is like building a city. Every device needs a proper address!"', theme: 'ncp' },
      ccp: { name: 'Professor Sarah Chen', title: 'Computer Science Professor • 15 Years', avatar: '📚', message: '"Computers are logical machines. Master the fundamentals first!"', theme: 'ccp' },
      clp: { name: 'Professor Mike Ross', title: 'Cloud Architect • AWS Certified', avatar: '☁️', message: '"The cloud is just someone else\'s computer — but infinitely scalable!"', theme: 'clp' },
      aip: { name: 'Professor Nova Turing', title: 'AI Research Scientist', avatar: '🧠', message: '"Neural networks are like brains — let me explain how they learn."', theme: 'aip' },
      default: { name: 'Professor Sarah Chen', title: 'Senior Instructor', avatar: '📚', message: 'Ready to learn? Let\'s get started!', theme: 'default' }
    };
    const teacher = aiTeachers[courseId] || aiTeachers.default;

    root.innerHTML = `
      <div class="max-w-6xl mx-auto fade-in">
        <div class="flex items-center gap-3 mb-4 flex-wrap"><button onclick="window.renderPage('dashboard')" class="glass px-3 py-1 rounded-lg text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button></div>

        <div class="glass rounded-3xl p-6 mb-6">
          <div class="flex justify-between items-start flex-wrap gap-4">
            <div><div class="flex items-center gap-3 mb-2"><i class="fa-solid ${course.icon || 'fa-certificate'} text-3xl text-purple-400"></i><h1 class="text-2xl sm:text-3xl font-black">${escapeHtml(course.name)}</h1></div><p class="text-gray-400 text-sm">🎯 Final Exam: 70% to pass • 25 questions • 60 minutes</p></div>
            <div class="text-right"><div class="text-2xl font-bold text-cyan-400">${Math.round(percentComplete)}%</div><p class="text-xs text-gray-400">Progress</p></div>
          </div>
          <div class="w-full bg-gray-700 h-2 rounded-full mt-4"><div class="bg-gradient-to-r from-purple-600 to-cyan-500 h-2 rounded-full transition-all" style="width: ${percentComplete}%"></div></div>
          <p class="text-gray-400 text-sm mt-3">${completedCount}/${totalModules} modules completed • ${examUnlocked ? '✅ Final Exam unlocked! 🎉' : '🔒 Complete all modules to unlock final exam'}</p>
        </div>

        <div class="course-dashboard-grid">
          <div class="space-y-6">
            <div class="glass rounded-2xl p-6">
              <h2 class="text-xl font-bold mb-4">📚 Course Modules</h2>
              <div class="modules-list space-y-3">
                ${modules.map((mod, idx) => {
                  const moduleProgress = progress.modules?.find(m => m.moduleId === mod.id);
                  const isCompleted = moduleProgress?.completed || false;
                  const isUnlocked = moduleProgress?.unlocked || idx === 0;
                  const quizScore = moduleProgress?.quizScore;
                  return `
                    <div class="glass rounded-xl p-4 ${!isUnlocked ? 'module-locked' : ''}">
                      <div class="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <div class="flex items-center gap-2">
                            ${isCompleted ? '<i class="fa-solid fa-circle-check text-green-400"></i>' : (isUnlocked ? '<i class="fa-regular fa-circle-play text-cyan-400"></i>' : '<i class="fa-solid fa-lock text-gray-500"></i>')}
                            <h3 class="font-semibold">${escapeHtml(mod.name)}</h3>
                          </div>
                          <div class="flex gap-3 mt-1 text-xs text-gray-500">
                            <span><i class="fa-regular fa-clock"></i> ${mod.duration || '30 min'}</span>
                            <span><i class="fa-regular fa-question-circle"></i> ${mod.quizQuestions || 10} questions</span>
                          </div>
                          ${quizScore ? `<div class="mt-1 text-xs ${quizScore >= 70 ? 'text-green-400' : 'text-yellow-400'}">Module Exam: ${quizScore}% ${quizScore >= 70 ? '✅' : '⚠️'}</div>` : ''}
                        </div>
                        ${isUnlocked && !isCompleted ? `<button onclick="window.renderModulePage('${courseId}', ${mod.id})" class="bg-cyan-600 px-4 py-2 rounded-xl text-sm">Start Module →</button>` : ''}
                        ${isCompleted ? `<span class="text-green-400 text-sm"><i class="fa-regular fa-circle-check mr-1"></i> Completed</span>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}

                <!-- FINAL EXAMINATION AS 9TH ITEM -->
                <div class="glass rounded-xl p-4 ${examUnlocked ? 'final-exam-item-unlocked' : 'final-exam-locked final-exam-item'}">
                  <div class="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        ${examUnlocked ? '<i class="fa-solid fa-trophy text-yellow-400 animate-pulse"></i>' : '<i class="fa-solid fa-lock text-yellow-600"></i>'}
                        <h3 class="font-semibold text-yellow-400">🎯 Final Examination</h3>
                      </div>
                      <div class="flex gap-3 mt-1 text-xs text-gray-500">
                        <span><i class="fa-regular fa-clock"></i> 60 min</span>
                        <span><i class="fa-regular fa-question-circle"></i> 25 questions</span>
                        <span>📊 70% to pass</span>
                      </div>
                      <p class="text-xs text-yellow-500/70 mt-1">Certificate code issued upon passing</p>
                    </div>
                    ${examUnlocked ? `<button onclick="window.startExam('${courseId}')" class="bg-gradient-to-r from-yellow-600 to-orange-500 px-5 py-2 rounded-xl text-sm font-bold glow animate-pulse">🚀 Take Final Exam</button>` : `<span class="text-yellow-600/50 text-sm"><i class="fa-solid fa-lock mr-1"></i> Complete all ${totalModules} modules</span>`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="glass rounded-2xl p-6 text-center ai-teacher-card">
              <div class="text-5xl mb-3">${teacher.avatar}</div>
              <h3 class="text-xl font-bold">${teacher.name}</h3>
              <p class="text-gray-400 text-xs">${teacher.title}</p>
              <p class="text-sm mt-3 italic">${teacher.message}</p>
              <button onclick="window.openAITeacherChat('${courseId}')" class="mt-4 glass px-4 py-2 rounded-xl text-sm w-full hover:bg-white/10 transition">💬 Chat with ${teacher.name.split(' ')[0]}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading course dashboard:', error);
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load course</p><button onclick="renderPage('dashboard')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Go Back</button></div>`;
  }
}

// ==================== MODULE LEARNING PAGE ====================
async function renderModulePage(courseId, moduleId) {
  console.log(`📖 Rendering module ${moduleId} for ${courseId}`);
  const root = document.getElementById('app-root');

  const course = coursesData.find(c => c.id === courseId);
  const module = currentCourseModules?.find(m => m.id === moduleId);

  if (!course || !module) {
    showToast('Module not found', 'error');
    renderCourseDashboard(courseId);
    return;
  }

  let videoCardHtml = '';
  if (module.videoUrl) {
    const metadata = await fetchYouTubeMetadata(module.videoUrl);
    if (metadata) videoCardHtml = renderYouTubeCard(metadata);
  }

  root.innerHTML = `
    <div class="max-w-4xl mx-auto fade-in">
      <div class="flex items-center gap-3 mb-4 flex-wrap"><button onclick="window.renderCourseDashboard('${courseId}')" class="glass px-3 py-1 rounded-lg text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Course</button></div>

      <div class="glass rounded-3xl p-6 mb-6">
        <h1 class="text-2xl font-bold">${escapeHtml(module.name)}</h1>
        <p class="text-gray-400 text-sm mt-1">⏱️ ${module.duration || '30 min'} • 📝 ${module.quizQuestions || 10} exam questions • 70% to pass</p>
      </div>

      ${videoCardHtml ? `<div class="mb-6">${videoCardHtml}</div>` : ''}

      <div class="glass rounded-2xl p-6 mb-6">
        <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h2 class="text-xl font-bold">📝 Study Notes</h2>
          <button id="generateNotesBtn" class="text-xs text-cyan-400 hover:underline">📝 Open Study Notes</button>
        </div>
        <div id="notesContent" class="prose prose-invert max-w-none">
          <p class="text-gray-400">Click "Open Study Notes" to create smart study notes for this module.</p>
        </div>
        <button id="downloadNotesBtn" class="hidden mt-3 glass px-4 py-2 rounded-xl text-sm">📥 Download Notes</button>
      </div>

      <div class="glass rounded-2xl p-6">
        <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h2 class="text-xl font-bold">📋 Module Examination (10 Questions)</h2>
        </div>
        <div id="quizContent">
          <p class="text-gray-400">Take the module exam to test your knowledge. Pass with 70% to unlock the next module.</p>
        </div>
        <button id="takeQuizBtn" class="w-full mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 py-2 rounded-xl font-bold">Take Module Exam →</button>
      </div>

      <div class="mt-6 flex justify-between">
        <button onclick="window.renderCourseDashboard('${courseId}')" class="glass px-6 py-2 rounded-xl">Back to Course</button>
      </div>
    </div>
  `;

  let currentNotes = '';

  document.getElementById('generateNotesBtn')?.addEventListener('click', async () => {
    const notesDiv = document.getElementById('notesContent');
    notesDiv.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
    try {
      const result = await generateAINotes(courseId, module.name);
      currentNotes = result.notes;
      // Clean up formatting
      const cleanedNotes = currentNotes
        .replace(/\*\*/g, '')
        .replace(/^[#]+\s/gm, '')
        .replace(/^\*/gm, '•')
        .replace(/^- /gm, '• ');
      notesDiv.innerHTML = `<div class="text-sm whitespace-pre-wrap">${escapeHtml(cleanedNotes)}</div>`;
      document.getElementById('downloadNotesBtn')?.classList.remove('hidden');
      showToast('Study notes generated!', 'success');
    } catch (error) {
      notesDiv.innerHTML = '<p class="text-red-400">Failed to generate notes. Please try again.</p>';
    }
  });

  document.getElementById('downloadNotesBtn')?.addEventListener('click', () => {
    if (currentNotes) {
      const blob = new Blob([currentNotes], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${module.name.replace(/\s+/g, '_')}_notes.txt`; a.click();
      URL.revokeObjectURL(url);
      showToast('Notes downloaded!', 'success');
    }
  });

  document.getElementById('takeQuizBtn')?.addEventListener('click', async () => {
    const quizDiv = document.getElementById('quizContent');
    quizDiv.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
    try {
      const result = await generateAIGuiz(courseId, module.name, module.name);
      currentQuizQuestions = result.quiz;
      currentQuizOriginalOrder = [...result.quiz]; // Store original for shuffling
      quizDiv.innerHTML = `<div class="text-sm"><p class="text-green-400 mb-2">✅ Exam ready! ${currentQuizQuestions.length} questions. Pass with 70% to unlock next module.</p></div>`;
      // Start quiz immediately
      if (currentQuizQuestions && currentQuizQuestions.length > 0) {
        currentQuizQuestions = [...currentQuizQuestions].sort(() => Math.random() - 0.5);
        renderQuizPage(courseId, moduleId, module.name);
      }
    } catch (error) {
      quizDiv.innerHTML = '<p class="text-red-400">Failed to generate exam. Please try again.</p>';
    }
  });
}

// ==================== QUIZ PAGE (10 questions, 70% pass, retry shuffles) ====================
function renderQuizPage(courseId, moduleId, moduleName) {
  const root = document.getElementById('app-root');
  const questions = currentQuizQuestions;
  let currentIndex = 0;
  let userAnswers = new Array(questions.length).fill(null);

  function renderQuestion() {
    const q = questions[currentIndex];
    const percent = ((currentIndex + 1) / questions.length) * 100;

    root.innerHTML = `
      <div class="max-w-3xl mx-auto fade-in">
        <button onclick="window.renderModulePage('${courseId}', ${moduleId})" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Module</button>
        <div class="glass rounded-3xl p-6">
          <div class="flex justify-between items-center mb-4"><h1 class="text-xl font-bold">Module Exam: ${escapeHtml(moduleName)}</h1><span class="text-sm text-gray-400">Question ${currentIndex + 1} of ${questions.length} • 70% to pass</span></div>
          <div class="w-full bg-gray-700 h-1 rounded-full mb-6"><div class="bg-purple-600 h-1 rounded-full transition-all" style="width: ${percent}%"></div></div>
          <p class="text-lg font-semibold mb-6">${escapeHtml(q.question)}</p>
          <div class="space-y-3 mb-8">
            ${q.options.map((opt, i) => `
              <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer ${userAnswers[currentIndex] === i ? 'border border-cyan-400' : ''}">
                <input type="radio" name="quizOption" value="${i}" ${userAnswers[currentIndex] === i ? 'checked' : ''}>
                <span>${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</span>
              </label>
            `).join('')}
          </div>
          <div class="flex justify-between">
            <button id="prevBtn" class="glass px-6 py-2 rounded-xl" ${currentIndex === 0 ? 'disabled style="opacity:0.5"' : ''}>← Previous</button>
            <button id="nextBtn" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-2 rounded-xl font-bold">${currentIndex === questions.length - 1 ? 'Submit Exam' : 'Next →'}</button>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('input[name="quizOption"]').forEach(radio => {
      radio.addEventListener('change', (e) => { userAnswers[currentIndex] = parseInt(e.target.value); });
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } });
    document.getElementById('nextBtn')?.addEventListener('click', () => { if (currentIndex === questions.length - 1) { submitQuiz(); } else { currentIndex++; renderQuestion(); } });
  }

  async function submitQuiz() {
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (userAnswers[i] === questions[i].correctAnswer) score++;
    }
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    const wrongAnswers = [];
    for (let i = 0; i < questions.length; i++) {
      if (userAnswers[i] !== questions[i].correctAnswer) {
        wrongAnswers.push({
          question: questions[i].question,
          correct: questions[i].options[questions[i].correctAnswer],
          yourAnswer: userAnswers[i] !== null ? questions[i].options[userAnswers[i]] : 'Not answered'
        });
      }
    }

    root.innerHTML = `
      <div class="max-w-3xl mx-auto fade-in">
        <div class="glass rounded-3xl p-6 text-center">
          <div class="text-6xl mb-4">${passed ? '🎉' : '😅'}</div>
          <h2 class="text-2xl font-bold mb-2">Module Exam ${passed ? 'Passed!' : 'Not Passed'}</h2>
          <p class="text-4xl font-black gradient-text mb-4">${score}/${questions.length} (${percentage}%)</p>
          <p class="text-gray-400 mb-6">${passed ? 'Great job! Next module unlocked.' : `Need 70% to pass. You got ${percentage}%. Try again — questions will shuffle!`}</p>
          ${wrongAnswers.length > 0 ? `
            <div class="text-left mb-6 max-h-60 overflow-y-auto">
              <h3 class="font-bold mb-2">Review:</h3>
              ${wrongAnswers.map(wa => `
                <div class="glass rounded-xl p-3 mb-2">
                  <p class="text-sm font-medium">${escapeHtml(wa.question)}</p>
                  <p class="text-xs text-green-400">✅ Correct: ${escapeHtml(wa.correct)}</p>
                  <p class="text-xs text-red-400">❌ Yours: ${escapeHtml(wa.yourAnswer)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${passed ? `<button onclick="window.completeModuleAndReturn('${courseId}', ${moduleId}, ${percentage})" class="bg-green-600 px-6 py-3 rounded-xl font-bold">Continue to Next Module →</button>` : `<button onclick="window.retryQuiz('${courseId}', ${moduleId}, '${escapeHtml(moduleName).replace(/'/g, "\\'")}')" class="bg-purple-600 px-6 py-3 rounded-xl font-bold">🔄 Retry Exam (Shuffled)</button>`}
        </div>
      </div>
    `;
  }

  renderQuestion();
}

// Retry quiz with shuffled questions
window.retryQuiz = function(courseId, moduleId, moduleName) {
  if (currentQuizQuestions && currentQuizQuestions.length > 0) {
    currentQuizQuestions = [...currentQuizQuestions].sort(() => Math.random() - 0.5);
    renderQuizPage(courseId, moduleId, moduleName);
  } else {
    renderModulePage(courseId, moduleId);
  }
};

// ==================== COMPLETE MODULE ====================
window.completeModuleAndReturn = async (courseId, moduleId, score) => {
  try {
    const result = await completeModule(courseId, moduleId, score);
    showToast(`Module completed! Score: ${score}%`, 'success');
    // Refresh enrollment cache
    try {
      const enrollmentData = await getMyEnrollments();
      userEnrollmentsCache = enrollmentData.enrollments || [];
    } catch (e) {}
    // If exam is now unlocked, show message
    if (result.examUnlocked) {
      showToast('🎉 All modules completed! Final Exam unlocked!', 'success');
    }
    renderCourseDashboard(courseId);
  } catch (error) {
    showToast('Failed to save progress', 'error');
    renderCourseDashboard(courseId);
  }
};

// ==================== START EXAM (Final Exam) ====================
window.startExam = async (courseId) => {
  try {
    const examData = await startExam(courseId);
    renderExamPage(courseId, examData);
  } catch (error) {
    showToast(error.message || 'Failed to start exam. Complete all modules first.', 'error');
  }
};

// ==================== FINAL EXAM PAGE WITH CERTIFICATE CODE ====================
function renderExamPage(courseId, examData) {
  const questions = examData.questions;
  let userAnswers = new Array(questions.length).fill(null);
  let currentIndex = 0;
  let timeLeft = examData.timeLimit || 3600;
  let timerInterval;
  const root = document.getElementById('app-root');

  function renderQuestion() {
    const q = questions[currentIndex];
    const percent = ((currentIndex + 1) / questions.length) * 100;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    root.innerHTML = `
      <div class="max-w-4xl mx-auto p-4 fade-in">
        <div class="glass rounded-3xl p-6">
          <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h1 class="text-xl font-bold">Final Certification Exam</h1>
            <div class="exam-timer">${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</div>
          </div>
          <div class="w-full bg-gray-700 h-1 rounded-full mb-6"><div class="bg-purple-600 h-1 rounded-full" style="width: ${percent}%"></div></div>
          <p class="text-lg font-semibold mb-6">${escapeHtml(q.text)}</p>
          <div class="space-y-3 mb-8">
            ${q.options.map((opt, i) => `
              <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer ${userAnswers[currentIndex] === i ? 'border border-cyan-400' : ''}">
                <input type="radio" name="examOption" value="${i}" ${userAnswers[currentIndex] === i ? 'checked' : ''}>
                <span>${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</span>
              </label>
            `).join('')}
          </div>
          <div class="flex justify-between">
            <button id="prevBtn" class="glass px-6 py-2 rounded-xl" ${currentIndex === 0 ? 'disabled style="opacity:0.5"' : ''}>← Previous</button>
            <button id="nextBtn" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-2 rounded-xl font-bold">${currentIndex === questions.length - 1 ? 'Submit Final Exam' : 'Next →'}</button>
          </div>
          <p class="text-xs text-gray-500 mt-4 text-center">⚠️ Do not refresh the page. Progress is saved automatically.</p>
        </div>
      </div>
    `;

    document.querySelectorAll('input[name="examOption"]').forEach(radio => {
      radio.addEventListener('change', (e) => { userAnswers[currentIndex] = parseInt(e.target.value); });
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } });
    document.getElementById('nextBtn')?.addEventListener('click', () => { if (currentIndex === questions.length - 1) { clearInterval(timerInterval); submitFinalExam(); } else { currentIndex++; renderQuestion(); } });
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      if (timeLeft <= 0) { clearInterval(timerInterval); submitFinalExam(); }
      timeLeft--;
      const timerSpan = document.querySelector('.exam-timer');
      if (timerSpan) {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  async function submitFinalExam() {
    const timeSpent = (examData.timeLimit || 3600) - timeLeft;
    try {
      const result = await submitExam(examData.sessionId, courseId, userAnswers, timeSpent);

      if (result.passed) {
        // Show certificate code
        root.innerHTML = `
          <div class="max-w-2xl mx-auto fade-in">
            <div class="glass rounded-3xl p-8 text-center">
              <div class="text-6xl mb-4">🎉</div>
              <h2 class="text-2xl font-bold mb-2">Congratulations!</h2>
              <p class="text-4xl font-black gradient-text mb-2">${result.score}% - PASSED</p>
              <p class="text-gray-300 mb-4">${result.correctCount}/${result.totalQuestions} correct</p>
              <div class="bg-purple-600/20 rounded-2xl p-6 mb-6 border border-purple-500/30">
                <p class="text-sm text-gray-400 mb-2">Your Certificate Code:</p>
                <div class="certificate-code-display text-2xl mb-1">${result.certificateCode}</div>
                <button onclick="window.copyToClipboard('${result.certificateCode}')" class="mt-2 text-xs text-cyan-400 hover:underline"><i class="fa-regular fa-copy mr-1"></i> Copy Code</button>
              </div>
              <div class="glass rounded-xl p-4 mb-6">
                <p class="text-sm">📞 Show this code to the academics team to claim your certificate:</p>
                <a href="https://wa.me/${(result.supportWhatsApp || '+263714587259').replace(/\+/g, '')}" target="_blank" class="text-cyan-400 font-bold text-lg whatsapp-link">${result.supportWhatsApp || '+263714587259'}</a>
              </div>
              <button onclick="window.renderPage('certificates')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-8 py-3 rounded-xl font-bold">View Certificates →</button>
            </div>
          </div>
        `;
        showToast('🎉 PASSED! Certificate code generated!', 'success');
      } else {
        root.innerHTML = `
          <div class="max-w-2xl mx-auto fade-in">
            <div class="glass rounded-3xl p-8 text-center">
              <div class="text-6xl mb-4">😔</div>
              <h2 class="text-2xl font-bold mb-2">Not Passed</h2>
              <p class="text-4xl font-black text-red-400 mb-2">${result.score}%</p>
              <p class="text-gray-400 mb-4">${result.correctCount}/${result.totalQuestions} correct • Need 70% to pass</p>
              <div class="glass rounded-xl p-4 mb-6">
                <p class="text-sm">⏳ 7-day cooldown before retake</p>
                ${result.retakePrice ? `<p class="text-sm mt-1">Retake fee: $${formatMoney(result.retakePrice)}</p>` : ''}
              </div>
              <button onclick="window.renderPage('dashboard')" class="bg-purple-600 px-8 py-3 rounded-xl font-bold">Back to Dashboard</button>
            </div>
          </div>
        `;
        showToast(`❌ Failed: ${result.score}% (Need 70%). Cooldown 7 days.`, 'error');
      }
    } catch (error) {
      showToast('Failed to submit exam', 'error');
      renderPage('exams');
    }
  }

  renderQuestion();
  startTimer();
}

// ==================== CHECKOUT - VOUCHER INSTANT AUTO-ENROLL ====================
window.openCheckout = async (courseId) => {
  if (!currentUser) { renderPage('login'); return; }

  if (isAlreadyEnrolled(courseId)) {
    showToast('You are already enrolled! Redirecting...', 'info');
    setTimeout(() => renderCourseDashboard(courseId), 500);
    return;
  }

  const course = coursesData.find(c => c.id === courseId);
  if (!course) { showToast('Course not found', 'error'); return; }
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div class="max-w-4xl mx-auto p-4 fade-in">
      <button onclick="window.renderPage('courses')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Courses</button>
      <div class="glass rounded-3xl p-6">
        <h1 class="text-2xl font-bold mb-6">Checkout</h1>

        <div class="glass rounded-2xl p-5 mb-6">
          <h2 class="text-xl font-bold mb-4">Order Summary</h2>
          <div class="space-y-3">
            <div class="flex justify-between py-2 border-b"><span>${escapeHtml(course.name)}</span><span id="coursePrice">$${course.examPrice}</span></div>
            <div><label class="text-sm text-gray-400">Choose your plan:</label><div class="space-y-2 mt-2"><label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer"><input type="radio" name="enrollType" value="exam_only" checked> <div><span class="font-medium">⚡ Exam Only</span><p class="text-xs text-gray-400">$${course.examPrice}</p></div></label><label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer"><input type="radio" name="enrollType" value="learning"> <div><span class="font-medium">📖 Learning Path</span><p class="text-xs text-gray-400">$${course.pathPrice}</p></div></label></div></div>
            <div class="flex justify-between py-3 border-b"><span>Discount</span><span id="discountAmount">$0.00</span></div>
            <div class="flex justify-between py-3 text-xl font-bold"><span>Total</span><span id="totalAmount">$${course.examPrice}</span></div>
            <div class="mt-6"><label class="text-sm text-gray-400">🎟️ Voucher Code (instant enrollment):</label><div class="flex gap-2 mt-2"><input id="voucherInput" placeholder="Enter voucher code" class="voucher-input flex-1 bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm uppercase focus:border-cyan-400 transition" autocomplete="off"><button id="applyVoucherBtn" class="glass px-4 py-2 rounded-xl text-sm">Apply</button></div><div id="voucherMessage" class="text-xs mt-2"></div></div>
          </div>
        </div>

        <div class="glass rounded-2xl p-5">
          <h2 class="text-xl font-bold mb-4">💳 Payment Methods (Coming Soon)</h2>
          <div class="space-y-2 mb-4">
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>💳 Credit Card <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>🅿️ PayPal <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>📱 EcoCash <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
          </div>
          <div class="p-3 bg-yellow-500/10 rounded-xl text-xs text-yellow-400 mb-4">
            <i class="fa-solid fa-circle-info mr-1"></i> <strong>Vouchers = instant enrollment!</strong> Enter a voucher code above and click Apply — you'll be enrolled immediately.
          </div>
          <div id="autoEnrollStatus" class="hidden text-center p-4 bg-green-500/10 rounded-xl">
            <p class="text-green-400 font-bold text-lg">🎉 Enrolled Successfully!</p>
            <p class="text-sm text-gray-300 mt-1">Redirecting to your course dashboard...</p>
            <div class="thinking-dots mt-2"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  let currentPrice = course.examPrice, currentDiscount = 0, appliedVoucher = null, selectedType = 'exam_only';

  document.querySelectorAll('input[name="enrollType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedType = e.target.value;
      const basePrice = selectedType === 'exam_only' ? course.examPrice : course.pathPrice;
      currentPrice = Math.max(0, basePrice - currentDiscount);
      document.getElementById('totalAmount').innerHTML = `<strong>$${formatMoney(currentPrice)}</strong>`;
      document.getElementById('coursePrice').innerHTML = `$${basePrice}`;
    });
  });

  document.getElementById('applyVoucherBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('voucherInput').value.trim();
    if (!code) { showToast('Please enter a voucher code', 'warning'); return; }

    const voucherMessage = document.getElementById('voucherMessage');
    voucherMessage.innerHTML = '<span class="text-cyan-400">Validating voucher...</span>';

    try {
      const validationResult = await validateVoucher(code, courseId);
      if (!validationResult.valid) {
        voucherMessage.innerHTML = `<span class="text-red-400">❌ ${validationResult.message}</span>`;
        return;
      }

      const checkoutResult = await createCheckout(courseId, selectedType, code, {
        firstName: currentUser.name?.split(' ')[0] || 'Student',
        lastName: currentUser.name?.split(' ')[1] || '',
        email: currentUser.email,
        phone: '',
        country: 'Zimbabwe'
      });

      if (checkoutResult.autoEnrolled) {
        voucherMessage.innerHTML = `<span class="text-green-400">✅ ${validationResult.message}</span>`;
        document.getElementById('discountAmount').innerText = `-$${formatMoney(checkoutResult.discount || 0)}`;
        document.getElementById('totalAmount').innerHTML = `<strong>$${formatMoney(checkoutResult.amount || 0)}</strong>`;
        document.getElementById('voucherInput').disabled = true;
        document.getElementById('applyVoucherBtn').disabled = true;
        document.getElementById('applyVoucherBtn').classList.add('opacity-50');

        const statusDiv = document.getElementById('autoEnrollStatus');
        if (statusDiv) statusDiv.classList.remove('hidden');

        try {
          const enrollmentData = await getMyEnrollments();
          userEnrollmentsCache = enrollmentData.enrollments || [];
        } catch (e) {}

        showToast('🎉 Enrolled successfully!', 'success');

        setTimeout(() => {
          renderCourseDashboard(courseId);
        }, 2000);
      } else if (checkoutResult.error) {
        voucherMessage.innerHTML = `<span class="text-red-400">❌ ${checkoutResult.error}</span>`;
      }
    } catch (error) {
      console.error('[CHECKOUT] Voucher apply error:', error);
      voucherMessage.innerHTML = `<span class="text-red-400">❌ ${error.message || 'Failed to apply voucher.'}</span>`;
    }
  });
};

// ==================== ADMIN CONSOLE WITH DRAG & DROP + ADD ADMIN MODAL ====================
async function renderAdmin() {
  if (!currentUser || currentUser.role !== 'admin') {
    renderPage('dashboard');
    showToast('Admin access required', 'error');
    return;
  }

  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading admin panel...</p></div>';

  try {
    const [stats, vouchersData, pendingData, usersData, coursesList, financeData] = await Promise.all([
      getAdminStats(), getVouchers(), getPendingCertificates(), getAllUsers(), getCourses(),
      getFinanceData().catch(() => ({ thisMonth: 0, lastMonth: 0, total: 0 }))
    ]);

    const vouchers = vouchersData.vouchers || [];
    const pending = pendingData.pending || [];
    const users = usersData.users || [];
    const courses = coursesList;

    // Admin render function (reused after reorder)
    window._adminCoursesData = courses;

    function renderAdminContent() {
      const currentCourses = window._adminCoursesData || courses;

      return `
        <div class="max-w-7xl mx-auto fade-in">
          <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
            <div>
              <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-2 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back</button>
              <h1 class="text-3xl sm:text-5xl font-black text-purple-400">👑 Admin Console</h1>
            </div>
          </div>

          <div class="stats-grid mb-8">
            <div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-users text-cyan-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-cyan-400">${stats.totalStudents || 0}</h3><p class="text-xs">Students</p></div>
            <div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-book-open text-green-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-green-400">${stats.totalCourses || currentCourses.length}</h3><p class="text-xs">Courses</p></div>
            <div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-dollar-sign text-yellow-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-yellow-400">$${formatMoney(financeData.total || stats.totalRevenue || 0)}</h3><p class="text-xs">Revenue</p></div>
            <div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-clock text-purple-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-purple-400">${pending.length}</h3><p class="text-xs">Pending</p></div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <button id="quickAddCourse" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition"><i class="fa-solid fa-plus-circle text-green-400 text-2xl"></i><p class="text-xs mt-1">Add Course</p></button>
            <button id="quickCreateVoucher" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition"><i class="fa-solid fa-ticket text-purple-400 text-2xl"></i><p class="text-xs mt-1">Voucher</p></button>
            <button id="quickManageUsers" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition"><i class="fa-solid fa-users-gear text-cyan-400 text-2xl"></i><p class="text-xs mt-1">Users</p></button>
            <button id="quickAddAdmin" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition"><i class="fa-solid fa-crown text-yellow-400 text-2xl"></i><p class="text-xs mt-1">Add Admin</p></button>
            <button id="quickApproveCerts" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition"><i class="fa-solid fa-certificate text-yellow-400 text-2xl"></i><p class="text-xs mt-1">Approve</p></button>
          </div>

          <div class="glass rounded-3xl p-6 mb-8">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold"><i class="fa-solid fa-book text-purple-400 mr-2"></i> Course Management</h2>
              <div class="flex gap-2">
                <button id="saveCourseOrderBtn" class="bg-green-600/50 hover:bg-green-600 px-4 py-1.5 rounded-xl text-sm transition"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Order</button>
                <button id="addCourseTableBtn" class="bg-green-600/50 hover:bg-green-600 px-4 py-1.5 rounded-xl text-sm transition">+ Add Course</button>
              </div>
            </div>
            <p class="text-xs text-gray-500 mb-2">Drag rows using the <i class="fa-solid fa-grip-vertical"></i> handle to reorder courses, then click Save Order.</p>
            <div class="overflow-x-auto">
              <table class="w-full admin-table" id="adminCourseTable">
                <thead><tr class="border-b border-white/10"><th class="text-left py-3 w-8"></th><th class="text-left">Course</th><th class="text-left">Exam $</th><th class="text-left">Path $</th><th class="text-left">Students</th><th class="text-left">Actions</th></tr></thead>
                <tbody id="adminCourseTableBody">
                  ${currentCourses.map((c, index) => `
                    <tr class="border-b border-white/10 hover:bg-white/5 course-drag-row" draggable="true" data-course-id="${c.id}" data-display-order="${index}">
                      <td class="py-3"><span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span></td>
                      <td class="py-3"><div class="flex items-center gap-2"><i class="fa-solid ${c.icon || 'fa-certificate'} text-purple-400"></i><span class="font-medium">${escapeHtml(c.name)}</span></div></td>
                      <td>$${c.examPrice}</td>
                      <td>$${c.pathPrice || ''}</td>
                      <td>${c.enrolledCount || 0}</td>
                      <td class="space-x-2">
                        <button onclick="window.showEditCourseModal('${c.id}')" class="text-cyan-400 hover:text-cyan-300"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="window.showDeleteCourseModal('${c.id}', '${escapeHtml(c.name).replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
                        <button onclick="window.showManageVideosModal('${c.id}')" class="text-yellow-400 hover:text-yellow-300"><i class="fa-solid fa-video"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="glass rounded-3xl p-6 mb-8">
            <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold"><i class="fa-solid fa-ticket text-purple-400 mr-2"></i> Vouchers</h2><div class="flex gap-2"><button id="createVoucherTableBtn" class="bg-purple-600/50 hover:bg-purple-600 px-4 py-1.5 rounded-xl text-sm">+ Create</button><button id="batchVoucherBtn" class="bg-blue-600/50 hover:bg-blue-600 px-4 py-1.5 rounded-xl text-sm">📦 Batch</button></div></div>
            <div class="overflow-x-auto"><table class="w-full admin-table"><thead><tr class="border-b border-white/10"><th class="text-left py-3">Code</th><th class="text-left">Discount</th><th class="text-left">Course</th><th class="text-left">Used/Max</th><th class="text-left">Expires</th><th class="text-left">Actions</th></tr></thead><tbody>${vouchers.length > 0 ? vouchers.map(v => `<tr class="border-b border-white/10 hover:bg-white/5"><td class="py-3"><span class="font-mono text-cyan-400">${escapeHtml(v.code)}</span><button onclick="window.copyToClipboard('${v.code}')" class="ml-2 text-gray-400 hover:text-cyan-400"><i class="fa-regular fa-copy"></i></button></td><td>${v.discountType === 'free' ? '🎁 FREE' : v.discountValue + (v.discountType === 'percentage' ? '% off' : '$ off')}</td><td>${v.courseId === 'all' ? 'All Courses' : currentCourses.find(c => c.id === v.courseId)?.name || v.courseId}</td><td>${v.usedCount}/${v.maxUses || 1}</td><td>${v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'Never'}</td><td><button onclick="window.deleteVoucherItem('${v.id}')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" class="text-center py-8 text-gray-400">No vouchers yet.</td></tr>'}</tbody></table></div>
          </div>

          <div class="glass rounded-3xl p-6 mb-8"><h2 class="text-xl font-bold mb-4"><i class="fa-solid fa-clock text-yellow-400 mr-2"></i> Pending Certificates (${pending.length})</h2><div class="space-y-3">${pending.length > 0 ? pending.map(p => `<div class="flex justify-between items-center glass rounded-xl p-4 flex-wrap gap-3"><div><p class="font-medium">${escapeHtml(p.userName || p.userEmail)}</p><p class="text-sm text-gray-400">${escapeHtml(p.courseName)} • Score: ${p.score}% • Code: ${p.certificateId || 'N/A'}</p></div><div class="flex gap-2"><button onclick="window.approveCertificateItem('${p.id}')" class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm">✅ Approve</button><button onclick="window.rejectCertificateItem('${p.id}')" class="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm">❌ Reject</button></div></div>`).join('') : '<div class="text-center py-8 text-gray-400">✅ No pending certificates</div>'}</div></div>

          <div class="glass rounded-3xl p-6 mb-8"><h2 class="text-xl font-bold mb-4"><i class="fa-solid fa-users-gear text-cyan-400 mr-2"></i> User Management</h2><div class="overflow-x-auto"><table class="w-full admin-table"><thead><tr class="border-b border-white/10"><th class="text-left py-3">User</th><th class="text-left">Role</th><th class="text-left">Courses</th><th class="text-left">Spent</th><th class="text-left">Actions</th></tr></thead><tbody>${users.map(u => `<tr class="border-b border-white/10 hover:bg-white/5"><td class="py-3"><div><p class="font-medium">${escapeHtml(u.name)}</p><p class="text-xs text-gray-400">${escapeHtml(u.email)}</p></div></td><td><span class="px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20'}">${u.role}</span></td><td>${u.enrolledCourses || 0}</td><td>$${formatMoney(u.totalSpent || 0)}</td><td class="space-x-2">${u.role !== 'admin' ? `<button onclick="window.makeUserAdminItem('${u.id}')" class="text-yellow-400 hover:text-yellow-300"><i class="fa-solid fa-crown"></i> Make Admin</button>` : ''}${u.email !== currentUser.email ? `<button onclick="window.showDeleteUserModal('${u.id}', '${escapeHtml(u.name).replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 ml-2"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
        </div>
      `;
    }

    root.innerHTML = renderAdminContent();

    // Drag and Drop for course reorder
    initDragAndDrop();

    document.getElementById('saveCourseOrderBtn')?.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#adminCourseTableBody .course-drag-row');
      const orderData = [];
      rows.forEach((row, index) => {
        orderData.push({
          courseId: row.dataset.courseId,
          displayOrder: index
        });
      });

      try {
        const response = await apiRequest('/admin/courses/reorder', {
          method: 'PUT',
          body: JSON.stringify({ courses: orderData })
        });
        showToast('Course order saved!', 'success');
        // Refresh courses data
        await loadCourses();
        window._adminCoursesData = [...coursesData];
      } catch (error) {
        showToast('Failed to save order: ' + error.message, 'error');
      }
    });

    document.getElementById('quickAddAdmin')?.addEventListener('click', () => showAddAdminModal());
    document.getElementById('quickAddCourse')?.addEventListener('click', () => showAddCourseModal());
    document.getElementById('addCourseTableBtn')?.addEventListener('click', () => showAddCourseModal());
    document.getElementById('quickCreateVoucher')?.addEventListener('click', () => showCreateVoucherModal());
    document.getElementById('createVoucherTableBtn')?.addEventListener('click', () => showCreateVoucherModal());
    document.getElementById('batchVoucherBtn')?.addEventListener('click', () => showBatchVoucherModal());
  } catch (error) {
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load admin panel</p></div>`;
  }
}

// ==================== DRAG & DROP FOR COURSE REORDER ====================
function initDragAndDrop() {
  const rows = document.querySelectorAll('#adminCourseTableBody .course-drag-row');
  let draggedRow = null;

  rows.forEach(row => {
    row.addEventListener('dragstart', function(e) {
      draggedRow = this;
      this.classList.add('course-row-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.dataset.courseId);
    });

    row.addEventListener('dragend', function(e) {
      this.classList.remove('course-row-dragging');
      document.querySelectorAll('.course-drag-row').forEach(r => r.classList.remove('course-row-drag-over'));
      draggedRow = null;
    });

    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this !== draggedRow) {
        this.classList.add('course-row-drag-over');
      }
    });

    row.addEventListener('dragleave', function(e) {
      this.classList.remove('course-row-drag-over');
    });

    row.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('course-row-drag-over');
      if (this !== draggedRow) {
        const tbody = document.getElementById('adminCourseTableBody');
        const allRows = [...tbody.querySelectorAll('.course-drag-row')];
        const draggedIndex = allRows.indexOf(draggedRow);
        const droppedIndex = allRows.indexOf(this);

        if (draggedIndex < droppedIndex) {
          tbody.insertBefore(draggedRow, this.nextSibling);
        } else {
          tbody.insertBefore(draggedRow, this);
        }
      }
    });
  });
}

// ==================== ADD ADMIN MODAL ====================
function showAddAdminModal() {
  const modalHtml = `
    <div id="addAdminModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);">
      <div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-gradient-to-r from-yellow-600 to-amber-500 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h2 class="text-xl font-bold"><i class="fa-solid fa-crown mr-2"></i> Add Admin</h2>
          <button onclick="closeModal('addAdminModal')" class="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>
        <div class="p-6">
          <p class="text-sm text-gray-400 mb-4">Create a new admin account or promote an existing user.</p>

          <div class="mb-6">
            <h3 class="font-semibold mb-3 text-yellow-400">Option 1: Create New Admin</h3>
            <div class="space-y-3">
              <input type="text" id="newAdminName" placeholder="Full name" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off">
              <input type="email" id="newAdminEmail" placeholder="Email address" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off">
              <input type="password" id="newAdminPassword" placeholder="Password (min 5 chars)" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off">
              <button onclick="createNewAdminAccount()" class="w-full bg-yellow-600 hover:bg-yellow-500 py-2 rounded-xl font-bold text-sm transition">➕ Create Admin Account</button>
            </div>
          </div>

          <div class="border-t border-white/10 pt-4">
            <h3 class="font-semibold mb-3 text-cyan-400">Option 2: Promote Existing User</h3>
            <div class="space-y-3">
              <input type="text" id="promoteUserEmail" placeholder="Enter user email to promote" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off">
              <button onclick="promoteExistingUser()" class="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-bold text-sm transition">👑 Promote to Admin</button>
            </div>
          </div>

          <button onclick="closeModal('addAdminModal')" class="w-full glass py-3 rounded-xl font-bold mt-4">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function createNewAdminAccount() {
  const name = document.getElementById('newAdminName')?.value;
  const email = document.getElementById('newAdminEmail')?.value;
  const password = document.getElementById('newAdminPassword')?.value;

  if (!name || !email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  if (password.length < 5) {
    showToast('Password must be at least 5 characters', 'error');
    return;
  }

  try {
    const response = await apiRequest('/admin/add-admin', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    showToast(response.message, 'success');
    closeModal('addAdminModal');
    renderAdmin();
  } catch (error) {
    showToast('Failed: ' + error.message, 'error');
  }
}

async function promoteExistingUser() {
  const email = document.getElementById('promoteUserEmail')?.value;

  if (!email) {
    showToast('Please enter a user email', 'error');
    return;
  }

  try {
    // First get the user by finding them in the users list
    const usersData = await getAllUsers();
    const user = usersData.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      showToast('User not found with that email', 'error');
      return;
    }

    if (user.role === 'admin') {
      showToast('This user is already an admin', 'info');
      return;
    }

    const response = await apiRequest('/admin/add-admin', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id })
    });
    showToast(response.message, 'success');
    closeModal('addAdminModal');
    renderAdmin();
  } catch (error) {
    showToast('Failed: ' + error.message, 'error');
  }
}

window.createNewAdminAccount = createNewAdminAccount;
window.promoteExistingUser = promoteExistingUser;

// ==================== ADMIN MODALS ====================
function showAddCourseModal() {
  const modalHtml = `<div id="addCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold"><i class="fa-solid fa-plus-circle mr-2"></i> Add New Course</h2><button onclick="closeModal('addCourseModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Course Name *</label><input type="text" id="courseName" placeholder="e.g., DevOps Master" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition" autocomplete="off"></div><div><label class="block text-sm font-medium mb-1">Description</label><textarea id="courseDesc" rows="3" placeholder="Course description..." class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></textarea></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Exam Price *</label><input type="number" id="examPrice" placeholder="99" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Path Price</label><input type="number" id="pathPrice" placeholder="149" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Icon</label><input type="text" id="courseIcon" placeholder="fa-certificate" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Category</label><select id="courseCategory" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option>Networking</option><option>Cybersecurity</option><option>Cloud Computing</option><option>Development</option><option>AI</option><option>Business</option><option>Professional Skills</option></select></div></div><div class="pt-4 flex gap-3"><button onclick="createNewCourse()" class="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 py-3 rounded-xl font-bold">➕ Create Course</button><button onclick="closeModal('addCourseModal')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function createNewCourse() {
  const name = document.getElementById('courseName')?.value;
  const description = document.getElementById('courseDesc')?.value;
  const examPrice = document.getElementById('examPrice')?.value;
  const pathPrice = document.getElementById('pathPrice')?.value;
  const icon = document.getElementById('courseIcon')?.value || 'fa-certificate';
  const category = document.getElementById('courseCategory')?.value;
  if (!name || !examPrice) { showToast('Name and exam price required', 'error'); return; }
  try {
    await createCourse({ name, description, examPrice, pathPrice, icon, category });
    showToast('Course created!', 'success');
    closeModal('addCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
}

window.showEditCourseModal = (courseId) => {
  const course = coursesData.find(c => c.id === courseId);
  if (!course) { showToast('Course not found', 'error'); return; }
  const modalHtml = `<div id="editCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">✏️ Edit: ${escapeHtml(course.name)}</h2><button onclick="closeModal('editCourseModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Course Name *</label><input type="text" id="editCourseName" value="${escapeHtml(course.name)}" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Description</label><textarea id="editCourseDesc" rows="3" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition">${escapeHtml(course.description || '')}</textarea></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Exam Price *</label><input type="number" id="editExamPrice" value="${course.examPrice}" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Path Price</label><input type="number" id="editPathPrice" value="${course.pathPrice || ''}" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div></div><div class="pt-4 flex gap-3"><button onclick="saveEditCourse('${courseId}')" class="flex-1 bg-cyan-600 py-3 rounded-xl font-bold">💾 Save Changes</button><button onclick="closeModal('editCourseModal')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveEditCourse = async (courseId) => {
  const name = document.getElementById('editCourseName')?.value;
  const description = document.getElementById('editCourseDesc')?.value;
  const examPrice = document.getElementById('editExamPrice')?.value;
  const pathPrice = document.getElementById('editPathPrice')?.value;
  if (!name || !examPrice) { showToast('Name and exam price required', 'error'); return; }
  try {
    await updateCourse(courseId, { name, description, examPrice: parseFloat(examPrice), pathPrice: parseFloat(pathPrice) || null });
    showToast('Course updated!', 'success');
    closeModal('editCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
};

window.showDeleteCourseModal = (courseId, courseName) => {
  const modalHtml = `<div id="deleteCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">⚠️ Delete Course</h2><button onclick="closeModal('deleteCourseModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-book text-5xl text-red-400 mb-3"></i><p>Delete <strong class="text-red-400">"${escapeHtml(courseName)}"</strong>?</p><p class="text-sm text-gray-400 mt-2">This cannot be undone.</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">DELETE</span> to confirm:</label><input type="text" id="deleteConfirmInput" placeholder="DELETE" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2 focus:border-red-400 transition" autocomplete="off"></div><div class="flex gap-3"><button onclick="confirmDeleteCourse('${courseId}')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Delete</button><button onclick="closeModal('deleteCourseModal')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.confirmDeleteCourse = async (courseId) => {
  const confirmInput = document.getElementById('deleteConfirmInput')?.value;
  if (confirmInput !== 'DELETE') { showToast('Type DELETE to confirm', 'error'); return; }
  try {
    await deleteCourse(courseId);
    showToast('Course deleted!', 'success');
    closeModal('deleteCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
};

window.showManageVideosModal = (courseId) => {
  const course = coursesData.find(c => c.id === courseId);
  if (!course) return;
  const totalModules = course.modules || 8;
  let moduleInputs = '';
  for (let i = 1; i <= totalModules; i++) {
    moduleInputs += `<div><label class="block text-sm mb-1">Module ${i}: ${escapeHtml(course['module' + i + 'Name'] || 'Module ' + i)}</label><input type="text" id="videoUrl${i}" value="${escapeHtml(course['module' + i + 'VideoUrl'] || '')}" placeholder="YouTube URL" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-yellow-400 transition mb-2" autocomplete="off"></div>`;
  }
  const modalHtml = `<div id="manageVideosModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-yellow-600 to-orange-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">📹 Videos: ${escapeHtml(course.name)}</h2><button onclick="closeModal('manageVideosModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-3">${moduleInputs}</div><div class="pt-4 flex gap-3"><button onclick="saveCourseVideos('${courseId}', ${totalModules})" class="flex-1 bg-yellow-600 py-3 rounded-xl font-bold">💾 Save All</button><button onclick="closeModal('manageVideosModal')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveCourseVideos = async (courseId, count) => {
  const updates = {};
  for (let i = 1; i <= count; i++) {
    updates['module' + i + 'VideoUrl'] = document.getElementById('videoUrl' + i)?.value || '';
  }
  try { await updateCourse(courseId, updates); showToast('Videos saved!', 'success'); closeModal('manageVideosModal'); await loadCourses(); }
  catch (error) { showToast('Failed to save videos', 'error'); }
};

function showCreateVoucherModal() {
  const modalHtml = `<div id="createVoucherModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">🎟️ Create Voucher</h2><button onclick="closeModal('createVoucherModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm mb-1">Code *</label><input type="text" id="voucherCode" placeholder="SUMMER2026" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 uppercase focus:border-cyan-400 transition" autocomplete="off"><button id="genRandomCode" class="mt-1 text-xs text-cyan-400 hover:underline">🎲 Random</button></div><div><label class="block text-sm mb-1">Discount Type *</label><select id="discountType" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed ($)</option><option value="free">Free (100%)</option></select></div><div><label class="block text-sm mb-1">Discount Value</label><input type="number" id="discountValue" placeholder="20" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div><label class="block text-sm mb-1">Course</label><select id="voucherCourse" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="all">All Courses</option>${coursesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div><div><label class="block text-sm mb-1">Max Uses</label><input type="number" id="maxUses" value="100" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div class="pt-4 flex gap-3"><button onclick="createNewVoucher()" class="flex-1 bg-purple-600 py-3 rounded-xl font-bold">🎟️ Create</button><button onclick="closeModal('createVoucherModal')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('genRandomCode')?.addEventListener('click', () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = ''; for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('voucherCode').value = code;
  });
}

async function createNewVoucher() {
  const code = document.getElementById('voucherCode')?.value;
  const discountType = document.getElementById('discountType')?.value;
  const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;
  const courseId = document.getElementById('voucherCourse')?.value;
  const maxUses = parseInt(document.getElementById('maxUses')?.value) || 1;
  if (!code) { showToast('Code required', 'error'); return; }
  try {
    await createVoucher({ code: code.toUpperCase(), discountType, discountValue, courseId, maxUses });
    showToast('Voucher created!', 'success');
    closeModal('createVoucherModal');
    renderAdmin();
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
}

function showBatchVoucherModal() {
  const modalHtml = `<div id="batchVoucherModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-lg"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">📦 Batch Vouchers</h2><button onclick="closeModal('batchVoucherModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm mb-1">Prefix *</label><input type="text" id="batchPrefix" placeholder="SUMMER" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 uppercase"></div><div><label class="block text-sm mb-1">Count *</label><input type="number" id="batchCount" value="10" min="1" max="500" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div><label class="block text-sm mb-1">Discount Type</label><select id="batchDiscountType" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="free">Free</option></select></div><div><label class="block text-sm mb-1">Discount Value</label><input type="number" id="batchDiscountValue" placeholder="20" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div class="pt-4 flex gap-3"><button onclick="createBatchVouchers()" class="flex-1 bg-purple-600 py-3 rounded-xl font-bold">📦 Create</button><button onclick="closeModal('batchVoucherModal')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function createBatchVouchers() {
  const prefix = document.getElementById('batchPrefix')?.value;
  const count = parseInt(document.getElementById('batchCount')?.value);
  if (!prefix || count < 1) { showToast('Prefix and count required', 'error'); return; }
  try {
    const result = await createBatchVouchers({
      prefix: prefix.toUpperCase(), count,
      discountType: document.getElementById('batchDiscountType')?.value,
      discountValue: parseFloat(document.getElementById('batchDiscountValue')?.value) || 0,
      courseId: 'all', maxUses: 1
    });
    showToast(`Created ${result.vouchers.length} vouchers!`, 'success');
    closeModal('batchVoucherModal');
    renderAdmin();
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
}

// Admin utility functions
window.copyToClipboard = (text) => { navigator.clipboard.writeText(text); showToast('Copied!', 'success'); };
window.approveCertificateItem = async (id) => { try { await approveCertificate(id); showToast('Approved!', 'success'); renderAdmin(); } catch (e) { showToast('Failed', 'error'); } };
window.rejectCertificateItem = async (id) => { try { await rejectCertificate(id); showToast('Rejected', 'info'); renderAdmin(); } catch (e) { showToast('Failed', 'error'); } };
window.makeUserAdminItem = async (id) => { if (confirm('Make this user an admin?')) { try { await makeAdmin(id); showToast('Admin granted!', 'success'); renderAdmin(); } catch (e) { showToast('Failed', 'error'); } } };
window.deleteVoucherItem = async (id) => { if (confirm('Delete voucher?')) { try { await deleteVoucher(id); showToast('Deleted', 'success'); renderAdmin(); } catch (e) { showToast('Failed', 'error'); } } };
window.showDeleteUserModal = (userId, userName) => {
  const modalHtml = `<div id="deleteUserModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">🗑️ Delete User</h2><button onclick="closeModal('deleteUserModal')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-user text-5xl text-red-400 mb-3"></i><p>Delete <strong class="text-red-400">"${escapeHtml(userName)}"</strong>?</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">DELETE</span>:</label><input type="text" id="deleteUserConfirmInput" placeholder="DELETE" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2" autocomplete="off"></div><div class="flex gap-3"><button onclick="confirmDeleteUser('${userId}')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Delete</button><button onclick="closeModal('deleteUserModal')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};
window.confirmDeleteUser = async (userId) => {
  const input = document.getElementById('deleteUserConfirmInput')?.value;
  if (input !== 'DELETE') { showToast('Type DELETE to confirm', 'error'); return; }
  try { await deleteUserByAdmin(userId); showToast('User deleted', 'success'); closeModal('deleteUserModal'); renderAdmin(); }
  catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.remove(); }

// ==================== AI TEACHER CHAT (SEPARATE MODAL - UNIQUE UI PER LECTURER) ====================
let teacherChatHistory = {};
let currentTeacherCourseId = null;

function getTeacherConfig(courseId) {
  const teachers = {
    ncp: { name: 'Professor Carlos', title: 'Network Certified Instructor • 12 Years', avatar: '📡', theme: 'ncp', greeting: 'Hello! I\'m Professor Carlos. I specialize in networking certifications. How can I help you master NCP today? 📡' },
    ccp: { name: 'Professor Sarah Chen', title: 'Computer Science Professor • 15 Years', avatar: '📚', theme: 'ccp', greeting: 'Welcome! I\'m Professor Sarah Chen. Ready to dive into computer science fundamentals? Let\'s learn together! 📚' },
    clp: { name: 'Professor Mike Ross', title: 'Cloud Architect • AWS Certified', avatar: '☁️', theme: 'clp', greeting: 'Hey there! I\'m Professor Mike Ross. The cloud is infinite — let me show you how to master it! ☁️' },
    aip: { name: 'Professor Nova Turing', title: 'AI Research Scientist', avatar: '🧠', theme: 'aip', greeting: 'Greetings! I\'m Professor Nova Turing. Neural networks, deep learning — let\'s explore AI together! 🧠' },
    default: { name: 'Professor Sarah Chen', title: 'Senior Instructor', avatar: '📚', theme: 'default', greeting: 'Hello! I\'m here to help you learn. What would you like to know?' }
  };
  return teachers[courseId] || teachers.default;
}

window.openAITeacherChat = function(courseId) {
  currentTeacherCourseId = courseId;
  const teacher = getTeacherConfig(courseId);
  const modal = document.getElementById('aiTeacherModal');

  if (!modal) return;

  // Update teacher header
  const header = document.getElementById('aiTeacherHeader');
  const avatar = document.getElementById('aiTeacherAvatar');
  const nameEl = document.getElementById('aiTeacherName');
  const titleEl = document.getElementById('aiTeacherTitle');
  const sendBtn = document.getElementById('sendTeacherChat');
  const messagesDiv = document.getElementById('teacherChatMessages');
  const welcomeDiv = document.getElementById('teacherWelcomeMessage');

  // Remove all theme classes and add correct one
  header.className = 'px-5 py-4 flex justify-between items-center shrink-0';
  header.classList.add('teacher-header-' + teacher.theme);

  if (avatar) avatar.textContent = teacher.avatar;
  if (nameEl) nameEl.textContent = teacher.name;
  if (titleEl) titleEl.textContent = teacher.title;

  // Update send button theme
  if (sendBtn) {
    sendBtn.className = 'w-10 h-10 rounded-xl flex items-center justify-center transition hover:scale-105';
    sendBtn.classList.add('teacher-send-btn-' + teacher.theme);
  }

  // Initialize or restore chat history
  if (!teacherChatHistory[courseId]) {
    teacherChatHistory[courseId] = [
      { role: 'assistant', content: teacher.greeting }
    ];
  }

  restoreTeacherChatHistory(courseId, teacher);

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function restoreTeacherChatHistory(courseId, teacher) {
  const chatDiv = document.getElementById('teacherChatMessages');
  if (!chatDiv) return;

  chatDiv.innerHTML = '';
  const history = teacherChatHistory[courseId] || [];

  history.forEach(msg => {
    if (msg.role === 'user') {
      const div = document.createElement('div');
      div.className = 'flex justify-end mb-3';
      div.innerHTML = `<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm">${escapeHtml(msg.content)}</p></div>`;
      chatDiv.appendChild(div);
    } else if (msg.role === 'assistant') {
      const div = document.createElement('div');
      div.className = 'flex gap-2 mb-3';
      let content = msg.content;
      const wa = '+263714587259';
      if (content.includes(wa)) content = content.replace(new RegExp(escapeRegex(wa), 'g'), `<a href="https://wa.me/${wa.replace(/\+/g, '')}" target="_blank" class="whatsapp-link">${wa}</a>`);
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full teacher-avatar-bg-${teacher.theme} flex items-center justify-center text-xs text-white shrink-0">${teacher.avatar}</div>
        <div class="glass rounded-2xl p-3 max-w-[80%]">
          <p class="text-sm">${content}</p>
          <div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2">
            <button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition" onclick="handleTeacherCopy(this, '${escapeHtml(content).replace(/'/g, "\\'")}')" title="Copy"><i class="fa-regular fa-copy"></i></button>
            <button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition" onclick="handleTeacherLike(this)" title="Like"><i class="fa-regular fa-thumbs-up"></i></button>
            <button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition" onclick="handleTeacherDislike(this)" title="Dislike"><i class="fa-regular fa-thumbs-down"></i></button>
            <button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition" onclick="handleTeacherRegenerate('${courseId}')" title="Regenerate"><i class="fa-solid fa-rotate"></i></button>
          </div>
        </div>
      `;
      chatDiv.appendChild(div);
    }
  });

  chatDiv.scrollTop = chatDiv.scrollHeight;
}

async function sendTeacherChatMessage() {
  const input = document.getElementById('teacherChatInput');
  const message = input.value.trim();
  if (!message || !currentTeacherCourseId) return;

  const courseId = currentTeacherCourseId;
  const teacher = getTeacherConfig(courseId);
  const chatDiv = document.getElementById('teacherChatMessages');

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'flex justify-end mb-3';
  userDiv.innerHTML = `<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm">${escapeHtml(message)}</p></div>`;
  chatDiv.appendChild(userDiv);

  // Add thinking indicator
  const aiDiv = document.createElement('div');
  aiDiv.className = 'flex gap-2 mb-3';
  aiDiv.innerHTML = `
    <div class="w-8 h-8 rounded-full teacher-avatar-bg-${teacher.theme} flex items-center justify-center text-xs text-white shrink-0">${teacher.avatar}</div>
    <div class="glass rounded-2xl p-3 max-w-[80%]"><div class="thinking-dots"><span></span><span></span><span></span></div></div>
  `;
  chatDiv.appendChild(aiDiv);

  const responseDiv = aiDiv.querySelector('.glass');
  const dots = aiDiv.querySelector('.thinking-dots');
  input.value = '';
  chatDiv.scrollTop = chatDiv.scrollHeight;

  // Save user message to history
  if (!teacherChatHistory[courseId]) teacherChatHistory[courseId] = [];
  teacherChatHistory[courseId].push({ role: 'user', content: message });

  try {
    // Send to AI teacher endpoint
    const response = await apiRequest(`/ai/teacher/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ message, moduleContext: teacher.title })
    });

    const aiResponse = response.response || 'Let me help you with that!';
    if (dots) dots.remove();

    let formattedResponse = aiResponse;
    const wa = '+263714587259';
    if (formattedResponse.includes(wa)) formattedResponse = formattedResponse.replace(new RegExp(escapeRegex(wa), 'g'), `<a href="https://wa.me/${wa.replace(/\+/g, '')}" target="_blank" class="whatsapp-link">${wa}</a>`);

    responseDiv.innerHTML = `
      <p class="text-sm">${formattedResponse}</p>
      <div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2">
        <button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition" title="Copy"><i class="fa-regular fa-copy"></i></button>
        <button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition" title="Like"><i class="fa-regular fa-thumbs-up"></i></button>
        <button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition" title="Dislike"><i class="fa-regular fa-thumbs-down"></i></button>
        <button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition" title="Regenerate"><i class="fa-solid fa-rotate"></i></button>
      </div>
    `;

    // Attach event listeners to new buttons
    attachAIActionListeners(responseDiv, aiResponse, courseId);

    // Save assistant message to history
    teacherChatHistory[courseId].push({ role: 'assistant', content: aiResponse });

  } catch (e) {
    if (dots) dots.remove();
    responseDiv.innerHTML = '<p class="text-red-400 text-sm">Sorry, I\'m having trouble responding. Please try again.</p>';
    teacherChatHistory[courseId].push({ role: 'assistant', content: 'Sorry, I\'m having trouble responding.' });
  }

  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ==================== AI ACTION BUTTONS (Like/Dislike/Copy/Regenerate) ====================
function attachAIActionListeners(container, responseText, courseId) {
  if (!container) return;

  const copyBtn = container.querySelector('.ai-copy-btn');
  const likeBtn = container.querySelector('.ai-like-btn');
  const dislikeBtn = container.querySelector('.ai-dislike-btn');
  const regenerateBtn = container.querySelector('.ai-regenerate-btn');

  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(responseText);
    showToast('Copied!', 'success');
  });

  likeBtn?.addEventListener('click', () => {
    likeBtn.classList.add('ai-liked');
    dislikeBtn?.classList.remove('ai-disliked');
    showToast('Thanks for your feedback! 👍', 'success');
  });

  dislikeBtn?.addEventListener('click', () => {
    dislikeBtn.classList.add('ai-disliked');
    likeBtn?.classList.remove('ai-liked');
    showToast('Thanks for your feedback. We\'ll improve.', 'info');
  });

  regenerateBtn?.addEventListener('click', () => {
    if (courseId) {
      // Remove last assistant message and re-send last user message
      const history = teacherChatHistory[courseId] || [];
      if (history.length >= 2) {
        history.pop(); // Remove last assistant message
        const lastUserMsg = history[history.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          // Re-send
          history.pop(); // Remove user message too
          sendTeacherChatRegenerate(courseId, lastUserMsg.content);
        }
      }
    }
  });
}

async function sendTeacherChatRegenerate(courseId, message) {
  const teacher = getTeacherConfig(courseId);
  const chatDiv = document.getElementById('teacherChatMessages');
  if (!chatDiv) return;

  // Add user message again
  const userDiv = document.createElement('div');
  userDiv.className = 'flex justify-end mb-3';
  userDiv.innerHTML = `<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm">${escapeHtml(message)}</p></div>`;
  chatDiv.appendChild(userDiv);

  const aiDiv = document.createElement('div');
  aiDiv.className = 'flex gap-2 mb-3';
  aiDiv.innerHTML = `
    <div class="w-8 h-8 rounded-full teacher-avatar-bg-${teacher.theme} flex items-center justify-center text-xs text-white shrink-0">${teacher.avatar}</div>
    <div class="glass rounded-2xl p-3 max-w-[80%]"><div class="thinking-dots"><span></span><span></span><span></span></div></div>
  `;
  chatDiv.appendChild(aiDiv);

  const responseDiv = aiDiv.querySelector('.glass');
  const dots = aiDiv.querySelector('.thinking-dots');
  chatDiv.scrollTop = chatDiv.scrollHeight;

  teacherChatHistory[courseId].push({ role: 'user', content: message });

  try {
    const response = await apiRequest(`/ai/teacher/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ message, moduleContext: teacher.title })
    });
    const aiResponse = response.response || 'Let me help you with that!';
    if (dots) dots.remove();

    responseDiv.innerHTML = `
      <p class="text-sm">${aiResponse}</p>
      <div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2">
        <button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition"><i class="fa-regular fa-copy"></i></button>
        <button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition"><i class="fa-regular fa-thumbs-up"></i></button>
        <button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition"><i class="fa-regular fa-thumbs-down"></i></button>
        <button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition"><i class="fa-solid fa-rotate"></i></button>
      </div>
    `;
    attachAIActionListeners(responseDiv, aiResponse, courseId);
    teacherChatHistory[courseId].push({ role: 'assistant', content: aiResponse });
  } catch (e) {
    if (dots) dots.remove();
    responseDiv.innerHTML = '<p class="text-red-400 text-sm">Sorry, I\'m having trouble responding.</p>';
    teacherChatHistory[courseId].push({ role: 'assistant', content: 'Sorry, I\'m having trouble responding.' });
  }
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function closeTeacherChatModal() {
  const modal = document.getElementById('aiTeacherModal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  currentTeacherCourseId = null;
}

function clearTeacherChat() {
  if (currentTeacherCourseId) {
    const teacher = getTeacherConfig(currentTeacherCourseId);
    teacherChatHistory[currentTeacherCourseId] = [
      { role: 'assistant', content: teacher.greeting }
    ];
    restoreTeacherChatHistory(currentTeacherCourseId, teacher);
    showToast('Chat cleared', 'info');
  }
}

function expandTeacherChat() {
  const modal = document.getElementById('aiTeacherModal');
  if (modal) {
    modal.classList.toggle('expanded');
    const icon = document.querySelector('#expandTeacherChat i');
    if (icon) icon.className = modal.classList.contains('expanded') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }
}

// ==================== AI WIDGET CHAT (Landing + Dashboard) ====================
function openAIChatModal(courseId = null) {
  currentAIChatCourseId = courseId;
  aiWidgetActive = true;
  const modal = document.getElementById('aiChatModal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); restoreChatHistory(); }
}

function restoreChatHistory() {
  const chatDiv = document.getElementById('chatMessages');
  if (!chatDiv) return;
  chatDiv.innerHTML = '';
  aiChatHistory.forEach(msg => {
    if (msg.role === 'user') {
      const div = document.createElement('div');
      div.className = 'flex justify-end mb-3';
      div.innerHTML = `<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm">${escapeHtml(msg.content)}</p></div>`;
      chatDiv.appendChild(div);
    } else if (msg.role === 'assistant') {
      const div = document.createElement('div');
      div.className = 'flex gap-2 mb-3';
      let content = msg.content;
      const wa = '+263714587259';
      if (content.includes(wa)) content = content.replace(new RegExp(escapeRegex(wa), 'g'), `<a href="https://wa.me/${wa.replace(/\+/g, '')}" target="_blank" class="whatsapp-link">${wa}</a>`);
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white shrink-0">AI</div>
        <div class="glass rounded-2xl p-3 max-w-[80%]">
          <p class="text-sm">${content}</p>
          <div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2">
            <button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition" title="Copy"><i class="fa-regular fa-copy"></i></button>
            <button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition" title="Like"><i class="fa-regular fa-thumbs-up"></i></button>
            <button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition" title="Dislike"><i class="fa-regular fa-thumbs-down"></i></button>
            <button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition" title="Regenerate"><i class="fa-solid fa-rotate"></i></button>
          </div>
        </div>
      `;
      chatDiv.appendChild(div);
    }
  });
  chatDiv.scrollTop = chatDiv.scrollHeight;

  // Attach listeners to all action buttons
  chatDiv.querySelectorAll('.ai-action-buttons').forEach(btnGroup => {
    const copyBtn = btnGroup.querySelector('.ai-copy-btn');
    const likeBtn = btnGroup.querySelector('.ai-like-btn');
    const dislikeBtn = btnGroup.querySelector('.ai-dislike-btn');

    copyBtn?.addEventListener('click', (e) => {
      const responseText = btnGroup.closest('.glass')?.querySelector('p')?.textContent || '';
      navigator.clipboard.writeText(responseText);
      showToast('Copied!', 'success');
    });

    likeBtn?.addEventListener('click', () => {
      likeBtn.classList.add('ai-liked');
      dislikeBtn?.classList.remove('ai-disliked');
      showToast('Thanks for your feedback! 👍', 'success');
    });

    dislikeBtn?.addEventListener('click', () => {
      dislikeBtn.classList.add('ai-disliked');
      likeBtn?.classList.remove('ai-liked');
      showToast('Thanks for your feedback. We\'ll improve.', 'info');
    });
  });
}

window.openAIChatModal = openAIChatModal;
window.openAITeacherChat = openAITeacherChat;

function closeAIChatModal() {
  const modal = document.getElementById('aiChatModal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  aiWidgetActive = false;
  aiChatHistory = [{ role: 'assistant', content: 'Hi! I\'m ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓' }];
}

async function sendAIChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  const chatDiv = document.getElementById('chatMessages');

  const userDiv = document.createElement('div');
  userDiv.className = 'flex justify-end mb-3';
  userDiv.innerHTML = `<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm">${escapeHtml(message)}</p></div>`;
  chatDiv.appendChild(userDiv);

  const aiDiv = document.createElement('div');
  aiDiv.className = 'flex gap-2 mb-3';
  aiDiv.innerHTML = `<div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white shrink-0">AI</div><div class="glass rounded-2xl p-3 max-w-[80%]"><div class="thinking-dots"><span></span><span></span><span></span></div></div>`;
  chatDiv.appendChild(aiDiv);

  const responseDiv = aiDiv.querySelector('.glass');
  const dots = aiDiv.querySelector('.thinking-dots');
  input.value = '';
  chatDiv.scrollTop = chatDiv.scrollHeight;

  try {
    const result = await sendAIMessage(message);
    if (dots) dots.remove();
    responseDiv.innerHTML = `
      <p class="text-sm">${result.response}</p>
      <div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2">
        <button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition" title="Copy"><i class="fa-regular fa-copy"></i></button>
        <button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition" title="Like"><i class="fa-regular fa-thumbs-up"></i></button>
        <button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition" title="Dislike"><i class="fa-regular fa-thumbs-down"></i></button>
        <button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition" title="Regenerate"><i class="fa-solid fa-rotate"></i></button>
      </div>
    `;
    attachWidgetActionListeners(responseDiv);
  } catch (e) {
    if (dots) dots.remove();
    responseDiv.innerHTML = '<p class="text-red-400 text-sm">AI unavailable.</p>';
  }
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function attachWidgetActionListeners(container) {
  const copyBtn = container.querySelector('.ai-copy-btn');
  const likeBtn = container.querySelector('.ai-like-btn');
  const dislikeBtn = container.querySelector('.ai-dislike-btn');

  copyBtn?.addEventListener('click', () => {
    const text = container.querySelector('p')?.textContent || '';
    navigator.clipboard.writeText(text);
    showToast('Copied!', 'success');
  });

  likeBtn?.addEventListener('click', () => {
    likeBtn.classList.add('ai-liked');
    dislikeBtn?.classList.remove('ai-disliked');
    showToast('Thanks for your feedback! 👍', 'success');
  });

  dislikeBtn?.addEventListener('click', () => {
    dislikeBtn.classList.add('ai-disliked');
    likeBtn?.classList.remove('ai-liked');
    showToast('Thanks for your feedback. We\'ll improve.', 'info');
  });
}

function clearAIChat() {
  aiChatHistory = [{ role: 'assistant', content: 'Hi! I\'m ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓' }];
  const chatDiv = document.getElementById('chatMessages');
  if (chatDiv) restoreChatHistory();
  showToast('Chat cleared', 'info');
}

function expandAIChat() {
  const modal = document.getElementById('aiChatModal');
  if (modal) {
    modal.classList.toggle('expanded');
    const icon = document.querySelector('#expandAIChat i');
    if (icon) icon.className = modal.classList.contains('expanded') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }
}

// ==================== INITIALIZATION ====================
window.renderPage = renderPage;
window.renderCourseDashboard = renderCourseDashboard;
window.renderModulePage = renderModulePage;
window.startExam = startExam;
window.completeModuleAndReturn = completeModuleAndReturn;
window.retryQuiz = retryQuiz;
window.handleEnrollClick = handleEnrollClick;
window.openCheckout = openCheckout;
window.openAIChatModal = openAIChatModal;
window.openAITeacherChat = openAITeacherChat;
window.showEditCourseModal = showEditCourseModal;
window.saveEditCourse = saveEditCourse;
window.showDeleteCourseModal = showDeleteCourseModal;
window.confirmDeleteCourse = confirmDeleteCourse;
window.showManageVideosModal = showManageVideosModal;
window.saveCourseVideos = saveCourseVideos;
window.showDeleteUserModal = showDeleteUserModal;
window.confirmDeleteUser = confirmDeleteUser;
window.approveCertificateItem = approveCertificateItem;
window.rejectCertificateItem = rejectCertificateItem;
window.makeUserAdminItem = makeUserAdminItem;
window.copyToClipboard = copyToClipboard;
window.deleteVoucherItem = deleteVoucherItem;
window.downloadCertificate = (id) => showToast('PDF download coming soon', 'info');
window.shareToLinkedIn = (id) => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/verify/' + id)}`, '_blank');
window.verifyCertificate = (id) => window.open(`/verify/${id}`, '_blank');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 obliXel Academy v10.0 - DOM loaded');

  initNavbarAutoHide();

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  mobileMenuBtn?.addEventListener('click', (e) => { e.stopPropagation(); mobileMenu.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn?.contains(e.target)) {
      mobileMenu.classList.add('hidden');
    }
  });
  window.addEventListener('scroll', () => { if (mobileMenu && !mobileMenu.classList.contains('hidden')) mobileMenu.classList.add('hidden'); });
  document.querySelectorAll('.nav-link-mobile').forEach(link => link.addEventListener('click', () => mobileMenu.classList.add('hidden')));

  document.getElementById('login-nav-btn')?.addEventListener('click', (e) => { e.preventDefault(); renderPage('login'); });
  document.getElementById('register-nav-btn')?.addEventListener('click', (e) => { e.preventDefault(); renderPage('register'); });
  document.getElementById('logout-btn')?.addEventListener('click', () => { logout(); });
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => { logout(); mobileMenu?.classList.add('hidden'); });

  const logo = document.getElementById('navbarLogo');
  if (logo) logo.addEventListener('click', () => { renderPage(currentUser ? 'dashboard' : 'landing'); });

  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); renderPage(btn.dataset.nav); mobileMenu?.classList.add('hidden'); }));

  // AI Widget event listeners
  const aiBtn = document.getElementById('aiChatButton');
  const closeBtn = document.getElementById('closeAiChat');
  const sendBtn = document.getElementById('sendChat');
  const clearBtn = document.getElementById('clearAIChat');
  const expandBtn = document.getElementById('expandAIChat');
  const chatInput = document.getElementById('chatInput');

  aiBtn?.addEventListener('click', () => openAIChatModal());
  closeBtn?.addEventListener('click', closeAIChatModal);
  sendBtn?.addEventListener('click', sendAIChatMessage);
  clearBtn?.addEventListener('click', clearAIChat);
  expandBtn?.addEventListener('click', expandAIChat);
  chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAIChatMessage(); });

  // AI Teacher event listeners
  const closeTeacherBtn = document.getElementById('closeTeacherChat');
  const sendTeacherBtn = document.getElementById('sendTeacherChat');
  const clearTeacherBtn = document.getElementById('clearTeacherChat');
  const expandTeacherBtn = document.getElementById('expandTeacherChat');
  const teacherChatInput = document.getElementById('teacherChatInput');

  closeTeacherBtn?.addEventListener('click', closeTeacherChatModal);
  sendTeacherBtn?.addEventListener('click', sendTeacherChatMessage);
  clearTeacherBtn?.addEventListener('click', clearTeacherChat);
  expandTeacherBtn?.addEventListener('click', expandTeacherChat);
  teacherChatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendTeacherChatMessage(); });

  // Close modals on backdrop click
  const widgetModal = document.getElementById('aiChatModal');
  widgetModal?.addEventListener('click', (e) => { if (e.target === widgetModal) closeAIChatModal(); });

  const teacherModal = document.getElementById('aiTeacherModal');
  teacherModal?.addEventListener('click', (e) => { if (e.target === teacherModal) closeTeacherChatModal(); });

  // Loader
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('loaderProgress');
  if (progressBar) {
    let width = 0;
    const interval = setInterval(() => {
      width += (100 / (6000 / 50));
      if (width >= 100) { width = 100; progressBar.style.width = '100%'; clearInterval(interval); }
      else progressBar.style.width = width + '%';
    }, 50);
  }

  setTimeout(async () => {
    await loadCourses();
    await checkAuth();
    updateAuthUI();
    updateNavbarStyle();

    if (loader) { loader.style.transition = 'opacity 0.5s ease-out'; loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; }, 500); }

    renderPage(currentUser ? 'dashboard' : 'landing');
    console.log('✅ obliXel Academy v10.0 fully initialized');
  }, 6000);
});

console.log('🎉 obliXel Academy v10.0 - COMPLETE - All Features Implemented');
