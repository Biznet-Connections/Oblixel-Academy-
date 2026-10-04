// ==================== obliXel Academy v13.0 - COMPLETE APP.JS PART 1 ====================
// v13.0: Two-column Certificate Settings, Position Sliders, Expiry Date, Verify URL,
//        Custom Text Fields, Live Canvas, Drag-to-Position, Signature Pad, Color Presets,
//        FULL Font Controls for ALL Elements (Name, Course, Date, Expiry, Cert ID, Verify)
console.log('🚀 obliXel Academy v13.0 - Loading Complete App Part 1');

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentPage = "landing";
let coursesData = [];
let currentCourseModules = null;
let currentModuleProgress = null;
let currentQuizQuestions = null;
let currentQuizOriginalOrder = null;
let currentExamSession = null;
let examTimerInterval = null;
let lastScrollY = 0;
let navbarVisible = true;
let userEnrollmentsCache = [];
let myAdminPrivileges = null;

// Certificate Editor Drag State
let certDragState = {
  isDragging: false,
  draggedElement: null,
  dragStartX: 0,
  dragStartY: 0,
  elementStartX: 0,
  elementStartY: 0,
  canvasScale: 1
};

// Signature Pad State
let signaturePadState = {
  isDrawing: false,
  ctx: null,
  canvas: null,
  lastX: 0,
  lastY: 0,
  penColor: '#1a1a1a',
  penWidth: 3
};

// Custom Text Fields State
let customTextFields = [];

// AI Chat History
let aiChatHistory = [
  { role: "assistant", content: "Hi! I'm ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓" }
];

// Track if AI widget conversation is active
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

function formatMoney(amount) {
  return parseFloat(amount || 0).toFixed(2);
}

// ==================== PASSWORD VALIDATION ====================
function isPasswordValid(password) {
  return password.length >= 5;
}

// ==================== PASSWORD INPUT FIX ====================
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
  setTimeout(() => { fixPasswordInputs(); }, 50);
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

// ==================== NAVBAR STYLE ====================
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

// ==================== NAVBAR AUTO-HIDE ====================
function initNavbarAutoHide() {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      if (navbarVisible) { navbar.classList.add('navbar-hidden'); navbarVisible = false; }
    } else {
      if (!navbarVisible) { navbar.classList.remove('navbar-hidden'); navbarVisible = true; }
    }
    lastScrollY = currentScrollY;
  });
  document.addEventListener('touchstart', (e) => {
    if (e.touches[0].clientY < 80 && !navbarVisible) {
      navbar.classList.remove('navbar-hidden');
      navbarVisible = true;
      setTimeout(() => {
        if (window.scrollY > 100 && navbarVisible) { navbar.classList.add('navbar-hidden'); navbarVisible = false; }
      }, 3000);
    }
  });
}

// ==================== AUTH API CALLS ====================
async function register(name, email, password) {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}

async function login(email, password, rememberMe) {
  const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, rememberMe }) });
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    if (rememberMe) { localStorage.setItem('remember_me', 'true'); }
  }
  return data;
}

async function getCurrentUser() {
  return apiRequest('/auth/me');
}

async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  currentUser = null;
  myAdminPrivileges = null;
  userEnrollmentsCache = [];
  customTextFields = [];
  aiChatHistory = [{ role: "assistant", content: "Hi! I'm ObliXel AI, your study assistant. Ask me anything about our 25+ certifications, courses, exam prep, or vouchers! 🎓" }];
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
  return apiRequest('/courses/enroll', { method: 'POST', body: JSON.stringify({ courseId, type, voucherCode }) });
}

async function getMyEnrollments() {
  return apiRequest('/courses/enrollments/me');
}

async function getModuleProgress(courseId) {
  return apiRequest(`/courses/${courseId}/progress`);
}

async function completeModule(courseId, moduleId, quizScore) {
  return apiRequest(`/courses/${courseId}/modules/${moduleId}/complete`, { method: 'POST', body: JSON.stringify({ quizScore }) });
}

// ==================== EXAM API CALLS ====================
async function startExam(courseId) {
  const examData = await apiRequest('/exams/start', { method: 'POST', body: JSON.stringify({ courseId }) });
  if (examData && examData.sessionId && Array.isArray(examData.questions)) {
    renderExamPage(courseId, examData);
  } else if (examData && examData.message) {
    showToast(examData.message, 'warning');
  } else {
    showToast('Could not start exam. Please try again.', 'error');
  }
  return examData;
}

async function submitExam(sessionId, courseId, answers, timeSpent) {
  return apiRequest('/exams/submit', { method: 'POST', body: JSON.stringify({ sessionId, courseId, answers, timeSpent }) });
}

async function checkLegalNameStatus() {
  return apiRequest('/exams/check-legal-name');
}

async function updateLegalName(firstName, lastName, idNumber, phone, country) {
  return apiRequest('/exams/update-legal-name', { method: 'POST', body: JSON.stringify({ firstName, lastName, idNumber, phone, country }) });
}

// ==================== CERTIFICATE API CALLS ====================
async function getMyCertificates() {
  return apiRequest('/certificates/my-certificates');
}

async function getCertificateTemplate() {
  return apiRequest('/admin/certificate-template');
}

async function updateCertificateTemplateImage(imageUrl) {
  return apiRequest('/admin/certificate-template/image', { method: 'PUT', body: JSON.stringify({ imageUrl }) });
}

async function updateCertificateTemplateSettings(positions, styles, signatureImage, expiryDateText, expiryPeriod, verifyUrlBase, customTexts) {
  const body = { positions, styles };
  if (signatureImage !== undefined) body.signatureImage = signatureImage;
  if (expiryDateText !== undefined) body.expiryDateText = expiryDateText;
  if (expiryPeriod !== undefined) body.expiryPeriod = expiryPeriod;
  if (verifyUrlBase !== undefined) body.verifyUrlBase = verifyUrlBase;
  if (customTexts !== undefined) body.customTexts = customTexts;
  return apiRequest('/admin/certificate-template/settings', { method: 'PUT', body: JSON.stringify(body) });
}

// ==================== PAYMENT API CALLS ====================
async function createCheckout(courseId, type, voucherCode, billingInfo) {
  return apiRequest('/payments/create-checkout', { method: 'POST', body: JSON.stringify({ courseId, type, voucherCode, billingInfo }) });
}

async function confirmPayment(sessionId, paymentMethod, billingInfo) {
  return apiRequest(`/payments/confirm-payment/${sessionId}`, { method: 'POST', body: JSON.stringify({ paymentMethod, billingInfo }) });
}

async function validateVoucher(code, courseId) {
  try {
    const response = await apiRequest('/payments/validate-voucher', { method: 'POST', body: JSON.stringify({ code, courseId }) });
    return response;
  } catch (error) {
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
      body: JSON.stringify({ message: message, history: aiChatHistory.slice(-20) })
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
    return { response: "Sorry, I'm having trouble connecting. Please try again later." };
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateAINotes(courseId, moduleName) {
  return apiRequest('/ai/generate-notes', { method: 'POST', body: JSON.stringify({ courseId, moduleName }) });
}

async function generateAIGuiz(courseId, moduleName, topic) {
  return apiRequest('/ai/generate-quiz', { method: 'POST', body: JSON.stringify({ courseId, moduleName, topic, numberOfQuestions: 10 }) });
}

// ==================== USER API CALLS ====================
async function getUserProfile() {
  return apiRequest('/user/profile');
}

async function updateUserProfile(data) {
  return apiRequest('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteAccount(confirm) {
  return apiRequest('/user/account', { method: 'DELETE', body: JSON.stringify({ confirmDelete: confirm }) });
}

// ==================== ADMIN API CALLS ====================
async function getAdminStats() { return apiRequest('/admin/stats'); }
async function getMyAdminPrivileges() { return apiRequest('/admin/my-privileges'); }
async function getAllUsers() { return apiRequest('/admin/users'); }
async function makeAdmin(userId, privileges) { return apiRequest('/admin/make-admin', { method: 'POST', body: JSON.stringify({ userId, privileges }) }); }
async function removeAdminUser(userId) { return apiRequest('/admin/remove-admin', { method: 'POST', body: JSON.stringify({ userId }) }); }
async function updateAdminPrivileges(userId, privileges) { return apiRequest('/admin/update-admin-privileges', { method: 'POST', body: JSON.stringify({ userId, privileges }) }); }
async function resetRevenue(confirm) { return apiRequest('/admin/reset-revenue', { method: 'POST', body: JSON.stringify({ confirm }) }); }
async function resetEnrollments(confirm) { return apiRequest('/admin/reset-enrollments', { method: 'POST', body: JSON.stringify({ confirm }) }); }
async function resetCertificates(confirm) { return apiRequest('/admin/reset-certificates', { method: 'POST', body: JSON.stringify({ confirm }) }); }
async function createCourse(courseData) { return apiRequest('/admin/courses', { method: 'POST', body: JSON.stringify(courseData) }); }
async function updateCourse(courseId, courseData) { return apiRequest(`/admin/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(courseData) }); }
async function deleteCourse(courseId) { return apiRequest(`/admin/courses/${courseId}`, { method: 'DELETE' }); }
async function createVoucher(voucherData) { return apiRequest('/admin/vouchers', { method: 'POST', body: JSON.stringify(voucherData) }); }
async function createBatchVouchers(batchData) { return apiRequest('/admin/vouchers/batch', { method: 'POST', body: JSON.stringify(batchData) }); }
async function getVouchers() { return apiRequest('/admin/vouchers'); }
async function deleteVoucher(voucherId) { return apiRequest(`/admin/vouchers/${voucherId}`, { method: 'DELETE' }); }
async function deleteUserByAdmin(userId) { return apiRequest(`/admin/users/${userId}`, { method: 'DELETE' }); }
async function getPendingCertificates() { return apiRequest('/admin/pending-certificates'); }
async function approveCertificate(pendingId) { return apiRequest('/admin/certificates/approve', { method: 'POST', body: JSON.stringify({ pendingId }) }); }
async function rejectCertificate(pendingId, reason) { return apiRequest('/admin/certificates/reject', { method: 'POST', body: JSON.stringify({ pendingId, reason }) }); }
async function getFinanceData() { return apiRequest('/admin/finance'); }

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
    
    // Load admin privileges if user is admin
    if (currentUser.role === 'admin') {
      try {
        const privData = await getMyAdminPrivileges();
        myAdminPrivileges = privData;
        currentUser.isMainAdmin = privData.isMainAdmin;
        currentUser.adminPrivileges = privData.privileges;
      } catch (e) {
        myAdminPrivileges = null;
      }
    }
    
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
    myAdminPrivileges = null;
    userEnrollmentsCache = [];
    return false;
  }
}

function isAlreadyEnrolled(courseId) {
  return userEnrollmentsCache.some(e => e.courseId === courseId);
}

function getEnrollmentForCourse(courseId) {
  return userEnrollmentsCache.find(e => e.courseId === courseId);
}

// Check if current admin has a specific privilege
function hasAdminPrivilege(privilege) {
  if (!currentUser || currentUser.role !== 'admin') return false;
  if (currentUser.isMainAdmin) return true;
  if (!currentUser.adminPrivileges) return false;
  return currentUser.adminPrivileges[privilege] === true;
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
  if (page !== 'landing' && typeof window.__stopHeroSlideshow__ === 'function') window.__stopHeroSlideshow__();
  // Handle ?page=dashboard&enrolled=xyz from payment redirect
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPage = urlParams.get('page');
    if (urlPage === 'dashboard') {
      page = 'dashboard';
      // Clear the query string
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch (e) {}

  if (currentUser && page === 'landing') { page = 'dashboard'; }
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

// ==================== AI WIDGET VISIBILITY ====================
function showAIWidget() { const aiBtn = document.getElementById('aiChatButton'); if (aiBtn) aiBtn.classList.remove('hidden'); }
function hideAIWidget() { const aiBtn = document.getElementById('aiChatButton'); if (aiBtn) aiBtn.classList.add('hidden'); }
// ==================== RETURN-TO (intended destination after signin) ====================
function __setReturnTo__(payload) {
  try { sessionStorage.setItem('returnTo', JSON.stringify(payload)); } catch (_) {}
}
function __consumeReturnTo__() {
  try {
    const raw = sessionStorage.getItem('returnTo');
    if (!raw) return null;
    sessionStorage.removeItem('returnTo');
    return JSON.parse(raw);
  } catch (_) { return null; }
}
function __clearReturnTo__() {
  try { sessionStorage.removeItem('returnTo'); } catch (_) {}
}

window.handleEnrollClick = function (courseId) {
    // Gate: require sign-in first — remember the intended course
    if (!currentUser) {
      __setReturnTo__({ action: 'enroll', courseId: courseId });
      if (typeof showToast === 'function') showToast('Please sign in to continue with enrollment', 'warning');
      renderPage('login');
      return;
    }
    // Find course data from cache
    const course = (typeof coursesData !== 'undefined' && coursesData.find(c => c.courseId === courseId || c.id === courseId)) || null;
    if (!course) {
      console.warn('[Enroll] Course not found:', courseId);
      return;
    }
    if (typeof window.openEnrollModal === 'function') {
      window.openEnrollModal({
        courseId: course.courseId || course.id,
        name: course.name,
        examPrice: course.examPrice || course.price || 0,
        pathPrice: course.pathPrice || course.examPrice || course.price || 0,
        icon: course.icon
      });
    } else {
      alert('Enroll modal not loaded');
    }
  };

// ==================== LANDING PAGE ====================
function __brandSvg__(name) {
  const n = (name || '').toLowerCase();
  if (n === 'google') return '<svg viewBox="0 0 24 24" width="36" height="36"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>';
  if (n === 'aws') return '<svg viewBox="0 0 48 24" width="48" height="24"><text x="0" y="16" font-family="Arial Black,Arial" font-weight="900" font-size="16" fill="#232F3E">aws</text><path d="M2 19c8 5 26 5 36 0" stroke="#FF9900" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M36 18l4 1-2 3z" fill="#FF9900"/></svg>';
  if (n === 'cisco') return '<svg viewBox="0 0 90 40" width="72" height="32" xmlns="http://www.w3.org/2000/svg"><text x="45" y="34" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="16" fill="#1BA0D7" letter-spacing="1">cisco</text><g fill="#1BA0D7"><rect x="14" y="18" width="2" height="8"/><rect x="20" y="14" width="2" height="12"/><rect x="26" y="10" width="2" height="16"/><rect x="32" y="14" width="2" height="12"/><rect x="38" y="10" width="2" height="16"/><rect x="44" y="6" width="2" height="20"/><rect x="50" y="10" width="2" height="16"/><rect x="56" y="14" width="2" height="12"/><rect x="62" y="10" width="2" height="16"/><rect x="68" y="14" width="2" height="12"/><rect x="74" y="18" width="2" height="8"/></g></svg>';
  if (n === 'oracle') return '<svg viewBox="0 0 120 32" width="96" height="28" xmlns="http://www.w3.org/2000/svg"><text x="0" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="22" fill="#C74634" letter-spacing="0.5">ORACLE</text></svg>';
  if (n === 'meta') return '<svg viewBox="0 0 40 24" width="40" height="24"><path fill="#0064E1" d="M8 6c-3 0-5 3-5 6s2 6 5 6c2 0 3-1 4-3l3-5c1-2 2-3 4-3 3 0 5 3 5 6s-2 6-5 6c-2 0-3-1-4-3l-3-5c-1-2-2-3-4-3zm-4 6c0-2 1-4 4-4 1 0 2 .5 3 2l3 5c1 1.5 2 2 3 2 2 0 4-1.5 4-4s-2-4-4-4c-1 0-2 .5-3 2l-3 5c-1 1.5-2 2-3 2-3 0-4-2-4-4z"/></svg>';
  if (n === 'microsoft') return '<svg viewBox="0 0 24 24" width="32" height="32"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/></svg>';
  if (n === 'ibm') return '<svg viewBox="0 0 40 20" width="40" height="20"><text x="0" y="15" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#052FAD" letter-spacing="1">IBM</text></svg>';
  if (n === 'harvard') return '<svg viewBox="0 0 24 24" width="32" height="32"><rect width="24" height="24" rx="3" fill="#A51C30"/><text x="12" y="17" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="14" fill="#fff">H</text></svg>';
  if (n === 'mit') return '<svg viewBox="0 0 40 20" width="40" height="20"><text x="0" y="15" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#A31F34" letter-spacing="0.5">MIT</text></svg>';
  if (n === 'stanford') return '<svg viewBox="0 0 24 24" width="32" height="32"><rect width="24" height="24" rx="3" fill="#8C1515"/><text x="12" y="17" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="14" fill="#fff">S</text></svg>';
  return '';
}

// ==================== MODULE HEADER BACKGROUNDS ====================
var __moduleHeaderBg = {
  aip:      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=75&fit=crop',
  ncp:      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1600&q=75&fit=crop',
  ccp:      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=75&fit=crop',
  clp:      'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1600&q=75&fit=crop',
  oca:      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=75&fit=crop',
  'ocp-core': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=75&fit=crop',
  wdp:      'https://images.unsplash.com/photo-1547658719-da2b51169166?w=1600&q=75&fit=crop',
  pmp:      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=75&fit=crop',
  csp:      'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1600&q=75&fit=crop'
};

function __getModuleHeaderBg(courseId) {
  if (!courseId) return '';
  return __moduleHeaderBg[String(courseId).toLowerCase()] || '';
}
window.__getModuleHeaderBg = __getModuleHeaderBg;

// Inject CSS for module header background
(function() {
  if (document.getElementById('module-head-bg-css')) return;
  var s = document.createElement('style');
  s.id = 'module-head-bg-css';
  s.textContent =
    '.module-header-bg { position: relative; overflow: hidden; }' +
    '.module-header-bg .module-bg-img {' +
      'position: absolute; inset: 0;' +
      'background-size: cover; background-position: center;' +
      'opacity: 0.18; z-index: 0; pointer-events: none;' +
    '}' +
    '.module-header-bg .module-bg-overlay {' +
      'position: absolute; inset: 0;' +
      'background: linear-gradient(135deg, rgba(26,11,61,0.55) 0%, rgba(10,46,61,0.45) 100%);' +
      'z-index: 1; pointer-events: none;' +
    '}' +
    '.module-header-bg > *:not(.module-bg-img):not(.module-bg-overlay) {' +
      'position: relative; z-index: 2;' +
    '}';
  document.head.appendChild(s);
})();

// ==================== HERO SLIDESHOW ====================

// Auto-tag course cards with background class
function __tagCourseCards() {
  try {
    var cards = document.querySelectorAll('[onclick*="renderCourseDashboard"]');
    cards.forEach(function(card) {
      var onclick = card.getAttribute('onclick') || '';
      var match = onclick.match(/renderCourseDashboard\(['"]([^'"]+)['"]\)/);
      if (match) {
        var id = match[1].toLowerCase();
        if (id === 'ncp' && !card.classList.contains('course-card-ncp')) card.classList.add('course-card-ncp');
        if (id === 'ccp' && !card.classList.contains('course-card-ccp')) card.classList.add('course-card-ccp');
        if ((id === 'clp' || id === 'oca' || id === 'ocp' || id === 'ocp-core') && !card.classList.contains('course-card-clp')) card.classList.add('course-card-clp');
      }
    });
  } catch (e) {}
}
window.__tagCourseCards = __tagCourseCards;

// Run after any render
var __origRenderPage = window.renderPage;
if (typeof __origRenderPage === 'function' && !__origRenderPage.__tagged) {
  var _wrap = function(page) {
    var r = __origRenderPage.apply(this, arguments);
    setTimeout(__tagCourseCards, 150);
    return r;
  };
  _wrap.__tagged = true;
  window.renderPage = _wrap;
}

// Also run periodically as a safety net
setInterval(__tagCourseCards, 1500);


// Kick off hero preload as soon as the script loads
try { setTimeout(function() { if (typeof window.__preloadHeroImages === 'function') window.__preloadHeroImages(); }, 0); } catch (_) {}

const __heroPhotos__ = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1920&q=80&fit=crop'
];

const __preloadHeroImages = function() {
  try {
    var loaded = 0;
    __heroPhotos__.forEach(function(url, i) {
      var img = new Image();
      img.onload = function() {
        loaded++;
        if (i === 0) {
          // First image loaded — immediately make it visible if not already
          var first = document.querySelector('.hero-slide');
          if (first && !first.classList.contains('active')) first.classList.add('active');
        }
      };
      img.onerror = function() { console.warn('[HERO] Failed to preload', url); };
      img.src = url;
    });
    console.log('[HERO] Preloading ' + __heroPhotos__.length + ' images');
  } catch (e) { console.warn('[HERO] Preload error', e); }
};

window.__preloadHeroImages = __preloadHeroImages;

let __heroInterval__ = null;

function __startHeroSlideshow__() {
  __stopHeroSlideshow__();
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length === 0) return;
  var current = 0;

  // Preload the very first image and make it active immediately if not already
  var firstImg = new Image();
  firstImg.onload = function() {
    if (!slides[0].classList.contains('active')) slides[0].classList.add('active');
  };
  firstImg.src = __heroPhotos__[0];

  __heroInterval__ = setInterval(function() {
    var next = (current + 1) % slides.length;
    var nextImg = new Image();
    // Only swap once the next photo is fully downloaded — prevents flash
    nextImg.onload = function() {
      slides[current].classList.remove('active');
      slides[next].classList.add('active');
      current = next;
    };
    nextImg.onerror = function() {
      // Skip broken image — don't switch, try the next one on the following tick
      console.warn('[HERO] Skipping broken image', __heroPhotos__[next]);
    };
    nextImg.src = __heroPhotos__[next];
  }, 5000);

  console.log('[HERO] Slideshow started with', slides.length, 'photos (smooth mode)');
}

// Preload all images once page is idle so transitions are instant
function __smoothHeroSwap() {
  if (window.__heroPreloaded) return;
  window.__heroPreloaded = true;
  __heroPhotos__.forEach(function(url) {
    var img = new Image();
    img.src = url;
  });
  console.log('[HERO] Background preload started for', __heroPhotos__.length, 'images');
}

function __stopHeroSlideshow__() {
  if (__heroInterval__) {
    clearInterval(__heroInterval__);
    __heroInterval__ = null;
    console.log('[HERO] Slideshow stopped');
  }
}

window.__stopHeroSlideshow__ = __stopHeroSlideshow__;


// Course card backgrounds
(function() {
  if (document.getElementById('course-card-bg-css')) return;
  var style = document.createElement('style');
  style.id = 'course-card-bg-css';
  style.textContent = 
    '.course-card-ncp { position: relative; overflow: hidden; }' +
    '.course-card-ncp::before {' +
      'content: ""; position: absolute; inset: 0;' +
      'background-image: url("https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=70&fit=crop");' +
      'background-size: cover; background-position: center;' +
      'opacity: 0.18; z-index: 0; pointer-events: none;' +
    '}' +
    '.course-card-ncp > * { position: relative; z-index: 1; }' +
    '.course-card-ccp { position: relative; overflow: hidden; }' +
    '.course-card-ccp::before {' +
      'content: ""; position: absolute; inset: 0;' +
      'background-image: url("https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70&fit=crop");' +
      'background-size: cover; background-position: center;' +
      'opacity: 0.15; z-index: 0; pointer-events: none;' +
    '}' +
    '.course-card-ccp > * { position: relative; z-index: 1; }' +
    '.course-card-clp { position: relative; overflow: hidden; }' +
    '.course-card-clp::before {' +
      'content: ""; position: absolute; inset: 0;' +
      'background-image: url("https://images.unsplash.com/photo-1544197150-2b5f6c4e8d8c?w=1200&q=70&fit=crop");' +
      'background-size: cover; background-position: center;' +
      'opacity: 0.15; z-index: 0; pointer-events: none;' +
    '}' +
    '.course-card-clp > * { position: relative; z-index: 1; }';
  document.head.appendChild(style);
})();

// Hero slideshow CSS
(function() {
  if (document.getElementById('hero-slideshow-css')) return;
  var style = document.createElement('style');
  style.id = 'hero-slideshow-css';
  style.textContent = '.hero-slideshow { position: relative; }' +
    '.hero-slide { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 1.2s ease-in-out; will-change: opacity; }' +
    '.hero-slide.active { opacity: 1; }' +
    '.hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(26,11,61,0.78) 0%, rgba(10,46,61,0.62) 50%, rgba(26,11,61,0.72) 100%); z-index: 1; }' +
    '@media (max-width: 640px) { .hero-overlay { background: linear-gradient(135deg, rgba(26,11,61,0.85) 0%, rgba(10,46,61,0.75) 100%); } }';
  document.head.appendChild(style);
})();

function renderLandingPage() {
  console.log('🏠 Rendering landing page with', coursesData.length, 'courses');
  const root = document.getElementById('app-root');
  const ncpCourse = coursesData.find(c => c.id === 'ncp');
  const ccpCourse = coursesData.find(c => c.id === 'ccp');
  const otherCourses = coursesData.filter(c => c.id !== 'ncp' && c.id !== 'ccp');
  const featuredCourses = [ncpCourse, ccpCourse, ...otherCourses].filter(Boolean).slice(0, 6);
  const globalPartners = [
    { name: "Google", icon: "fab fa-google", url: "https://cloud.google.com", color: "#4285F4" },
    { name: "AWS", icon: "fab fa-aws", url: "https://aws.amazon.com", color: "#FF9900" },
    { name: "Meta", icon: "fab fa-meta", url: "https://meta.com", color: "#0064E1" },
    { name: "Microsoft", icon: "fab fa-microsoft", url: "https://microsoft.com", color: "#00A4EF" },
    { name: "Cisco", icon: "fab fa-cisco", url: "https://cisco.com", color: "#1BA0D7" },
    { name: "Oracle", icon: "fas fa-database", url: "https://oracle.com", color: "#C74634" },
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
      <section class="hero-slideshow relative min-h-[80vh] flex items-center overflow-hidden">
        <div class="hero-slide active" style="background-image:url('${__heroPhotos__[0]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[1]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[2]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[3]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[4]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[5]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[6]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[7]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[8]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[9]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[10]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[11]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[12]}')"></div>
        <div class="hero-slide" style="background-image:url('${__heroPhotos__[13]}')"></div>
        <div class="hero-overlay"></div>
        <div class="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6">
          <div class="max-w-2xl" data-aos="fade-right">
            <p class="uppercase tracking-[6px] text-cyan-400 text-sm mb-5">Future Of Professional Certification</p>
            <h1 class="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight" style="text-shadow: 0 2px 20px rgba(0,0,0,0.5);">Build Your <span class="gradient-text">Global Skills</span></h1>
            <p class="mt-4 sm:mt-6 text-gray-200 text-sm sm:text-base lg:text-lg" style="text-shadow: 0 1px 8px rgba(0,0,0,0.4);">Enterprise-level certification platform. Join 42,000+ successful professionals with 25+ certifications</p>
            <div class="flex gap-3 sm:gap-5 mt-6 sm:mt-10"><button id="landingStartBtn" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 sm:px-8 py-2 sm:py-4 rounded-2xl font-bold text-sm sm:text-base glow">Start Learning</button><button id="landingExploreBtn" class="glass px-5 sm:px-8 py-2 sm:py-4 rounded-2xl font-bold text-sm sm:text-base">Explore</button></div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mt-8 sm:mt-12 max-w-2xl"><div><h2 class="text-3xl sm:text-4xl font-black gradient-text">42,000+</h2><p class="text-gray-300 text-xs sm:text-sm">Students</p></div><div><h2 class="text-3xl sm:text-4xl font-black gradient-text">200+</h2><p class="text-gray-300 text-xs sm:text-sm">Certifications</p></div><div><h2 class="text-3xl sm:text-4xl font-black gradient-text">98%</h2><p class="text-gray-300 text-xs sm:text-sm">Success</p></div><div><h2 class="text-3xl sm:text-4xl font-black gradient-text">40+</h2><p class="text-gray-300 text-xs sm:text-sm">Countries</p></div></div>
          </div>
        </div>
      </section>
      <section class="py-6 sm:py-10"><div class="glass rounded-3xl py-3 sm:py-6 marquee"><div class="marquee-content">${marqueePartners.map(p => `<span class="text-sm sm:text-xl font-bold mx-3 sm:mx-6" style="color: ${p.color};display:inline-flex;align-items:center;gap:6px">${__brandSvg__(p.name)}${p.name}</span>`).join('')}${marqueePartners.map(p => `<span class="text-sm sm:text-xl font-bold mx-3 sm:mx-6" style="color: ${p.color};display:inline-flex;align-items:center;gap:6px">${__brandSvg__(p.name)}${p.name}</span>`).join('')}</div></div></section>
      <section class="py-10 sm:py-16" id="certifications"><div class="text-center mb-6 sm:mb-12" data-aos="fade-up"><h2 class="text-3xl sm:text-5xl font-black">Featured <span class="gradient-text">Certifications</span></h2><p class="text-gray-400 text-sm sm:text-base mt-2">Industry-recognized credentials — NCP & CCP now available!</p></div><div class="courses-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">${featuredCourses.length > 0 ? featuredCourses.map(cert => { const enrolled = currentUser && isAlreadyEnrolled(cert.id); const coursePrice = cert.price || cert.examPrice || 0; return `<div class="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 card-hover" data-aos="fade-up"><div class="flex justify-between items-start"><i class="fa-solid ${cert.icon || 'fa-certificate'} text-3xl sm:text-4xl text-purple-400"></i><span class="text-xs glass px-2 sm:px-3 py-1 rounded-full">${cert.category || 'Certification'}</span></div><h3 class="text-lg sm:text-2xl font-bold mt-3 sm:mt-4">${escapeHtml(cert.name)}</h3><p class="text-gray-400 text-xs sm:text-sm mt-2">${escapeHtml(cert.description?.substring(0, 80) || 'Professional certification')}</p><div class="flex items-center gap-2 mt-2 text-gray-400 text-xs"><i class="fa-solid fa-users"></i><span>${(cert.enrolledCount || 0).toLocaleString()}+ students</span></div><p class="text-xs mt-2 text-cyan-400 font-medium">💰 Course Fee: $${coursePrice}</p><div class="mt-4"><button onclick="window.handleEnrollClick('${cert.id}')" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:bg-purple-500 py-2 rounded-xl text-sm font-medium transition">${enrolled ? '📖 Continue Learning' : '🎯 Enroll Now'}</button></div></div>`; }).join('') : '<div class="col-span-3 text-center py-10"><p class="text-yellow-400">Loading courses...</p></div>'}</div><div class="text-center mt-8 sm:mt-12"><button id="seeAllCoursesBtn" class="glass px-5 sm:px-8 py-2 sm:py-3 rounded-2xl font-semibold text-sm sm:text-base">🔍 See All ${coursesData.length} Certifications →</button></div></section>
      <section class="py-10 sm:py-16"><div class="text-center mb-6 sm:mb-12" data-aos="fade-up"><h2 class="text-3xl sm:text-4xl font-black">🌍 Global Partners</h2></div><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-5">${globalPartners.map(p => `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="glass rounded-2xl p-3 sm:p-5 text-center transition hover:scale-105"><span style="display:inline-flex;align-items:center;justify-content:center;height:40px">${__brandSvg__(p.name)}</span><h3 class="font-bold text-xs sm:text-sm mt-2">${p.name}</h3></a>`).join('')}</div></section>
      <footer class="border-t border-white/10 py-6 sm:py-12 mt-6 sm:mt-10"><div class="flex flex-wrap justify-center gap-3 sm:gap-6 mb-3 sm:mb-6 text-xl sm:text-2xl"><a href="https://www.facebook.com/obliXel" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook"></i></a><a href="#"><i class="fab fa-instagram"></i></a><a href="#"><i class="fab fa-linkedin"></i></a><a href="#"><i class="fab fa-youtube"></i></a><a href="#"><i class="fab fa-twitter"></i></a><a href="https://wa.me/263714587259" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i></a></div><p class="text-center text-gray-500 text-xs sm:text-sm">© 2026 obliXel Academy — The future of professional certification</p></footer>
    </div>
  `;
  document.getElementById('landingStartBtn')?.addEventListener('click', () => currentUser ? renderPage('dashboard') : renderPage('login'));
  document.getElementById('landingExploreBtn')?.addEventListener('click', () => document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('seeAllCoursesBtn')?.addEventListener('click', () => renderPage('courses'));
  document.getElementById('guestSignupBtn')?.addEventListener('click', (e) => { e.preventDefault(); renderPage('register'); });
  showAIWidget();
  if (typeof __smoothHeroSwap === 'function') __smoothHeroSwap();
  if (typeof __preloadHeroImages === 'function') __preloadHeroImages();
  if (typeof __startHeroSlideshow__ === 'function') __startHeroSlideshow__();
}

// ==================== REGISTER PAGE ====================
function renderRegister() {
  hideAIWidget();
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
  passwordInput.addEventListener('keydown', function(e) { this.style.direction = 'ltr'; this.style.unicodeBidi = 'normal'; });
  passwordInput.addEventListener('input', function(e) { this.style.direction = 'ltr'; this.style.unicodeBidi = 'normal'; const pos = this.selectionStart; setTimeout(() => { this.setSelectionRange(pos, pos); }, 0); });
  document.getElementById('doRegister').addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = passwordInput.value;
    if (!name || !email || !password) { showToast('Please fill all fields', 'error'); return; }
    if (password.length < 5) { showToast('Password must be at least 5 characters', 'error'); return; }
    try {
      await register(name, email, password);
      showToast('Account created! Please sign in to continue', 'success');
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
  hideAIWidget();
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
  loginPass.addEventListener('keydown', function(e) { this.style.direction = 'ltr'; this.style.unicodeBidi = 'normal'; });
  loginPass.addEventListener('input', function(e) { this.style.direction = 'ltr'; this.style.unicodeBidi = 'normal'; const pos = this.selectionStart; setTimeout(() => { this.setSelectionRange(pos, pos); }, 0); });
  document.getElementById('doLogin').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = loginPass.value;
    const rememberMe = document.getElementById('rememberMe').checked;
    if (!email || !password) { showToast('Please enter email and password', 'error'); return; }
    try {
      const data = await login(email, password, rememberMe);
      currentUser = data.user;
      
      if (currentUser.role === 'admin') {
        try {
          const privData = await getMyAdminPrivileges();
          myAdminPrivileges = privData;
          currentUser.isMainAdmin = privData.isMainAdmin;
          currentUser.adminPrivileges = privData.privileges;
        } catch (e) {
          myAdminPrivileges = null;
        }
      }
      
      try {
        const enrollmentData = await getMyEnrollments();
        userEnrollmentsCache = enrollmentData.enrollments || [];
      } catch (e) { userEnrollmentsCache = []; }
      showToast(`Welcome ${currentUser.name}!`, 'success');
      updateAuthUI();
      updateNavbarStyle();
      await loadCourses();
      // Honor returnTo (deeplink back to enroll)
      const __ret = __consumeReturnTo__();
      if (__ret && __ret.action === 'enroll' && __ret.courseId) {
        console.log('[RETURN-TO] resuming enroll for', __ret.courseId);
        renderPage('landing');
        setTimeout(() => {
          if (typeof window.handleEnrollClick === 'function') window.handleEnrollClick(__ret.courseId);
        }, 250);
        return;
      }
      renderPage('dashboard');
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
    }
  });
  document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); renderPage('register'); });
  document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.openForgotPassword === 'function') {
      window.openForgotPassword();
    } else {
      showToast('Reset modal not loaded — refresh the page', 'error');
    }
  });
  let vis2 = false;
  document.getElementById('togglePassword').addEventListener('click', () => {
    const input = document.getElementById('loginPass');
    vis2 = !vis2;
    input.type = vis2 ? 'text' : 'password';
    input.style.direction = 'ltr';
    input.style.unicodeBidi = 'normal';
  });
  applyAllPasswordFixes();
}

// ==================== DASHBOARD PAGE ====================
async function renderDashboard() {
  if (!currentUser) { renderPage('login'); return; }
  showAIWidget();
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading dashboard...</p></div>';
  try {
    const profileData = await getUserProfile();
    const user = profileData.user;
    const stats = profileData.stats;
    const enrollmentsData = profileData.enrollments || [];
    userEnrollmentsCache = enrollmentsData;
    
    // Sync currentUser with latest profile data for legal name
    if (user.hasProvidedLegalName !== undefined) {
      currentUser.hasProvidedLegalName = user.hasProvidedLegalName;
      currentUser.firstName = user.firstName || '';
      currentUser.lastName = user.lastName || '';
      currentUser.fullName = user.fullName || '';
    }
    
    const certificatesData = await getMyCertificates();
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
          ${!currentUser.hasProvidedLegalName ? `<div id="legalNameBanner" class="mt-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30"><p class="text-sm text-yellow-400"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Update your legal name for certificates. <button onclick="window.showLegalNameModal()" class="text-cyan-400 hover:underline font-bold">Update Now →</button></p></div>` : ''}
        </div>
        <div class="stats-grid mb-8">
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-book-open text-cyan-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-cyan-400">${stats.enrolledCourses || 0}</h3><p class="text-xs text-gray-400">Enrolled</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-certificate text-green-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-green-400">${earned.length}</h3><p class="text-xs text-gray-400">Certificates</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-dollar-sign text-purple-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-purple-400">$${formatMoney(user.totalSpent || 0)}</h3><p class="text-xs text-gray-400">Spent</p></div>
          <div class="glass rounded-2xl p-4 text-center card-hover"><i class="fa-solid fa-trophy text-yellow-400 text-2xl mb-2"></i><h3 class="text-2xl font-black text-yellow-400">${user.level || 1}</h3><p class="text-xs text-gray-400">Level</p></div>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold mb-4"><i class="fa-regular fa-clock mr-2 text-cyan-400"></i> Continue Learning</h2>
        <div class="space-y-4 mb-10">
          ${enrollmentsData.length > 0 ? enrollmentsData.map(e => `
            <div class="glass rounded-2xl p-5 card-hover continue-learning-card" data-aos="fade-up">
              <div class="flex justify-between items-start flex-wrap gap-3 mb-3">
                <div>
                  <div class="flex items-center gap-2"><i class="fa-solid ${e.courseIcon || 'fa-certificate'} text-purple-400 text-xl"></i><h3 class="text-lg sm:text-xl font-bold">${escapeHtml(e.courseName)}</h3></div>
                  <p class="text-gray-400 text-xs sm:text-sm mt-1">${e.moduleProgress?.completedCount || 0}/${e.moduleProgress?.totalModules || 8} modules completed</p>
                </div>
                <span class="text-xs px-3 py-1 rounded-full ${e.status === 'enrolled' ? 'bg-green-500/20 text-green-400' : e.status === 'certified' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${e.status === 'enrolled' ? 'Active' : e.status === 'certified' ? 'Certified' : 'Failed'}</span>
              </div>
              <div class="w-full bg-gray-700 h-2 rounded-full mb-3"><div class="bg-gradient-to-r from-purple-600 to-cyan-500 h-2 rounded-full transition-all" style="width: ${e.progress || 0}%"></div></div>
              <p class="text-xs text-gray-400 mb-3">Next: ${e.moduleProgress?.nextModuleName || (e.status === 'certified' ? '✅ Certification Complete!' : 'Final Exam Ready!')}</p>
              <div class="flex gap-3 flex-wrap">
                <button onclick="window.renderCourseDashboard('${e.courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2 rounded-xl text-sm font-medium">Continue →</button>
                ${e.status !== 'certified' ? `<button onclick="window.startExamCheck('${e.courseId}')" class="glass px-5 py-2 rounded-xl text-sm">🎯 Take Final Exam</button>` : ''}
              </div>
            </div>
          `).join('') : '<div class="glass rounded-2xl p-10 text-center"><p>No enrollments yet. <button onclick="renderPage(\'courses\')" class="text-cyan-400 hover:underline">Browse Courses →</button></p></div>'}
        </div>
        <h2 class="text-xl sm:text-2xl font-bold mb-4"><i class="fa-regular fa-star mr-2 text-yellow-400"></i> Recommended For You</h2>
        <div class="courses-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          ${coursesData.filter(c => !enrollmentsData.some(e => e.courseId === c.id)).slice(0, 3).map(c => { const cp = c.price || c.examPrice || 0; return `<div class="glass rounded-2xl p-4 card-hover"><i class="fa-solid ${c.icon || 'fa-certificate'} text-3xl text-purple-400 mb-2"></i><h3 class="font-bold">${escapeHtml(c.name)}</h3><p class="text-gray-400 text-xs mt-1">${escapeHtml(c.description?.substring(0, 60))}...</p><p class="text-xs text-cyan-400 mt-1">💰 Course Fee: $${cp}</p><button onclick="window.handleEnrollClick('${c.id}')" class="w-full mt-3 bg-purple-600/50 hover:bg-purple-600 py-2 rounded-xl text-sm transition">Enroll Now</button></div>`; }).join('')}
        </div>
        <div class="glass rounded-2xl p-5">
          <h2 class="text-lg font-bold mb-3"><i class="fa-solid fa-users mr-2 text-cyan-400"></i> Study Together</h2>
          <div class="flex items-center gap-2 mb-4"><span class="online-dot"></span><span class="text-sm text-gray-400">42 students online now • 3 active study groups</span></div>
          <div class="flex gap-3 flex-wrap"><button class="glass px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition">Join Study Group</button><button class="glass px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition">Find Study Partner</button></div>
        </div>
      </div>
    `;
    showAIWidget();
  } catch (error) {
    console.error('Dashboard error:', error);
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load dashboard: ${error.message}</p><button onclick="renderPage('landing')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Go Home</button></div>`;
  }
}

// ==================== LEGAL NAME MODAL ====================
window.showLegalNameModal = function() {
  const existingFirstName = currentUser.firstName || '';
  const existingLastName = currentUser.lastName || '';
  const existingIdNumber = currentUser.idNumber || '';
  const existingPhone = currentUser.phone || '';
  const existingCountry = currentUser.country || 'Zimbabwe';
  
  const modal = document.createElement('div');
  modal.id = 'legalNameModal';
  modal.className = 'fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4';
  modal.style.backdropFilter = 'blur(4px)';
  modal.innerHTML = `
    <div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-4 flex justify-between items-center rounded-t-3xl">
        <h2 class="text-xl font-bold"><i class="fa-solid fa-id-card mr-2"></i> Legal Name for Certificates</h2>
        <button onclick="closeModal('legalNameModal')" class="text-white/80 hover:text-white text-2xl">&times;</button>
      </div>
      <div class="p-6">
        <p class="text-sm text-gray-400 mb-4">This name will appear on all your certificates. Please enter your legal full name exactly as you want it displayed.</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">First Name *</label>
            <input type="text" id="legalFirstName" value="${escapeHtml(existingFirstName)}" placeholder="e.g., John" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-green-400 transition" autocomplete="off">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Last Name *</label>
            <input type="text" id="legalLastName" value="${escapeHtml(existingLastName)}" placeholder="e.g., Doe" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-green-400 transition" autocomplete="off">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ID Number (optional)</label>
            <input type="text" id="legalIdNumber" value="${escapeHtml(existingIdNumber)}" placeholder="e.g., 00-1234567X00" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-green-400 transition" autocomplete="off">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Phone Number (optional)</label>
            <input type="text" id="legalPhone" value="${escapeHtml(existingPhone)}" placeholder="e.g., +263771234567" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-green-400 transition" autocomplete="off">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Country (optional)</label>
            <select id="legalCountry" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-green-400 transition">
              <option value="Zimbabwe" ${existingCountry === 'Zimbabwe' ? 'selected' : ''}>Zimbabwe</option>
              <option value="South Africa" ${existingCountry === 'South Africa' ? 'selected' : ''}>South Africa</option>
              <option value="Botswana" ${existingCountry === 'Botswana' ? 'selected' : ''}>Botswana</option>
              <option value="Zambia" ${existingCountry === 'Zambia' ? 'selected' : ''}>Zambia</option>
              <option value="Malawi" ${existingCountry === 'Malawi' ? 'selected' : ''}>Malawi</option>
              <option value="Mozambique" ${existingCountry === 'Mozambique' ? 'selected' : ''}>Mozambique</option>
              <option value="Namibia" ${existingCountry === 'Namibia' ? 'selected' : ''}>Namibia</option>
              <option value="Kenya" ${existingCountry === 'Kenya' ? 'selected' : ''}>Kenya</option>
              <option value="Nigeria" ${existingCountry === 'Nigeria' ? 'selected' : ''}>Nigeria</option>
              <option value="Ghana" ${existingCountry === 'Ghana' ? 'selected' : ''}>Ghana</option>
              <option value="United Kingdom" ${existingCountry === 'United Kingdom' ? 'selected' : ''}>United Kingdom</option>
              <option value="United States" ${existingCountry === 'United States' ? 'selected' : ''}>United States</option>
              <option value="Other" ${existingCountry === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="pt-4 flex gap-3">
            <button onclick="window.saveLegalName()" class="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold transition">💾 Save Legal Name</button>
            <button onclick="closeModal('legalNameModal')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveLegalName = async function() {
  const firstName = document.getElementById('legalFirstName')?.value?.trim();
  const lastName = document.getElementById('legalLastName')?.value?.trim();
  const idNumber = document.getElementById('legalIdNumber')?.value?.trim() || '';
  const phone = document.getElementById('legalPhone')?.value?.trim() || '';
  const country = document.getElementById('legalCountry')?.value || '';
  
  if (!firstName || !lastName) {
    showToast('First name and last name are required', 'error');
    return;
  }
  
  try {
    const result = await updateLegalName(firstName, lastName, idNumber, phone, country);
    if (result.success) {
      currentUser.firstName = firstName;
      currentUser.lastName = lastName;
      currentUser.fullName = `${firstName} ${lastName}`;
      currentUser.hasProvidedLegalName = true;
      currentUser.idNumber = idNumber;
      currentUser.phone = phone;
      currentUser.country = country;
      closeModal('legalNameModal');
      showToast('Legal name saved! This will appear on your certificates.', 'success');
      // Re-render dashboard to hide the banner
      renderDashboard();
    }
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

// ==================== EXAM START WITH LEGAL NAME CHECK ====================
window.startExamCheck = async function(courseId) {
  if (!currentUser) { renderPage('login'); return; }
  
  try {
    const nameStatus = await checkLegalNameStatus();
    if (!nameStatus.hasProvidedLegalName || !nameStatus.firstName || !nameStatus.lastName) {
      showToast('Please provide your legal full name before taking the exam', 'warning');
      window.showLegalNameModal();
      return;
    }
    window.startExam(courseId);
  } catch (error) {
    window.startExam(courseId);
  }
};

// ==================== COURSES PAGE ====================
async function renderCourses() {
  hideAIWidget();
  const root = document.getElementById('app-root');
  if (coursesData.length === 0) { await loadCourses(); }
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
      const cp = cert.price || cert.examPrice || 0;
      return `
        <div class="glass rounded-2xl p-5 card-hover course-card" data-course-name="${escapeHtml(cert.name).toLowerCase()}">
          <i class="fa-solid ${cert.icon || 'fa-certificate'} text-4xl text-purple-400"></i>
          <h3 class="text-xl font-bold mt-3">${escapeHtml(cert.name)}</h3>
          <p class="text-gray-400 text-sm mt-1">${escapeHtml(cert.description?.substring(0, 80) || 'Professional certification')}</p>
          <div class="flex items-center gap-2 mt-2 text-gray-400 text-xs"><i class="fa-solid fa-users"></i><span>${(cert.enrolledCount || 0).toLocaleString()}+ students</span></div>
          <p class="text-xs mt-2 text-cyan-400 font-medium">💰 Course Fee: $${cp}</p>
          <button onclick="window.handleEnrollClick('${cert.id}')" class="w-full mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 py-2 rounded-xl text-sm">${enrolled ? '📖 Continue Learning' : '🎯 Enroll Now'}</button>
        </div>
      `;
    }).join('');
    if (searchResultsCount) searchResultsCount.innerText = `${filteredCourses.length} of ${coursesData.length}`;
  }
  
  root.innerHTML = `
    <div class="max-w-7xl mx-auto fade-in">
      <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 class="text-2xl sm:text-4xl font-black">📚 All Certifications</h1>
        <div class="search-container"><i class="fa-solid fa-search search-icon"></i><input type="text" id="courseSearchInput" placeholder="Search certifications..." class="search-input" autocomplete="off"><button id="clearSearchBtn" class="search-clear hidden"><i class="fa-solid fa-times-circle"></i></button></div>
      </div>
      <p class="text-gray-400 text-sm mb-4" id="searchResultsCount">${coursesData.length} of ${coursesData.length} courses</p>
      <div id="coursesContainer" class="courses-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"></div>
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
  clearBtn.addEventListener('click', () => { searchInput.value = ''; filterCourses(); searchInput.focus(); });
}

// ==================== EXAMS PAGE ====================
async function renderExams() {
  hideAIWidget();
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
            <div>
              <h2 class="text-xl font-bold">${escapeHtml(e.courseName)}</h2>
              <p class="text-gray-400">Attempts: ${e.examAttempts || 0}</p>
              ${e.score ? `<p class="text-xs ${e.score >= 70 ? 'text-green-400' : 'text-red-400'}">Last score: ${e.score}%</p>` : ''}
            </div>
            ${e.status !== 'certified' ? `<button onclick="window.startExamCheck('${e.courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2 rounded-xl text-sm">Start Final Exam →</button>` : '<span class="text-green-400 font-bold">✅ Certified!</span>'}
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
  hideAIWidget();
  if (!currentUser) { renderPage('login'); return; }
  try {
    const certData = await getMyCertificates();
    const earned = certData.earned || [];
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="max-w-4xl mx-auto fade-in">
        <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard</button>
        <h1 class="text-2xl font-black mb-6">🏅 My Certificates</h1>
        ${earned.length > 0 ? earned.map(cer => `
          <div class="glass rounded-2xl p-5 mb-4">
            <div class="flex justify-between flex-wrap gap-3">
              <div>
                <h2 class="text-2xl font-bold">${escapeHtml(cer.courseName)}</h2>
                <p class="text-gray-400 text-sm">Issued to: ${escapeHtml(cer.studentName || 'Student')}</p>
                <p class="text-gray-400 text-sm">ID: ${cer.certificateId}</p>
                <p class="text-sm">Issued: ${formatDate(cer.issuedAt || cer.issueDate)} | Score: ${cer.score}%</p>
              </div>
              <i class="fa-solid fa-certificate text-4xl text-cyan-400"></i>
            </div>
            <div class="mt-3 flex gap-3 flex-wrap">
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.downloadCertificate('${cer.certificateId}')"><i class="fa-solid fa-download"></i> Download Certificate</button>
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.shareToLinkedIn('${cer.certificateId}')"><i class="fa-brands fa-linkedin"></i> Share</button>
              <button class="glass px-4 py-2 rounded-xl text-sm" onclick="window.verifyCertificate('${cer.certificateId}')"><i class="fa-solid fa-check-circle"></i> Verify</button>
            </div>
          </div>
        `).join('') : '<div class="glass rounded-3xl p-12 text-center"><p>No certificates yet. Complete an exam to earn your first certificate!</p><button onclick="renderPage(\'dashboard\')" class="mt-4 bg-purple-600 px-6 py-2 rounded-xl">Start Learning</button></div>'}
      </div>
    `;
  } catch (error) {
    document.getElementById('app-root').innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load certificates</p></div>`;
  }
}

// ==================== PROFILE PAGE ====================
async function renderProfile() {
  hideAIWidget();
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
            <div>
              <h1 class="text-2xl font-black">${escapeHtml(user.fullName || user.name)}</h1>
              <p class="text-gray-400 text-sm">${user.email} • ${user.role === 'admin' ? (user.isMainAdmin ? '👑 Main Admin' : 'Admin') : 'Student'}</p>
              <p class="text-xs text-cyan-400">Member since ${formatDate(user.createdAt)}</p>
              ${user.hasProvidedLegalName ? `<p class="text-xs text-green-400 mt-1"><i class="fa-solid fa-circle-check mr-1"></i> Legal name: ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</p>` : `<p class="text-xs text-yellow-400 mt-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Legal name not set. <button onclick="window.showLegalNameModal()" class="text-cyan-400 hover:underline">Set Now →</button></p>`}
            </div>
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
        try {
          await deleteAccount('DELETE');
          logout();
          showToast('Account deleted', 'success');
          renderPage('landing');
        } catch (error) {
          showToast('Failed to delete account', 'error');
        }
      }
    });
  } catch (error) {
    document.getElementById('app-root').innerHTML = `<div class="glass rounded-3xl p-12 text-center"><p class="text-red-400">Failed to load profile</p></div>`;
  }
}

console.log('✅ Part 1 (Core & Auth + All Pages + v13.0 Prepped) loaded');

// ==================== obliXel Academy v13.0 - COMPLETE APP.JS PART 2 ====================
// v13.0: Two-column Certificate Settings, Position Sliders, AUTO-CALCULATE Expiry Date (Clean),
//        Verify URL with Render default, Custom Text Fields, Live Canvas, Drag-to-Position,
//        Signature Pad, Color Presets, FULL Font Controls for ALL Elements
//        BUG FIX: expiryPeriod and verifyUrlBase now save correctly
console.log('🚀 Loading Part 2 (Course Dashboard, Exams, Checkout, Admin Panel v13.0)');

// ==================== COURSE DASHBOARD ====================
// ==================== NEW COURSE DASHBOARD (v2) ====================
async function renderCourseDashboard(courseId) {
  hideAIWidget();
  if (!currentUser) { renderPage('login'); return; }
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading course...</p></div>';

  try {
    // Fetch fresh course + progress
    const [courseRes, progressRes] = await Promise.all([
      fetch('/api/courses/' + courseId).then(r => r.json()),
      apiRequest('/courses/' + courseId + '/progress')
    ]);

    const course = courseRes.course;
    const modules = courseRes.modules || [];
    const progress = progressRes.progress;

    currentCourseModules = modules;
    currentModuleProgress = progress;

    const completedCount = progress.completedCount || 0;
    const totalModules = modules.length || progress.totalModules || 0;
    const percent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    const timeHours = Math.floor((progress.totalTimeSpent || 0) / 3600);
    const timeMins = Math.floor(((progress.totalTimeSpent || 0) % 3600) / 60);
    const totalXP = progress.totalXPEarned || 0;
    const totalMinutes = course.totalMinutes || modules.reduce((s, m) => s + (m.estimatedMinutes || 30), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;

    // Ring circumference for progress
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - percent / 100);

    // Build module cards
    const moduleCardsHtml = modules.map(m => {
      const status = progress.modules.find(p => p.moduleId === m.moduleId) || {};
      const isCompleted = status.completed;
      const isUnlocked = status.unlocked;
      const isBookmarked = status.bookmarked;
      const score = status.quizScore;

      const complexityColor =
        m.complexity === 'Beginner' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' :
        m.complexity === 'Intermediate' ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' :
        m.complexity === 'Advanced' ? 'text-red-400 bg-red-400/10 border-red-400/30' :
        'text-purple-400 bg-purple-400/10 border-purple-400/30';

      const iconState = isCompleted ? 'fa-circle-check text-emerald-400' :
                        isUnlocked ? 'fa-circle-play text-cyan-400' :
                        'fa-lock text-gray-500';

      const borderStyle = isCompleted ? 'border-l-4 border-emerald-500/60' :
                          isUnlocked ? 'border-l-4 border-cyan-500/60' :
                          'border-l-4 border-gray-700 opacity-60';

      const clickable = isUnlocked ? `onclick="window.renderModulePage('${courseId}', ${m.moduleId})"` : '';
      const cursor = isUnlocked ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed';

      return `
        <div class="glass rounded-2xl p-4 ${borderStyle} ${cursor} transition-all duration-200 relative overflow-hidden group" data-module="${m.moduleId}" data-status="${isCompleted ? 'done' : isUnlocked ? 'todo' : 'locked'}" data-bookmarked="${isBookmarked}" ${clickable}>
          ${isBookmarked ? '<i class="fa-solid fa-bookmark absolute top-3 right-3 text-amber-400 text-xs"></i>' : ''}
          <div class="flex items-start gap-3">
            <i class="fa-solid ${iconState} text-xl mt-0.5"></i>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-xs text-gray-400 font-mono">M${m.moduleId}</span>
                <span class="text-xs px-2 py-0.5 rounded-full border ${complexityColor}">${m.complexity || 'Beginner'}</span>
              </div>
              <h4 class="font-bold text-sm leading-tight mb-1">${escapeHtml(m.name)}</h4>
              <div class="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                <span><i class="fa-regular fa-clock mr-1"></i>${m.estimatedMinutes || 30} min</span>
                <span><i class="fa-solid fa-bolt text-cyan-400 mr-1"></i>${m.xpReward || 50} XP</span>
                ${isCompleted && score !== null ? `<span class="text-emerald-400"><i class="fa-solid fa-trophy mr-1"></i>${score}%</span>` : ''}
              </div>
              ${!isUnlocked ? '<p class="text-xs text-gray-500 mt-2 italic">Complete previous module to unlock</p>' : ''}
              ${isCompleted ? '<p class="text-xs text-emerald-400 mt-2"><i class="fa-solid fa-check mr-1"></i>Completed</p>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    root.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-6">

        <!-- BACK + HEADER -->
        <button onclick="window.renderPage('dashboard')" class="text-gray-400 hover:text-white mb-4 text-sm">
          <i class="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard
        </button>

        <div class="glass rounded-3xl p-6 mb-6 overflow-hidden relative">
          <div class="absolute inset-0 opacity-10" style="background-image: url('${course.bannerImage || ''}'); background-size: cover; background-position: center;"></div>
          <div class="relative flex flex-col md:flex-row items-center gap-6">
            <!-- Progress ring -->
            <div class="relative flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120" class="transform -rotate-90">
                <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
                <circle cx="60" cy="60" r="${radius}" fill="none" stroke="url(#ringGradient)" stroke-width="8" stroke-linecap="round"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" style="transition: stroke-dashoffset 1s ease;"/>
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a855f7"/>
                    <stop offset="100%" stop-color="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-black gradient-text">${percent}%</span>
                <span class="text-xs text-gray-400">${completedCount}/${totalModules}</span>
              </div>
            </div>

            <!-- Course info -->
            <div class="flex-1 text-center md:text-left">
              <div class="flex items-center gap-2 justify-center md:justify-start mb-2">
                <i class="fa-solid ${course.icon || 'fa-certificate'} text-2xl text-purple-400"></i>
                <span class="text-xs px-3 py-1 glass rounded-full">${course.level || 'Professional'}</span>
              </div>
              <h1 class="text-2xl md:text-3xl font-black mb-2">${escapeHtml(course.name)}</h1>
              <p class="text-gray-400 text-sm mb-4">${escapeHtml(course.description || '')}</p>
              <div class="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                <span class="text-gray-300"><i class="fa-solid fa-layer-group text-cyan-400 mr-1"></i>${totalModules} modules</span>
                <span class="text-gray-300"><i class="fa-regular fa-clock text-purple-400 mr-1"></i>${totalHours}h ${totalMins}m total</span>
                <span class="text-gray-300"><i class="fa-solid fa-bolt text-amber-400 mr-1"></i>${totalXP} XP earned</span>
                ${progress.totalTimeSpent > 0 ? `<span class="text-gray-300"><i class="fa-solid fa-hourglass-half text-emerald-400 mr-1"></i>${timeHours}h ${timeMins}m studied</span>` : ''}
              </div>
            </div>

            <!-- CTA -->
            <div class="flex-shrink-0 w-full md:w-auto">
              ${progress.examUnlocked
                ? `<button onclick="window.startExamCheck('${courseId}')" class="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl font-bold glow"><i class="fa-solid fa-trophy mr-2"></i>Take Final Exam</button>`
                : progress.nextModuleId
                  ? `<button onclick="window.renderModulePage('${courseId}', ${progress.nextModuleId})" class="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl font-bold glow"><i class="fa-solid fa-play mr-2"></i>Resume Module ${progress.nextModuleId}</button>`
                  : '<p class="text-gray-400 text-sm">All modules complete!</p>'}
            </div>
          </div>
        </div>

        <!-- MAIN GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- MODULES SIDEBAR -->
          <div class="lg:col-span-2">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 class="text-xl font-black"><i class="fa-solid fa-list-check text-cyan-400 mr-2"></i>Modules</h2>
              <div class="flex gap-1 glass rounded-xl p-1">
                <button onclick="window.filterModules('all')" data-filter="all" class="filter-btn px-3 py-1 text-xs rounded-lg font-semibold bg-purple-600">All</button>
                <button onclick="window.filterModules('todo')" data-filter="todo" class="filter-btn px-3 py-1 text-xs rounded-lg font-semibold text-gray-400 hover:text-white">To Do</button>
                <button onclick="window.filterModules('done')" data-filter="done" class="filter-btn px-3 py-1 text-xs rounded-lg font-semibold text-gray-400 hover:text-white">Done</button>
                <button onclick="window.filterModules('bookmark')" data-filter="bookmark" class="filter-btn px-3 py-1 text-xs rounded-lg font-semibold text-gray-400 hover:text-white">⭐</button>
              </div>
            </div>
            <div class="space-y-3" id="moduleListContainer">
              ${moduleCardsHtml}
            </div>

            <!-- FINAL EXAM CARD -->
            <div class="glass rounded-2xl p-5 mt-4 border-2 ${progress.examUnlocked ? 'border-purple-500/60 glow' : 'border-dashed border-gray-700 opacity-70'}">
              <div class="flex items-center gap-4">
                <i class="fa-solid fa-trophy text-3xl ${progress.examUnlocked ? 'text-purple-400' : 'text-gray-500'}"></i>
                <div class="flex-1">
                  <h3 class="font-black text-lg">Final Exam</h3>
                  <p class="text-xs text-gray-400 mt-1">
                    ${progress.examUnlocked
                      ? '🎉 All modules complete! Exam unlocked. Prove your skills.'
                      : `Complete all ${totalModules} modules to unlock. Currently ${completedCount}/${totalModules}.`}
                  </p>
                </div>
                ${progress.examUnlocked ? `<button onclick="window.startExamCheck('${courseId}')" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl font-bold text-sm">Start Exam</button>` : ''}
              </div>
            </div>
          </div>

          <!-- SIDE PANEL -->
          <div class="lg:col-span-1 space-y-6">

            <!-- WHAT YOU'LL LEARN -->
            ${course.learningOutcomes && course.learningOutcomes.length ? `
            <div class="glass rounded-2xl p-5">
              <h3 class="font-black text-lg mb-3"><i class="fa-solid fa-graduation-cap text-cyan-400 mr-2"></i>What You'll Learn</h3>
              <ul class="space-y-2">
                ${course.learningOutcomes.map(o => `<li class="text-sm text-gray-300 flex gap-2"><i class="fa-solid fa-check text-emerald-400 mt-0.5 flex-shrink-0"></i><span>${escapeHtml(o)}</span></li>`).join('')}
              </ul>
            </div>` : ''}

            <!-- CAREER PATHS -->
            ${course.careerPaths && course.careerPaths.length ? `
            <div class="glass rounded-2xl p-5">
              <h3 class="font-black text-lg mb-3"><i class="fa-solid fa-briefcase text-purple-400 mr-2"></i>Career Paths</h3>
              <div class="flex flex-wrap gap-2">
                ${course.careerPaths.map(c => `<span class="text-xs px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 rounded-full">${escapeHtml(c)}</span>`).join('')}
              </div>
            </div>` : ''}

            <!-- YOUR STATS -->
            <div class="glass rounded-2xl p-5">
              <h3 class="font-black text-lg mb-3"><i class="fa-solid fa-chart-line text-emerald-400 mr-2"></i>Your Progress</h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">Modules done</span><span class="font-bold">${completedCount}/${totalModules}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Time studied</span><span class="font-bold">${timeHours}h ${timeMins}m</span></div>
                <div class="flex justify-between"><span class="text-gray-400">XP earned</span><span class="font-bold text-cyan-400">${totalXP}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Exam status</span><span class="font-bold ${progress.examUnlocked ? 'text-emerald-400' : 'text-gray-500'}">${progress.examUnlocked ? 'Unlocked' : 'Locked'}</span></div>
              </div>
            </div>

            <!-- NEXT UP -->
            ${progress.nextModuleId ? `
            <div class="glass rounded-2xl p-5 border-l-4 border-cyan-500/60">
              <p class="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-1">Next Up</p>
              <h3 class="font-black text-base mb-1">${escapeHtml(progress.nextModuleName || '')}</h3>
              <button onclick="window.renderModulePage('${courseId}', ${progress.nextModuleId})" class="mt-3 w-full py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl font-bold text-sm">
                <i class="fa-solid fa-play mr-1"></i>Continue
              </button>
            </div>` : ''}

          </div>
        </div>
      </div>
    `;

    if (typeof AOS !== 'undefined') AOS.refresh();
  } catch (error) {
    console.error('Dashboard error:', error);
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center max-w-lg mx-auto mt-10"><p class="text-red-400 mb-4">Failed to load course: ${error.message}</p><button onclick="window.renderPage('dashboard')" class="bg-purple-600 px-6 py-2 rounded-xl">← Dashboard</button></div>`;
  }
}

// ==================== RETRY QUIZ ====================
window.retryQuiz = async function (courseId, moduleId, moduleName) {
  try {
    showToast('Reloading quiz with shuffled questions...', 'info');
    await renderModulePage(courseId, moduleId);
  } catch (e) {
    console.error('[Quiz] Retry error:', e);
    showToast('Failed to reload quiz', 'error');
  }
};

window.__moduleExamGate = function(courseId, moduleId) {
  if (typeof showToast === "function") {
    showToast("📋 Please pass this module exam (70%+) before moving to the next module", "warning");
  }
  var allBtns = document.querySelectorAll("button[onclick]");
  for (var i = 0; i < allBtns.length; i++) {
    var oc = allBtns[i].getAttribute("onclick") || "";
    if (oc.indexOf("startModuleQuiz") !== -1 && oc.indexOf("false") !== -1) {
      allBtns[i].scrollIntoView({ behavior: "smooth", block: "center" });
      allBtns[i].classList.add("ring-2", "ring-yellow-400");
      setTimeout(function() { allBtns[i].classList.remove("ring-2", "ring-yellow-400"); }, 2500);
      break;
    }
  }
};

// ==================== START MODULE QUIZ (v2) ====================
window.startModuleQuiz = async function (courseId, moduleId, isPractice) {
  if (!isPractice && typeof window.startAntiCheat === "function") {
    window.startAntiCheat();
  }
  try {
    const token = localStorage.getItem('auth_token');
    const url = `/api/courses/${courseId}/modules/${moduleId}/quiz` + (isPractice ? '?practice=1' : '');
    const res = await fetch(url, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to load quiz');
    if (!data.questions || !data.questions.length) {
      showToast('No quiz questions available for this module yet.', 'info');
      return;
    }

    renderModuleQuizOverlay(courseId, moduleId, data.questions, isPractice);
  } catch (e) {
    console.error('[Quiz] Error:', e);
    showToast('Failed to start quiz: ' + e.message, 'error');
  }
};

// ============= NEW QUIZ OVERLAY (uses new endpoints) =============
function renderModuleQuizOverlay(courseId, moduleId, questions, isPractice) {
  const overlay = document.createElement('div');
  overlay.id = 'quizOverlay';
  overlay.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';
  document.body.appendChild(overlay);

  const answers = {};
  let currentIdx = 0;

  function render() {
    const q = questions[currentIdx];
    const selected = answers[q.id];
    const progress = Math.round(((currentIdx + 1) / questions.length) * 100);

    overlay.innerHTML = `
      <div class="glass rounded-3xl p-6 md:p-8 max-w-2xl w-full my-8">
        <div class="flex items-center justify-between mb-6">
          <span class="text-xs px-3 py-1 ${isPractice ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'} rounded-full">
            ${isPractice ? '📝 Practice' : '🎯 Module Exam'}
          </span>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-400">${currentIdx + 1} / ${questions.length}</span>
            <button onclick="window.__quizClose(${Object.keys(answers).length}, ${questions.length}, ${isPractice})" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/30 text-white flex items-center justify-center transition" title="Close quiz">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div class="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all" style="width: ${progress}%"></div>
        </div>

        <h3 class="text-lg font-bold mb-6">${escapeHtml(q.text)}</h3>

        <div class="space-y-3 mb-6">
          ${q.options.map((opt, i) => `
            <button onclick="window.__quizPick('${q.id}', ${i})"
              class="quiz-opt w-full text-left p-4 rounded-2xl border transition ${selected === i ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}">
              <span class="inline-block w-6 h-6 text-center text-xs leading-6 rounded-full bg-white/10 mr-2">${String.fromCharCode(65 + i)}</span>
              ${escapeHtml(opt)}
            </button>
          `).join('')}
        </div>

        <div class="flex justify-between gap-3">
          <button onclick="window.__quizPrev()" class="glass px-6 py-3 rounded-2xl font-bold text-sm" ${currentIdx === 0 ? 'disabled style="opacity:.4"' : ''}>← Prev</button>
          ${currentIdx === questions.length - 1
            ? `<button onclick="window.__quizSubmit()" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow">Submit ✓</button>`
            : `<button onclick="window.__quizNext()" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow">Next →</button>`}
        </div>
      </div>
    `;
  }

  window.__quizPick = (qid, i) => { answers[qid] = i; render(); };
  window.__quizNext = () => { if (currentIdx < questions.length - 1) { currentIdx++; render(); } };
  window.__quizPrev = () => { if (currentIdx > 0) { currentIdx--; render(); } };

  window.__quizSubmit = async () => {
  // submitAntiCheatWired
  if (typeof window.stopAntiCheat === "function") window.stopAntiCheat();
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ answers, isPractice })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');

      const passed = data.passed;
      overlay.innerHTML = `
        <div class="glass rounded-3xl p-10 max-w-lg w-full text-center my-8">
          <div class="w-24 h-24 mx-auto mb-6 rounded-full ${passed ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'} flex items-center justify-center">
            <i class="fa-solid ${passed ? 'fa-trophy' : 'fa-redo'} text-4xl text-white"></i>
          </div>
          <h2 class="text-3xl font-black mb-2">${data.score}%</h2>
          <p class="text-gray-400 mb-4">${data.correct} of ${data.total} correct</p>
          <p class="text-lg font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}">
            ${passed ? '🎉 ' + (isPractice ? 'Great practice!' : 'Module Passed!') : '😅 Need ' + data.passScore + '% to pass'}
          </p>
          ${data.xpAwarded ? `<p class="text-sm text-cyan-400 mb-4"><i class="fa-solid fa-bolt mr-1"></i> +${data.xpAwarded} XP earned</p>` : ''}
          <button onclick="document.getElementById('quizOverlay').remove(); window.renderModulePage('${courseId}', ${moduleId});" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 py-3 rounded-2xl font-bold">
            ${passed ? 'Continue →' : 'Back to Module'}
          </button>
        </div>
      `;
    } catch (e) {
      console.error('[Quiz] Submit error:', e);
      showToast('Submit failed: ' + e.message, 'error');
    }
  };


  window.__quizClose = (answeredCount, totalQuestions, wasPractice) => {
  // closeAntiCheatWired
  if (typeof window.stopAntiCheat === "function") window.stopAntiCheat();
    const hasProgress = answeredCount > 0 && answeredCount < totalQuestions;
    if (hasProgress) {
      if (!confirm('You have unanswered questions. Exit anyway? Progress will not be saved.')) return;
    }
    const el = document.getElementById('quizOverlay');
    if (el) el.remove();
    showToast(wasPractice ? 'Practice quiz closed' : 'Quiz closed — no score saved', 'info');
  };
  render();
}// Fallback: fetch and run quiz inline
async function runInlineModuleQuiz(courseId, moduleId, isPractice) {
  showToast('Loading quiz...', 'info');
  const root = document.getElementById('app-root');
  const overlay = document.createElement('div');
  overlay.id = 'quizOverlay';
  overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';
  overlay.innerHTML = '<div class="glass rounded-3xl p-10 max-w-lg w-full text-center"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading quiz...</p></div>';
  document.body.appendChild(overlay);

  try {
    // Fetch questions for this module
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`/api/exams/questions/${courseId}/${moduleId}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    });

    let data;
    if (res.ok) {
      data = await res.json();
    } else {
      // Try alternate endpoint
      const res2 = await fetch(`/api/exams/${courseId}/module/${moduleId}`, {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      if (!res2.ok) throw new Error('Could not load quiz questions');
      data = await res2.json();
    }

    const questions = data.questions || data || [];
    if (!questions.length) throw new Error('No questions available');

    renderQuizUI(overlay, questions, courseId, moduleId, isPractice);
  } catch (e) {
    overlay.innerHTML = `<div class="glass rounded-3xl p-10 max-w-lg w-full text-center">
      <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-400 mb-4"></i>
      <h2 class="text-xl font-black mb-2">Quiz Unavailable</h2>
      <p class="text-gray-400 text-sm mb-6">${e.message}</p>
      <button onclick="document.getElementById('quizOverlay').remove()" class="bg-purple-600 px-6 py-2 rounded-xl">Close</button>
    </div>`;
  }
}

function renderQuizUI(overlay, questions, courseId, moduleId, isPractice) {
  // Shuffle questions
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  const answers = new Array(shuffled.length).fill(null);
  let currentIdx = 0;

  function render() {
    const q = shuffled[currentIdx];
    const selected = answers[currentIdx];
    const progress = Math.round(((currentIdx + 1) / shuffled.length) * 100);

    overlay.innerHTML = `
      <div class="glass rounded-3xl p-6 md:p-8 max-w-2xl w-full">
        <div class="flex items-center justify-between mb-6">
          <span class="text-xs px-3 py-1 bg-purple-500/20 rounded-full">${isPractice ? '📝 Practice' : '🎯 Module Exam'}</span>
          <span class="text-sm text-gray-400">${currentIdx + 1} / ${shuffled.length}</span>
        </div>

        <div class="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-purple-600 to-cyan-500" style="width: ${progress}%"></div>
        </div>

        <h3 class="text-lg font-bold mb-6">${escapeHtml(q.text)}</h3>

        <div class="space-y-3 mb-6" id="answersContainer">
          ${q.options.map((opt, i) => `
            <button onclick="window.__quizSelect(${i})" data-idx="${i}"
              class="quiz-option w-full text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition ${selected === i ? 'border-purple-500 bg-purple-500/20' : ''}">
              <span class="inline-block w-6 h-6 text-center text-xs leading-6 rounded-full bg-white/10 mr-2">${String.fromCharCode(65 + i)}</span>
              ${escapeHtml(opt)}
            </button>
          `).join('')}
        </div>

        <div class="flex justify-between gap-3">
          <button onclick="window.__quizPrev()" class="glass px-6 py-3 rounded-2xl font-bold text-sm" ${currentIdx === 0 ? 'disabled style="opacity:.4"' : ''}>← Prev</button>
          ${currentIdx === shuffled.length - 1
            ? `<button onclick="window.__quizSubmit()" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow">Submit ✓</button>`
            : `<button onclick="window.__quizNext()" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow" ${selected === null ? 'disabled style="opacity:.4"' : ''}>Next →</button>`}
        </div>
      </div>
    `;
  }

  window.__quizSelect = (i) => { answers[currentIdx] = i; render(); };
  window.__quizNext = () => { if (answers[currentIdx] !== null && currentIdx < shuffled.length - 1) { currentIdx++; render(); } };
  window.__quizPrev = () => { if (currentIdx > 0) { currentIdx--; render(); } };

  window.__quizSubmit = async () => {
    // Calculate score
    let correct = 0;
    shuffled.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const score = Math.round((correct / shuffled.length) * 100);
    const passed = score >= 70;

    // Save result
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/courses/${courseId}/modules/${moduleId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ quizScore: score, isPractice })
      });
    } catch (e) { console.warn('[Quiz] Save failed:', e); }

    overlay.innerHTML = `
      <div class="glass rounded-3xl p-10 max-w-lg w-full text-center">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full ${passed ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'} flex items-center justify-center">
          <i class="fa-solid ${passed ? 'fa-trophy' : 'fa-redo'} text-4xl text-white"></i>
        </div>
        <h2 class="text-3xl font-black mb-2">${score}%</h2>
        <p class="text-gray-400 mb-6">${correct} of ${shuffled.length} correct</p>
        <p class="text-lg font-bold mb-6 ${passed ? 'text-emerald-400' : 'text-amber-400'}">
          ${passed ? '🎉 ' + (isPractice ? 'Great practice!' : 'Module Passed!') : '😅 Need 70% to pass'}
        </p>
        <div class="flex gap-3">
          <button onclick="document.getElementById('quizOverlay').remove(); window.renderModulePage('${courseId}', ${moduleId});" class="flex-1 glass px-6 py-3 rounded-2xl font-bold">
            ${passed ? 'Continue' : 'Try Again'}
          </button>
        </div>
      </div>
    `;

    if (passed && !isPractice) {
      showToast('Module passed! +XP awarded', 'success');
    }
  };


  window.__quizClose = (answeredCount, totalQuestions, wasPractice) => {
    const hasProgress = answeredCount > 0 && answeredCount < totalQuestions;
    if (hasProgress) {
      if (!confirm('You have unanswered questions. Exit anyway? Progress will not be saved.')) return;
    }
    const el = document.getElementById('quizOverlay');
    if (el) el.remove();
    showToast(wasPractice ? 'Practice quiz closed' : 'Quiz closed — no score saved', 'info');
  };
  render();
}

// ==================== LESSON DRAWER ====================
window.openLessonDrawer = function () {
  if (typeof showAIWidget === 'function') showAIWidget();

  // Mount Prof. Kelvin for this module (lazy — only while studying)
  var _drawer = document.getElementById('lessonDrawer');
  if (_drawer && typeof window.kelvinMount === 'function') {
    var _cid = _drawer.dataset.course;
    var _mid = parseInt(_drawer.dataset.module, 10);
    var _mname = (_drawer.querySelector('.lesson-drawer-header h2') || {}).textContent || 'Module';
    window.kelvinMount(_cid, _mid, _mname.replace(/^📖s*/, ''));
  }
  const backdrop = document.getElementById('lessonDrawerBackdrop');
  const drawer = document.getElementById('lessonDrawer');
  if (!drawer) { console.warn('[Drawer] Not found'); return; }

  backdrop.classList.add('active');
  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';

  const body = document.getElementById('lessonDrawerBody');
  const key = 'lesson_scroll_' + drawer.dataset.course + '_' + drawer.dataset.module;
  const saved = sessionStorage.getItem(key);
  if (saved && body) {
    setTimeout(() => { body.scrollTop = parseInt(saved, 10); }, 100);
  }

  setTimeout(() => {
    if (body) {
      body.addEventListener('scroll', handleDrawerScroll);
      handleDrawerScroll();
    }
  }, 50);
};

window.closeLessonDrawer = function () {
  if (typeof hideAIWidget === 'function') hideAIWidget();
  if (typeof window.kelvinUnmount === 'function') window.kelvinUnmount();
  const backdrop = document.getElementById('lessonDrawerBackdrop');
  const drawer = document.getElementById('lessonDrawer');
  if (!drawer) return;

  const body = document.getElementById('lessonDrawerBody');
  const key = 'lesson_scroll_' + drawer.dataset.course + '_' + drawer.dataset.module;
  if (body) {
    sessionStorage.setItem(key, String(body.scrollTop));
    body.removeEventListener('scroll', handleDrawerScroll);
  }

  backdrop.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';

  const progressFill = document.getElementById('drawerProgress');
  if (progressFill && parseInt(progressFill.style.width, 10) >= 95) {
    markLessonAsRead(drawer.dataset.course, drawer.dataset.module);
  }
};

function handleDrawerScroll() {
  const body = document.getElementById('lessonDrawerBody');
  const fill = document.getElementById('drawerProgress');
  if (!body || !fill) return;
  const total = body.scrollHeight - body.clientHeight;
  const percent = total > 0 ? Math.min(100, (body.scrollTop / total) * 100) : 0;
  fill.style.width = percent + '%';
}

async function markLessonAsRead(courseId, moduleId) {
  try {
    await apiRequest(`/courses/${courseId}/modules/${moduleId}/read`, { method: 'POST' });
  } catch (e) { /* ignore */ }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('lessonDrawer');
    if (drawer && drawer.classList.contains('active')) {
      window.closeLessonDrawer();
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'lessonDrawerBackdrop') {
    window.closeLessonDrawer();
  }
});

// ==================== PROF. KELVIN — AI TEACHER ====================
window.kelvinState = { courseId: null, moduleId: null, history: [], busy: false, mounted: false };

window.kelvinMount = function (courseId, moduleId, moduleName) {
  // Remove old widget
  document.querySelectorAll('.kelvin-fab, .kelvin-panel').forEach(el => el.remove());

  window.kelvinState.courseId = courseId;
  window.kelvinState.moduleId = moduleId;
  window.kelvinState.history = [];
  window.kelvinState.busy = false;

  // Load saved history for this module
  try {
    const saved = sessionStorage.getItem(`kelvin_${courseId}_${moduleId}`);
    if (saved) window.kelvinState.history = JSON.parse(saved);
  } catch (e) {}

  // FAB
  const fab = document.createElement('button');
  fab.className = 'kelvin-fab';
  fab.id = 'kelvinFab';
  fab.innerHTML = `<span class="avatar">👨‍🏫</span><span>Ask Prof. Kelvin</span>`;
  fab.onclick = window.kelvinOpen;
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'kelvin-panel';
  panel.id = 'kelvinPanel';
  panel.innerHTML = `
    <div class="kelvin-header" onclick="if(event.target.closest('button'))return; window.kelvinToggleMin()">
      <div class="avatar">👨‍🏫</div>
      <div class="info">
        <div class="name">Prof. Kelvin</div>
        <div class="sub">${escapeHtml(moduleName || 'AI Tutor')} · Online</div>
      </div>
      <div class="actions">
        <button class="btn-icon" onclick="event.stopPropagation(); window.kelvinToggleMin()" title="Minimize">−</button>
        <button class="btn-icon" onclick="event.stopPropagation(); window.kelvinClose()" title="Close">✕</button>
      </div>
    </div>
    <div class="kelvin-body" id="kelvinBody"></div>
    <div class="kelvin-footer">
      <div class="kelvin-input-row">
        <textarea class="kelvin-input" id="kelvinInput" rows="1" placeholder="Ask anything about this module..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.kelvinSend();}"></textarea>
        <button class="kelvin-send" id="kelvinSend" onclick="window.kelvinSend()"><i class="fa-solid fa-arrow-up"></i></button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  window.kelvinRender();
};

window.kelvinRender = function () {
  const body = document.getElementById('kelvinBody');
  if (!body) return;

  if (window.kelvinState.history.length === 0) {
    body.innerHTML = `
      <div class="kelvin-msg ai">
        <div class="avatar-sm">👨‍🏫</div>
        <div class="bubble">Hi, I'm <strong>Prof. Kelvin</strong> — your AI tutor. I've read this module and I'm here to help. Ask me anything about it.
          <div class="kelvin-quick">
            <button onclick="window.kelvinQuick('Explain the key concept like I\\'m 5')">🧠 Explain like I\\'m 5</button>
            <button onclick="window.kelvinQuick('Quiz me on this module')">📝 Quiz me</button>
            <button onclick="window.kelvinQuick('Summarize this module in 5 bullets')">📋 Summarize</button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = window.kelvinState.history.map(msg => {
    const cls = msg.role === 'user' ? 'user' : 'ai';
    const avatar = msg.role === 'user' ? '' : '<div class="avatar-sm">👨‍🏫</div>';
    const content = msg.role === 'user'
      ? escapeHtml(msg.content)
      : escapeHtml(msg.content).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return `<div class="kelvin-msg ${cls}">${avatar}<div class="bubble">${content}</div></div>`;
  }).join('');

  if (window.kelvinState.busy) {
    body.innerHTML += `<div class="kelvin-msg ai"><div class="avatar-sm">👨‍🏫</div><div class="kelvin-typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  }

  body.scrollTop = body.scrollHeight;
};

window.kelvinSave = function () {
  try {
    sessionStorage.setItem(
      `kelvin_${window.kelvinState.courseId}_${window.kelvinState.moduleId}`,
      JSON.stringify(window.kelvinState.history)
    );
  } catch (e) {}
};

window.kelvinOpen = function () {
  document.getElementById('kelvinFab')?.classList.add('hidden');
  document.getElementById('kelvinPanel')?.classList.add('active');
  setTimeout(() => document.getElementById('kelvinInput')?.focus(), 200);
};

window.kelvinClose = function () {
  document.getElementById('kelvinPanel')?.classList.remove('active');
  document.getElementById('kelvinFab')?.classList.remove('hidden');
};

window.kelvinToggleMin = function () {
  const panel = document.getElementById('kelvinPanel');
  if (!panel) return;
  panel.classList.toggle('minimized');
};

window.kelvinQuick = function (text) {
  const input = document.getElementById('kelvinInput');
  if (input) input.value = text;
  window.kelvinSend();
};

window.kelvinSend = async function () {
  if (window.kelvinState.busy) return;

  const input = document.getElementById('kelvinInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  window.kelvinState.history.push({ role: 'user', content: text });
  window.kelvinState.busy = true;
  window.kelvinRender();
  window.kelvinSave();

  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/ai/module-tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: JSON.stringify({
        courseId: window.kelvinState.courseId,
        moduleId: window.kelvinState.moduleId,
        messages: window.kelvinState.history
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prof. Kelvin is unavailable');

    window.kelvinState.history.push({ role: 'assistant', content: data.reply });
  } catch (e) {
    console.error('[Kelvin] Error:', e);
    window.kelvinState.history.push({
      role: 'assistant',
      content: 'Sorry, I had trouble responding. Please try again. (' + e.message + ')'
    });
  } finally {
    window.kelvinState.busy = false;
    window.kelvinRender();
    window.kelvinSave();
  }
};

// Unmount when leaving module page
window.kelvinUnmount = function () {
  document.querySelectorAll('.kelvin-fab, .kelvin-panel').forEach(el => el.remove());
  window.kelvinState.courseId = null;
  window.kelvinState.moduleId = null;
};

// ESC closes
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const panel = document.getElementById('kelvinPanel');
    if (panel && panel.classList.contains('active') && !panel.classList.contains('minimized')) {
      window.kelvinClose();
    }
  }
});

// ==================== VIDEO FALLBACK ====================
// If a YouTube video fails to load (deleted, private, region-locked),
// hide the entire "Watch the Lesson" section so the student isn't left
// staring at "Video unavailable".

function hideVideoIfBroken() {
  const section = document.getElementById('videoSection');
  if (!section) return;

  const iframe = section.querySelector('iframe');
  if (!iframe) {
    section.style.display = 'none';
    return;
  }

  // Listen for YouTube's "video unavailable" message
  const handler = (event) => {
    if (!event.origin || !event.origin.includes('youtube.com')) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      // YouTube sends { event: 'onError', info: 100 } for "video not found"
      // info: 150, 101 = embedding disabled
      if (data && data.event === 'onError') {
        console.warn('[Video] YouTube error', data.info, '- hiding section');
        section.style.display = 'none';
      }
    } catch (e) { /* ignore non-JSON messages */ }
  };

  window.addEventListener('message', handler);

  // Also — as a safety net — check the iframe contents after 3 seconds.
  // If the iframe has been redirected to a "watch" URL (from embed), it's broken.
  setTimeout(() => {
    try {
      // Can't read cross-origin iframe content, but we can detect YouTube's
      // redirect to /watch when the video is unavailable
      if (iframe.contentWindow && iframe.contentWindow.location.href && iframe.contentWindow.location.href.includes('/watch')) {
        section.style.display = 'none';
      }
    } catch (e) { /* cross-origin — ignore */ }
  }, 3000);
}

// Auto-run whenever module page is rendered
document.addEventListener('DOMContentLoaded', hideVideoIfBroken);
window.renderCourseDashboard = renderCourseDashboard;

// ==================== MODULE FILTER ====================
window.filterModules = function (filter) {
  document.querySelectorAll('.filter-btn').forEach(b => {
    const active = b.dataset.filter === filter;
    b.classList.toggle('bg-purple-600', active);
    b.classList.toggle('text-gray-400', !active);
  });
  document.querySelectorAll('[data-module]').forEach(el => {
    const status = el.dataset.status;
    const bookmarked = el.dataset.bookmarked === 'true';
    let show = true;
    if (filter === 'todo') show = (status === 'todo');
    else if (filter === 'done') show = (status === 'done');
    else if (filter === 'bookmark') show = bookmarked;
    el.style.display = show ? '' : 'none';
  });
};

// ==================== NEW MODULE PAGE (v2) ====================
let currentStudyTimer = null;
let currentStudySeconds = 0;
let currentModuleInfo = null;

async function renderModulePage(courseId, moduleId) {
  hideAIWidget();
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading module...</p></div>';

  if (currentStudyTimer) { clearInterval(currentStudyTimer); currentStudyTimer = null; currentStudySeconds = 0; }

  try {
    const data = await apiRequest('/courses/' + courseId + '/modules/' + moduleId + '/progress');
    const m = data.module;
    const prog = data.progress;
    currentModuleInfo = { courseId, moduleId, module: m };

    // ---- Study timer ----
    currentStudySeconds = 0;
    currentStudyTimer = setInterval(() => {
      currentStudySeconds++;
      const el = document.getElementById('studyTimer');
      if (el) {
        const mins = Math.floor(currentStudySeconds / 60);
        const secs = currentStudySeconds % 60;
        el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);

    const timeSaveInterval = setInterval(async () => {
      if (currentStudySeconds >= 30) {
        const toSave = currentStudySeconds;
        currentStudySeconds = 0;
        try {
          await apiRequest(`/courses/${courseId}/modules/${moduleId}/time`, {
            method: 'POST',
            body: JSON.stringify({ seconds: toSave })
          });
        } catch (e) {}
      }
    }, 30000);

    const saveOnLeave = () => {
      if (currentStudySeconds > 5) {
        const toSave = currentStudySeconds;
        currentStudySeconds = 0;
        const token = localStorage.getItem('auth_token');
        try {
          fetch(`/api/courses/${courseId}/modules/${moduleId}/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            body: JSON.stringify({ seconds: toSave }),
            keepalive: true
          });
        } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', saveOnLeave);
    window.__cleanupModule = () => {
      window.removeEventListener('beforeunload', saveOnLeave);
      clearInterval(timeSaveInterval);
      if (currentStudyTimer) clearInterval(currentStudyTimer);
      saveOnLeave();
    };

    // ---- Prereq check ----
    const prereqs = m.prerequisites || [];
    if (prereqs.length > 0) {
      const progressData = await apiRequest('/courses/' + courseId + '/progress');
      const doneIds = progressData.progress.modules.filter(p => p.completed).map(p => p.moduleId);
      const missing = prereqs.filter(p => !doneIds.includes(p));
      if (missing.length > 0) {
        root.innerHTML = `<div class="glass rounded-3xl p-10 text-center max-w-lg mx-auto mt-10 module-header-bg">
          <div class="module-bg-img" style="background-image:url('${__getModuleHeaderBg(courseId)}')"></div>
          <div class="module-bg-overlay"></div>
          <i class="fa-solid fa-lock text-4xl text-amber-400 mb-4"></i>
          <h2 class="text-xl font-black mb-2">Module Locked</h2>
          <p class="text-gray-400 text-sm mb-6">Complete prerequisite modules: <strong>${missing.map(x => 'M' + x).join(', ')}</strong></p>
          <button onclick="window.renderCourseDashboard('${courseId}')" class="bg-purple-600 px-6 py-2 rounded-xl">← Back to Course</button>
        </div>`;
        return;
      }
    }

    // ---- Video embed (supports multiple videos) ----
    let videoEmbed = '';
    let videoGridEmbed = '';

    // Build list of videos from m.videos array OR m.videoUrl (legacy)
    var videoList = [];
    if (Array.isArray(m.videos) && m.videos.length > 0) {
      videoList = m.videos.map(function(v, i) {
        var ytId = v.youtubeId || '';
        if (!ytId && v.url) {
          var mm = String(v.url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
          ytId = mm ? mm[1] : '';
        }
        return { youtubeId: ytId, title: v.title || ('Video ' + (i + 1)), channel: v.channel || '' };
      }).filter(function(v) { return v.youtubeId; });
    } else if (m.videoUrl) {
      var mm2 = String(m.videoUrl).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
      if (mm2) videoList.push({ youtubeId: mm2[1], title: 'Lesson Video', channel: '' });
    }

    if (videoList.length > 0) {
      // Primary video = first one (large embed)
      var first = videoList[0];
      videoEmbed = '<iframe class="w-full aspect-video rounded-2xl" src="https://www.youtube.com/embed/' + first.youtubeId + '" frameborder="0" allowfullscreen loading="lazy"></iframe>';

      // Grid of all videos (thumbnails) — clickable
      if (videoList.length > 1) {
        var cards = videoList.map(function(v, i) {
          var active = i === 0 ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-white/10 hover:border-cyan-400/50';
          return '<button type="button" onclick="window.__swapModuleVideo(\'' + v.youtubeId + '\', this)" ' +
            'class="video-swap-card text-left glass rounded-2xl overflow-hidden border-2 ' + active + ' transition">' +
              '<div style="position:relative;">' +
                '<img src="https://img.youtube.com/vi/' + v.youtubeId + '/mqdefault.jpg" alt="" style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover;">' +
                '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);">' +
                  '<i class="fa-solid fa-play" style="color:white;font-size:24px;"></i>' +
                '</div>' +
              '</div>' +
              '<div class="p-3">' +
                '<p class="text-xs font-bold text-white truncate">' + (v.title || '').replace(/</g, '&lt;') + '</p>' +
                (v.channel ? '<p class="text-[10px] text-gray-400 mt-0.5">' + v.channel + '</p>' : '') +
              '</div>' +
            '</button>';
        }).join('');
        videoGridEmbed = '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">' + cards + '</div>';
      }
    }

    // ---- Lesson body (from DB) ----
    const lessonHtml = m.lessonContent || '<p class="text-gray-400 italic">Lesson content coming soon.</p>';

    // ---- Table of contents — extract H2s ----
    const h2Regex = /<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;
    let match;
    const tocItems = [];
    while ((match = h2Regex.exec(lessonHtml)) !== null) {
      const cleanTitle = match[2].replace(/<[^>]+>/g, '').trim();
      tocItems.push({ id: match[1], title: cleanTitle });
    }

    const tocHtml = tocItems.length > 0 ? `
      <div class="lesson-toc">
        <h3>📑 On this page</h3>
        <ol>
          ${tocItems.map(t => `<li><a href="#${t.id}" onclick="event.preventDefault(); document.getElementById('${t.id}').scrollIntoView({behavior:'smooth', block:'start'});">${escapeHtml(t.title)}</a></li>`).join('')}
        </ol>
      </div>
    ` : '';

    // ---- Key terms ----
    const keyTermsHtml = (m.keyTerms && m.keyTerms.length) ? `
      <div class="lesson-glossary">
        <h2><i class="fa-solid fa-key text-purple-400 mr-2"></i>Key Terms</h2>
        <div class="lesson-glossary-grid">
          ${m.keyTerms.map(kt => `
            <div class="lesson-term">
              <div class="term">${escapeHtml(kt.term)}</div>
              <div class="definition">${escapeHtml(kt.definition)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const readingMin = m.readingTime || m.estimatedMinutes || 25;

    // ---- Render full page ----
    root.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-6">

        <!-- Sticky top bar -->
        <div class="glass rounded-2xl p-4 mb-4 sticky top-2 z-20 flex items-center justify-between flex-wrap gap-3">
          <button onclick="window.leaveModule('${courseId}')" class="text-gray-400 hover:text-white text-sm">
            <i class="fa-solid fa-arrow-left mr-1"></i> Back to Course
          </button>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              <span class="text-gray-400">Study time:</span>
              <span id="studyTimer" class="font-mono font-bold text-cyan-400">0:00</span>
            </div>
            <button onclick="window.toggleModuleBookmark('${courseId}', ${moduleId})" id="bookmarkBtn" class="text-lg transition ${prog.bookmarked ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}">
              <i class="fa-${prog.bookmarked ? 'solid' : 'regular'} fa-bookmark"></i>
            </button>
          </div>
        </div>

        <!-- Hero -->
        <div class="lesson-hero" style="background-image: url('${m.imageUrl || ''}');">
          <div class="lesson-hero-content">
            <div class="lesson-hero-badges">
              <span class="lesson-badge">Module ${m.moduleId} of ${currentModuleProgress?.totalModules || 15}</span>
              <span class="lesson-badge">${m.complexity || 'Beginner'}</span>
              <span class="lesson-badge time">⏱ ${readingMin} min read</span>
              <span class="lesson-badge xp">⚡ +${m.xpReward || 50} XP</span>
            </div>
            <h1>${escapeHtml(m.name)}</h1>
            <p>${escapeHtml(m.description || '')}</p>
          </div>
        </div>

        <!-- Reading progress bar -->
        <div class="lesson-progress-bar"><div class="lesson-progress-fill" id="lessonProgress"></div></div>

        <!-- What You'll Learn -->
        ${m.learningObjectives && m.learningObjectives.length ? `
        <div class="glass rounded-3xl p-6 mb-6">
          <h2 class="text-lg font-black mb-4"><i class="fa-solid fa-bullseye text-purple-400 mr-2"></i>What You'll Learn</h2>
          <ul class="space-y-2">
            ${m.learningObjectives.map(o => `<li class="text-sm text-gray-300 flex gap-2"><i class="fa-solid fa-check text-emerald-400 mt-0.5 flex-shrink-0"></i><span>${escapeHtml(o)}</span></li>`).join('')}
          </ul>
        </div>` : ''}

        <!-- Open Full Lesson Button -->
        <div class="mb-6">
          <button class="open-lesson-btn" onclick="window.openLessonDrawer('${courseId}', ${moduleId})">
            <div class="left">
              <span class="icon">📖</span>
              <div class="label">
                <span class="title">Open Full Lesson</span>
                <span class="subtitle">${readingMin} min read · ${m.lessonContent ? 'Tap to read' : 'Coming soon'}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;">
              ${(prog.lessonRead || false) ? '<span class="read-badge">✓ Read</span>' : ''}
              <span class="arrow">→</span>
            </div>
          </button>
        </div>

        <!-- Lesson Drawer (hidden until opened) -->
        <div class="lesson-drawer-backdrop" id="lessonDrawerBackdrop"></div>
        <div class="lesson-drawer" id="lessonDrawer" data-course="${courseId}" data-module="${moduleId}">
          <div class="lesson-drawer-header">
            <h2>📖 ${escapeHtml(m.name)}</h2>
            <button class="lesson-drawer-close" onclick="window.closeLessonDrawer()" title="Close (ESC)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="lesson-drawer-progress"><div class="lesson-drawer-progress-fill" id="drawerProgress"></div></div>
          <div class="lesson-drawer-body" id="lessonDrawerBody">
            ${tocHtml}
            <div class="lesson-body" id="lessonBody">
              ${lessonHtml}
            </div>
            ${keyTermsHtml}
          </div>
        </div>

        <!-- Video -->
        ${videoEmbed ? `
        <div class="glass rounded-3xl p-6 mb-6" id="videoSection">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 class="text-lg font-black"><i class="fa-solid fa-play text-cyan-400 mr-2"></i>Watch the Lesson</h2>
            ${videoList.length > 1 ? '<span class="text-xs text-gray-400">' + videoList.length + ' videos</span>' : ''}
          </div>
          <div id="primaryVideoPlayer">
            ${videoEmbed}
          </div>
          ${videoGridEmbed}
        </div>` : ''}



        <!-- Quiz -->
        <div class="glass rounded-3xl p-6 mb-6">
          <h2 class="text-lg font-black mb-4"><i class="fa-solid fa-pencil text-cyan-400 mr-2"></i>Module Exam</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onclick="window.startModuleQuiz('${courseId}', ${moduleId}, true)" class="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition">
              📝 Practice Quiz<br><span class="text-xs text-gray-400 font-normal">Unlimited tries · no score</span>
            </button>
            <button onclick="window.startModuleQuiz('${courseId}', ${moduleId}, false)" class="py-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl font-bold text-sm glow">
              🎯 Module Exam<br><span class="text-xs opacity-80 font-normal">${prog.attempts ? `${prog.attempts} attempt(s) so far` : 'Pass with 70% to unlock the next module · 70% to pass'}</span>
            </button>
          </div>
          ${prog.quizScore !== null ? `<p class="text-xs text-gray-400 mt-3 text-center">Best score: <span class="text-emerald-400 font-bold">${prog.bestScore || prog.quizScore}%</span></p>` : ''}
        </div>

        <!-- Final Exam CTA (only on last module) -->
        ${m.moduleId === 15 ? `
        <div class="glass rounded-3xl p-6 mb-6 border-2 ${prog.completed ? 'border-purple-500/50 glow' : 'border-dashed border-white/20'}">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="w-16 h-16 rounded-2xl ${prog.completed ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-white/10'} flex items-center justify-center flex-shrink-0">
              <i class="fa-solid fa-trophy text-2xl ${prog.completed ? 'text-white' : 'text-gray-500'}"></i>
            </div>
            <div class="flex-1 min-w-[200px]">
              <h3 class="text-xl font-black mb-1">
                ${prog.completed ? '🎓 Final Exam Ready!' : '🔒 Final Exam — Complete all modules first'}
              </h3>
              <p class="text-sm text-gray-400">
                ${prog.completed
                  ? '25 questions · 60 minutes · 70% to pass · 7-day cooldown if you fail'
                  : 'Finish all 15 modules to unlock your certification exam.'}
              </p>
            </div>
            ${prog.completed
              ? `<button onclick="window.startExamCheck('${courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow whitespace-nowrap">
                   🎯 Take Final Exam
                 </button>`
              : ''}
          </div>
        </div>` : ''}

        <!-- Nav -->
        <div class="flex justify-between items-center gap-3 flex-wrap">
          ${m.moduleId > 1 ? `<button onclick="window.leaveModule('${courseId}', ${m.moduleId - 1})" class="glass px-6 py-3 rounded-2xl font-bold text-sm">← Previous</button>` : '<span></span>'}
          <button onclick="window.leaveModule('${courseId}')" class="glass px-6 py-3 rounded-2xl font-bold text-sm">All Modules</button>
          ${m.moduleId === 15 && prog.completed
            ? `<button onclick="window.startExamCheck('${courseId}')" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow">🎯 Take Final Exam</button>`
            : (m.moduleId < 15 ? `${m.moduleId < 15 ? (prog.completed ? `<button onclick="window.leaveModule('${courseId}', ${m.moduleId + 1})" class="bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-2xl font-bold text-sm glow">Next →</button>` : `<button onclick="window.__moduleExamGate('${courseId}', ${m.moduleId})" class="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl font-bold text-sm text-gray-400 cursor-not-allowed">🔒 Pass exam to continue</button>`) : '<span></span>'}` : '<span></span>')}
        </div>
      </div>
    `;

    // ---- Reading progress tracking ----
    const lessonBody = document.getElementById('lessonBody');
    const progressFill = document.getElementById('lessonProgress');
    if (lessonBody && progressFill) {
      const updateProgress = () => {
        const rect = lessonBody.getBoundingClientRect();
        const total = lessonBody.offsetHeight;
        const scrolled = Math.min(total, Math.max(0, -rect.top + window.innerHeight * 0.3));
        const percent = Math.min(100, (scrolled / total) * 100);
        progressFill.style.width = percent + '%';
      };
      window.addEventListener('scroll', updateProgress);
      window.__cleanupModuleProgress = () => window.removeEventListener('scroll', updateProgress);
    }

    // Prof. Kelvin mounted lazily when lesson drawer opens

    // Check if video is broken — hide section if so
    if (typeof hideVideoIfBroken === 'function') {
      setTimeout(hideVideoIfBroken, 500);
    }

    if (typeof AOS !== 'undefined') AOS.refresh();
  } catch (error) {
    console.error('Module error:', error);
    root.innerHTML = `<div class="glass rounded-3xl p-12 text-center max-w-lg mx-auto mt-10"><p class="text-red-400 mb-4">Failed to load module: ${error.message}</p><button onclick="window.renderCourseDashboard('${courseId}')" class="bg-purple-600 px-6 py-2 rounded-xl">← Back</button></div>`;
  }
}
window.__swapModuleVideo = function(youtubeId, btn) {
  var player = document.getElementById('primaryVideoPlayer');
  if (player) {
    player.innerHTML = '<iframe class="w-full aspect-video rounded-2xl" src="https://www.youtube.com/embed/' + youtubeId + '?autoplay=1" frameborder="0" allowfullscreen></iframe>';
    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Update active border on cards
  document.querySelectorAll('.video-swap-card').forEach(function(c) {
    c.classList.remove('border-cyan-400', 'ring-2', 'ring-cyan-400/40');
    c.classList.add('border-white/10');
  });
  if (btn) {
    btn.classList.remove('border-white/10');
    btn.classList.add('border-cyan-400', 'ring-2', 'ring-cyan-400/40');
  }
};

window.leaveModule = function (courseId, nextModuleId) {
  if (typeof window.kelvinUnmount === 'function') window.kelvinUnmount();
  if (window.__cleanupModule) { window.__cleanupModule(); window.__cleanupModule = null; }
  if (nextModuleId) renderModulePage(courseId, nextModuleId);
  else renderCourseDashboard(courseId);
};

// ==================== BOOKMARK TOGGLE ====================
window.toggleModuleBookmark = async function (courseId, moduleId) {
  try {
    const res = await apiRequest(`/courses/${courseId}/modules/${moduleId}/bookmark`, { method: 'POST' });
    const btn = document.getElementById('bookmarkBtn');
    if (btn) {
      btn.className = `text-lg transition ${res.bookmarked ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`;
      btn.innerHTML = `<i class="fa-${res.bookmarked ? 'solid' : 'regular'} fa-bookmark"></i>`;
    }
    showToast(res.bookmarked ? 'Bookmarked!' : 'Bookmark removed', 'success');
  } catch (e) { showToast('Failed to bookmark', 'error'); }
};
window.completeModuleAndReturn = async (courseId, moduleId, score) => {
  try {
    const result = await completeModule(courseId, moduleId, score);
    showToast(`Module completed! Score: ${score}%`, 'success');
    try {
      const enrollmentData = await getMyEnrollments();
      userEnrollmentsCache = enrollmentData.enrollments || [];
    } catch (e) {}
    if (result.examUnlocked) {
      showToast('🎉 All modules completed! Final Exam unlocked!', 'success');
    }
    renderCourseDashboard(courseId);
  } catch (error) {
    showToast('Failed to save progress', 'error');
    renderCourseDashboard(courseId);
  }
};

// ==================== FINAL EXAM PAGE ====================
// ==================== ANTI-CHEAT ====================
let _antiCheatActive = false;
let _tabSwitchCount = 0;
let _antiCheatHandlers = null;
const TAB_SWITCH_LIMIT = 3;

function _blockCopy(e) {
  e.preventDefault();
  if (e.clipboardData) { try { e.clipboardData.setData('text/plain', ''); } catch (_) {} }
  if (typeof showToast === 'function') showToast('Copying is disabled during the exam', 'warning');
  return false;
}
function _blockSelect(e) { e.preventDefault(); return false; }
function _blockContext(e) {
  e.preventDefault();
  if (typeof showToast === 'function') showToast('Right-click is disabled during the exam', 'warning');
  return false;
}
function _blockDrag(e) { e.preventDefault(); return false; }
function _blockKeys(e) {
  const k = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && ['c','x','a','s','p','u'].includes(k)) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast('Keyboard shortcut disabled during exam', 'warning');
    return false;
  }
  if (k === 'printscreen') { try { navigator.clipboard.writeText(''); } catch (_) {} }
  return true;
}
let _tabSwitchPause = false;
let _pausedAt = null;
let _pauseOffsetMs = 0;

function _onVisibilityChange() {
  if (!_antiCheatActive) return;
  if (document.hidden) {
    _tabSwitchCount++;
    _logCheat('tab-switch', '#' + _tabSwitchCount + '/' + TAB_SWITCH_LIMIT);

    if (_tabSwitchCount >= TAB_SWITCH_LIMIT) {
      // 3rd strike — void the session and stop exam
      _voidSessionForCheating('Left the exam tab ' + _tabSwitchCount + ' times');
      return;
    }

    // Pause the exam (freeze timer, blur content, show overlay)
    _pauseExam();
  }
}

function _pauseExam() {
  if (_tabSwitchPause) return;
  _tabSwitchPause = true;
  _pausedAt = Date.now();
  _logCheat('exam-paused', 'switch #' + _tabSwitchCount);

  // Blur the exam content
  const root = document.getElementById('app-root');
  if (root) root.style.filter = 'blur(14px)';
  document.body.style.filter = 'none';

  // Show overlay
  let ov = document.getElementById('exam-pause-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'exam-pause-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    ov.innerHTML = '<div style="max-width:480px;background:rgba(30,30,50,0.95);border:2px solid rgba(239,68,68,0.6);border-radius:24px;padding:32px;text-align:center;color:#fff;">' +
      '<div style="font-size:64px;margin-bottom:16px;">⚠️</div>' +
      '<h2 style="font-size:22px;font-weight:900;margin-bottom:8px;">Exam Paused</h2>' +
      '<p style="font-size:14px;color:#cbd5e1;margin-bottom:8px;">Tab switch detected.</p>' +
      '<p id="exam-pause-warning" style="font-size:13px;color:#fbbf24;margin-bottom:20px;"></p>' +
      '<p style="font-size:12px;color:#94a3b8;margin-bottom:24px;">Time is frozen. Click below to continue.<br>On the 3rd switch, your attempt will be voided.</p>' +
      '<button id="exam-pause-resume" style="background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;padding:14px 28px;border-radius:14px;font-weight:800;font-size:15px;border:none;cursor:pointer;">Resume Exam</button>' +
      '</div>';
    document.body.appendChild(ov);
  }

  const warningEl = document.getElementById('exam-pause-warning');
  const left = TAB_SWITCH_LIMIT - _tabSwitchCount;
  if (warningEl) warningEl.textContent = 'Warning ' + _tabSwitchCount + ' of ' + TAB_SWITCH_LIMIT + ' — ' + left + ' left before void.';

  const btn = document.getElementById('exam-pause-resume');
  if (btn && !btn._wired) {
    btn._wired = true;
    btn.onclick = _resumeExam;
  }
}

function _resumeExam() {
  if (!_tabSwitchPause) return;
  _tabSwitchPause = false;
  if (_pausedAt) { _pauseOffsetMs += (Date.now() - _pausedAt); _pausedAt = null; }
  _logCheat('exam-resumed', 'after switch #' + _tabSwitchCount);
  const ov = document.getElementById('exam-pause-overlay');
  if (ov) ov.remove();
  const root = document.getElementById('app-root');
  if (root) root.style.filter = 'none';
}

function _voidSessionForCheating(reason) {
  console.warn('[ANTI-CHEAT] Voiding session: ' + reason);
  _logCheat('exam-voided', reason);
  stopAntiCheat();

  // Show a big blocking overlay
  const ov = document.createElement('div');
  ov.id = 'exam-void-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = '<div style="max-width:480px;background:rgba(40,20,30,0.95);border:2px solid rgba(239,68,68,0.8);border-radius:24px;padding:32px;text-align:center;color:#fff;">' +
    '<div style="font-size:64px;margin-bottom:16px;">🚫</div>' +
    '<h2 style="font-size:22px;font-weight:900;margin-bottom:8px;color:#fca5a5;">Exam Voided</h2>' +
    '<p style="font-size:14px;color:#cbd5e1;margin-bottom:16px;">' + reason + '</p>' +
    '<p style="font-size:12px;color:#94a3b8;margin-bottom:24px;">This attempt has been marked void. A cooldown applies before your next attempt, and you will receive a fresh set of questions.</p>' +
    '<button id="exam-void-back" style="background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;padding:14px 28px;border-radius:14px;font-weight:800;font-size:15px;border:none;cursor:pointer;">Back to Course</button>' +
    '</div>';
  document.body.appendChild(ov);

  // Tell the backend to mark the session voided
  try {
    const token = localStorage.getItem('auth_token');
    if (token && window._currentExamSessionId) {
      fetch('/api/exams/void-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ sessionId: window._currentExamSessionId, reason: reason })
      }).catch(() => {});
    }
  } catch (_) {}

  const btn = document.getElementById('exam-void-back');
  if (btn) {
    btn.onclick = () => {
      ov.remove();
      const root = document.getElementById('app-root');
      if (root) root.style.filter = 'none';
      if (typeof window.leaveModule === 'function') window.leaveModule('ccp');
      else window.location.reload();
    };
  }
}

window._voidSessionForCheating = _voidSessionForCheating;
window._pauseExam = _pauseExam;
window._resumeExam = _resumeExam;
function _onWindowBlur() {}
function startAntiCheat() {
  if (_antiCheatActive) return;
  _antiCheatActive = true;
  _tabSwitchCount = 0;
  _antiCheatHandlers = { copy: _blockCopy, cut: _blockCopy, selectstart: _blockSelect, contextmenu: _blockContext, dragstart: _blockDrag, keydown: _blockKeys, visibilitychange: _onVisibilityChange, blur: _onWindowBlur };
  document.addEventListener('copy', _antiCheatHandlers.copy, true);
  document.addEventListener('cut', _antiCheatHandlers.cut, true);
  document.addEventListener('selectstart', _antiCheatHandlers.selectstart, true);
  document.addEventListener('contextmenu', _antiCheatHandlers.contextmenu, true);
  document.addEventListener('dragstart', _antiCheatHandlers.dragstart, true);
  document.addEventListener('keydown', _antiCheatHandlers.keydown, true);
  document.addEventListener('visibilitychange', _antiCheatHandlers.visibilitychange);
  window.addEventListener('blur', _antiCheatHandlers.blur);
  console.log('[ANTI-CHEAT] Active. Tab-switch limit: ' + TAB_SWITCH_LIMIT);
}
function stopAntiCheat() {
  if (!_antiCheatActive) return;
  _antiCheatActive = false;
  if (_antiCheatHandlers) {
    document.removeEventListener('copy', _antiCheatHandlers.copy, true);
    document.removeEventListener('cut', _antiCheatHandlers.cut, true);
    document.removeEventListener('selectstart', _antiCheatHandlers.selectstart, true);
    document.removeEventListener('contextmenu', _antiCheatHandlers.contextmenu, true);
    document.removeEventListener('dragstart', _antiCheatHandlers.dragstart, true);
    document.removeEventListener('keydown', _antiCheatHandlers.keydown, true);
    document.removeEventListener('visibilitychange', _antiCheatHandlers.visibilitychange);
    window.removeEventListener('blur', _antiCheatHandlers.blur);
    _antiCheatHandlers = null;
  }
  console.log('[ANTI-CHEAT] Deactivated.');
}
function _autoSubmitForCheating(reason) {
  console.warn('[ANTI-CHEAT] Auto-submit: ' + reason);
  stopAntiCheat();
  if (typeof showToast === 'function') showToast('Exam ended: ' + reason, 'error');
  setTimeout(() => {
    const submitBtn = document.getElementById('nextBtn');
    if (submitBtn && submitBtn.textContent && submitBtn.textContent.toLowerCase().includes('submit')) submitBtn.click();
    else {
      const btns = Array.from(document.querySelectorAll('button'));
      const sb = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('submit'));
      if (sb) sb.click();
    }
  }, 1500);
}
window.startAntiCheat = startAntiCheat;

// ==================== PHASE 2 ANTI-CHEAT EXTENSIONS ====================
let _phase2AntiCheat = true;

// --- Fullscreen enforcement ---
let _fullscreenExits = 0;
const FULLSCREEN_EXIT_LIMIT = 2;

async function _enterFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
      console.log('[ANTI-CHEAT] Fullscreen entered');
    }
  } catch (e) {
    console.warn('[ANTI-CHEAT] Fullscreen denied:', e.message);
  }
}

function _onFullscreenChange() {
  if (!_antiCheatActive) return;
  if (!document.fullscreenElement) {
    _fullscreenExits++;
    if (typeof showToast === 'function') showToast('Fullscreen exited (' + _fullscreenExits + '/' + FULLSCREEN_EXIT_LIMIT + '). Stay in fullscreen.', 'error');
    _logCheat('fullscreen-exit', 'exit #' + _fullscreenExits);
    if (_fullscreenExits >= FULLSCREEN_EXIT_LIMIT) {
      _autoSubmitForCheating('Exited fullscreen ' + _fullscreenExits + ' times');
    }
  }
}

// --- Clipboard nuke on PrintScreen / blur ---
function _nukeClipboard() {
  try { navigator.clipboard.writeText(''); } catch (_) {}
}

function _onKeyupForPrintScreen(e) {
  if (!_antiCheatActive) return;
  if ((e.key || '').toLowerCase() === 'printscreen') {
    _nukeClipboard();
    if (typeof showToast === 'function') showToast('Screenshots are discouraged', 'warning');
    _logCheat('printscreen', 'key pressed');
  }
}

function _onBlurForClipboard() {
  if (!_antiCheatActive) return;
  _nukeClipboard();
}

// --- Server-side audit log ---
function _logCheat(event, detail) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/exams/cheat-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        courseId: (window._currentExamCourseId || 'ccp'),
        sessionId: (window._currentExamSessionId || ''),
        event: event,
        detail: detail || ''
      })
    }).catch(() => {});
  } catch (_) {}
}

// --- Watermark overlay ---
function _installWatermark() {
  if (document.getElementById('exam-watermark')) return;
  const email = (window.currentUser && (window.currentUser.email || window.currentUser.name)) || 'student';
  const wm = document.createElement('div');
  wm.id = 'exam-watermark';
  wm.style.cssText = 'position:fixed;pointer-events:none;z-index:9998;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:72px;font-weight:900;color:rgba(255,255,255,0.045);white-space:nowrap;user-select:none;letter-spacing:4px;';
  wm.textContent = email + ' · ' + new Date().toISOString().slice(0,10);
  document.body.appendChild(wm);
}

function _removeWatermark() {
  const wm = document.getElementById('exam-watermark');
  if (wm) wm.remove();
}

// Patch startAntiCheat to also add phase2 listeners
const _origStart = window.startAntiCheat;
window.startAntiCheat = function() {
  if (typeof _origStart === 'function') _origStart();
  _enterFullscreen();
  document.addEventListener('fullscreenchange', _onFullscreenChange);
  document.addEventListener('keyup', _onKeyupForPrintScreen, true);
  window.addEventListener('blur', _onBlurForClipboard);
  _installWatermark();
  _logCheat('exam-start', 'anti-cheat v2 active');
  console.log('[ANTI-CHEAT] Phase 2 active: fullscreen + clipboard + watermark + audit log');
};

// Patch stopAntiCheat to remove phase2 listeners
const _origStop = window.stopAntiCheat;
window.stopAntiCheat = function() {
  if (typeof _origStop === 'function') _origStop();
  document.removeEventListener('fullscreenchange', _onFullscreenChange);
  document.removeEventListener('keyup', _onKeyupForPrintScreen, true);
  window.removeEventListener('blur', _onBlurForClipboard);
  _removeWatermark();
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  _logCheat('exam-end', 'anti-cheat v2 stopped');
  console.log('[ANTI-CHEAT] Phase 2 stopped');
};



window.stopAntiCheat = stopAntiCheat;

function renderExamPage(courseId, examData) {
  window._currentExamCourseId = courseId;
  window._currentExamSessionId = (examData && examData.sessionId) ? examData.sessionId : '';

  hideAIWidget();
  const questions = examData.questions;
  let userAnswers = new Array(questions.length).fill(null);
  let currentIndex = 0;
  let timeLeft = examData.timeLimit || 3600;
  let timerInterval;
  const root = document.getElementById('app-root');
  if (typeof window.startAntiCheat === 'function') window.startAntiCheat();
  function renderQuestion() {
    if (currentIndex >= questions.length) { submitFinalExam(); return; }
    const q = questions[currentIndex];
    if (!q || !q.text || !q.options) { currentIndex++; if (currentIndex < questions.length) { renderQuestion(); } else { submitFinalExam(); } return; }
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
          <p class="text-xs text-gray-500 mt-4 text-center">⚠️ Do not refresh the page.</p>
        </div>
      </div>
    `;
    document.querySelectorAll('input[name="examOption"]').forEach(function(radio) { radio.addEventListener('change', function(e) { userAnswers[currentIndex] = parseInt(e.target.value); }); });
    document.getElementById('prevBtn')?.addEventListener('click', function() { if (currentIndex > 0) { currentIndex--; renderQuestion(); } });
    document.getElementById('nextBtn')?.addEventListener('click', function() { if (currentIndex === questions.length - 1) { clearInterval(timerInterval); submitFinalExam(); } else { currentIndex++; renderQuestion(); } });
  }
  function startTimer() {
    timerInterval = setInterval(function() {
      if (timeLeft <= 0) { clearInterval(timerInterval); submitFinalExam(); return; }
      timeLeft--;
      const timerSpan = document.querySelector('.exam-timer');
      if (timerSpan) { const mins = Math.floor(timeLeft / 60); const secs = timeLeft % 60; timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; }
    }, 1000);
  }
  async function submitFinalExam() {
  const _ovp = document.getElementById('exam-pause-overlay'); if (_ovp) _ovp.remove();
  const _ovv = document.getElementById('exam-void-overlay'); if (_ovv) _ovv.remove();
  const _rt = document.getElementById('app-root'); if (_rt) _rt.style.filter = 'none';
  if (typeof window.stopAntiCheat === 'function') window.stopAntiCheat();
    clearInterval(timerInterval);
    const timeSpent = (examData.timeLimit || 3600) - timeLeft;
    root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4 text-lg">Submitting your exam...</p></div>';
    try {
      const result = await submitExam(examData.sessionId, courseId, userAnswers, timeSpent);
      const studentName = result.studentName || currentUser?.fullName || currentUser?.name || 'Student';
      if (result.passed) {
        root.innerHTML = `
          <div class="max-w-2xl mx-auto fade-in">
            <div class="glass rounded-3xl p-8 text-center">
              <div class="text-6xl mb-4">🎉</div>
              <h2 class="text-2xl font-bold mb-2">Congratulations ${escapeHtml(studentName)}!</h2>
              <p class="text-4xl font-black gradient-text mb-2">${result.score}% - PASSED</p>
              <p class="text-gray-300 mb-4">${result.correctCount}/${result.totalQuestions} correct</p>
              <div class="bg-green-600/20 rounded-2xl p-6 mb-6 border border-green-500/30">
                <p class="text-sm text-gray-300 mb-2">🏅 Your Certificate is Ready!</p>
                <p class="text-sm text-gray-400">Issued to: ${escapeHtml(studentName)}</p>
                <div class="certificate-code-display text-2xl mb-1">${result.certificateCode}</div>
                <p class="text-xs text-green-400 mt-2">✅ Auto-issued — Download now!</p>
              </div>
              <div class="flex gap-3 flex-wrap">
                <button onclick="window.location.href='/certificate-generator.html?id=${result.certificateCode}'" class="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 rounded-xl font-bold">📥 Download Certificate</button>
              </div>
              <button onclick="window.renderPage('certificates')" class="glass px-6 py-3 rounded-xl font-bold mt-3 w-full">🏅 View All Certificates →</button>
            </div>
          </div>
        `;
        showToast('🎉 PASSED! Certificate auto-issued!', 'success');
      } else {
        var retakeLocalTime = result.retakeTime ? new Date(result.retakeTime) : null;
        var retakeTimeFormatted = retakeLocalTime ? retakeLocalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Soon';
        var retakeDateFormatted = retakeLocalTime ? retakeLocalTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
        var hoursLeft = result.hoursLeft || 0;
        var minutesLeft = result.minutesLeft ? Math.round(result.minutesLeft % 60) : 0;
        const failPercent = result.score || 0;
        const failBarWidth = failPercent;
        const reviewTopics = result.reviewTopics || [];
        let reviewTopicsHTML = '';
        if (reviewTopics.length > 0) {
          reviewTopicsHTML = '<div class="text-left mb-6"><h3 class="font-bold mb-2">📝 Topics to review:</h3>' + reviewTopics.map(function(t) { return '<div class="glass rounded-lg p-2 mb-1 text-sm">• ' + escapeHtml(t) + '</div>'; }).join('') + '</div>';
        }
        let wrongAnswersHTML = '';
        if (result.wrongAnswers && result.wrongAnswers.length > 0) {
          wrongAnswersHTML = '<div class="text-left mb-6 max-h-40 overflow-y-auto"><h3 class="font-bold mb-2">❌ Questions missed:</h3>' + result.wrongAnswers.map(function(wa) { return '<div class="glass rounded-xl p-3 mb-2"><p class="text-sm font-medium">' + escapeHtml(wa.question) + '</p><p class="text-xs text-green-400">✅ Correct: ' + escapeHtml(wa.correctAnswer) + '</p><p class="text-xs text-red-400">❌ Your answer: ' + escapeHtml(wa.yourAnswer) + '</p></div>'; }).join('') + '</div>';
        }
        root.innerHTML = `
          <div class="max-w-2xl mx-auto fade-in">
            <div class="glass rounded-3xl p-8 text-center">
              <div class="text-6xl mb-4">😔</div>
              <h2 class="text-2xl font-bold mb-2">Not Passed</h2>
              <p class="text-4xl font-black text-red-400 mb-2">${failPercent}%</p>
              <p class="text-gray-400 mb-2">${result.correctCount}/${result.totalQuestions} correct • Need 70% to pass</p>
              <div class="w-full bg-gray-700 h-3 rounded-full mb-6"><div class="bg-red-500 h-3 rounded-full transition-all" style="width: ${failBarWidth}%"></div></div>
              <div class="glass rounded-xl p-4 mb-6">
                <p class="text-sm text-gray-400">⏰ Retake available at:</p>
                <p class="text-lg text-yellow-400 font-bold">${retakeTimeFormatted}</p>
                <p class="text-sm text-gray-400">${retakeDateFormatted}</p>
                <p class="text-xs text-gray-500 mt-1">in ${hoursLeft} hour(s) ${minutesLeft} min(s)</p>
              </div>
              ${reviewTopicsHTML}
              ${wrongAnswersHTML}
              <div class="flex gap-3 flex-wrap">
                <button onclick="window.renderCourseDashboard('${courseId}')" class="flex-1 bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition">📖 Review Course Material</button>
              </div>
              <button onclick="window.renderPage('dashboard')" class="glass px-6 py-3 rounded-xl font-bold mt-3 w-full">← Back to Dashboard</button>
            </div>
          </div>
        `;
        showToast('❌ ' + failPercent + '%. Retake in ' + hoursLeft + 'h ' + minutesLeft + 'm.', 'error');
      }
    } catch (error) {
      showToast('Failed to submit exam', 'error');
      renderPage('dashboard');
    }
  }
  renderQuestion();
  startTimer();
}

// ==================== CHECKOUT WITH LEGAL NAME CAPTURE ====================
window.openCheckout = async (courseId) => {
  hideAIWidget();
  if (!currentUser) { renderPage('login'); return; }
  if (isAlreadyEnrolled(courseId)) { showToast('Already enrolled! Redirecting...', 'info'); setTimeout(() => renderCourseDashboard(courseId), 500); return; }
  const course = coursesData.find(c => c.id === courseId);
  if (!course) { showToast('Course not found', 'error'); return; }
  const coursePrice = course.price || course.examPrice || 0;
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="max-w-4xl mx-auto p-4 fade-in">
      <button onclick="window.renderPage('courses')" class="text-gray-400 hover:text-white mb-4 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Courses</button>
      <div class="glass rounded-3xl p-6">
        <h1 class="text-2xl font-bold mb-6">Checkout</h1>
        <div class="glass rounded-2xl p-5 mb-6">
          <h2 class="text-xl font-bold mb-4">Order Summary</h2>
          <div class="space-y-3">
            <div class="flex justify-between py-3 border-b"><span class="text-lg font-semibold">${escapeHtml(course.name)}</span><span class="text-lg font-bold text-cyan-400">$${coursePrice}</span></div>
            <div class="flex justify-between py-3 border-b"><span>Discount</span><span id="discountAmount">$0.00</span></div>
            <div class="flex justify-between py-3 text-xl font-bold"><span>Total</span><span id="totalAmount">$${coursePrice}</span></div>
            <div class="mt-6">
              <label class="text-sm text-gray-400">🎟️ Voucher Code (instant enrollment):</label>
              <div class="flex gap-2 mt-2">
                <input id="voucherInput" placeholder="Enter voucher code" class="voucher-input flex-1 bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm uppercase focus:border-cyan-400 transition" autocomplete="off">
                <button id="applyVoucherBtn" class="glass px-4 py-2 rounded-xl text-sm">Apply</button>
              </div>
              <div id="voucherMessage" class="text-xs mt-2"></div>
            </div>
          </div>
        </div>
        <div class="glass rounded-2xl p-5">
          <h2 class="text-xl font-bold mb-4">💳 Payment Methods (Coming Soon)</h2>
          <div class="space-y-2 mb-4">
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>💳 Credit Card <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>🅿️ PayPal <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
            <label class="flex items-center gap-3 glass p-3 rounded-xl cursor-not-allowed opacity-60"><input type="radio" disabled><span>📱 EcoCash <span class="text-xs text-yellow-400 ml-2">Coming Soon</span></span></label>
          </div>
          <div class="p-3 bg-yellow-500/10 rounded-xl text-xs text-yellow-400 mb-4"><i class="fa-solid fa-circle-info mr-1"></i> <strong>Vouchers = instant enrollment!</strong></div>
          <div id="autoEnrollStatus" class="hidden text-center p-4 bg-green-500/10 rounded-xl">
            <p class="text-green-400 font-bold text-lg">🎉 Enrolled Successfully!</p>
            <p class="text-sm text-gray-300 mt-1">Redirecting to legal name form...</p>
            <div class="thinking-dots mt-2"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('applyVoucherBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('voucherInput').value.trim();
    if (!code) { showToast('Please enter a voucher code', 'warning'); return; }
    const voucherMessage = document.getElementById('voucherMessage');
    voucherMessage.innerHTML = '<span class="text-cyan-400">Validating voucher...</span>';
    try {
      const validationResult = await validateVoucher(code, courseId);
      if (!validationResult.valid) { voucherMessage.innerHTML = '<span class="text-red-400">❌ ' + validationResult.message + '</span>'; return; }
      const checkoutResult = await createCheckout(courseId, 'exam_only', code, { firstName: currentUser.name?.split(' ')[0] || 'Student', lastName: currentUser.name?.split(' ')[1] || '', email: currentUser.email, phone: '', country: 'Zimbabwe' });
      if (checkoutResult.autoEnrolled) {
        voucherMessage.innerHTML = '<span class="text-green-400">✅ ' + validationResult.message + '</span>';
        document.getElementById('discountAmount').innerText = '-$' + formatMoney(checkoutResult.discount || 0);
        document.getElementById('totalAmount').innerHTML = '<strong>$' + formatMoney(checkoutResult.amount || 0) + '</strong>';
        document.getElementById('voucherInput').disabled = true;
        document.getElementById('applyVoucherBtn').disabled = true;
        document.getElementById('applyVoucherBtn').classList.add('opacity-50');
        document.getElementById('autoEnrollStatus')?.classList.remove('hidden');
        try { const enrollmentData = await getMyEnrollments(); userEnrollmentsCache = enrollmentData.enrollments || []; } catch (e) {}
        showToast('🎉 Enrolled successfully!', 'success');
        setTimeout(() => {
          if (!currentUser.hasProvidedLegalName) {
            window.showLegalNameModal();
            const observer = new MutationObserver(() => {
              const modal = document.getElementById('legalNameModal');
              if (!modal) { observer.disconnect(); renderCourseDashboard(courseId); }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); renderCourseDashboard(courseId); }, 120000);
          } else {
            renderCourseDashboard(courseId);
          }
        }, 1500);
      } else if (checkoutResult.error) {
        voucherMessage.innerHTML = '<span class="text-red-400">❌ ' + checkoutResult.error + '</span>';
      }
    } catch (error) {
      voucherMessage.innerHTML = '<span class="text-red-400">❌ ' + (error.message || 'Failed') + '</span>';
    }
  });
};

// ==================== DOWNLOAD CERTIFICATE ====================
window.downloadCertificate = function(certificateId) { window.location.href = '/certificate-generator.html?id=' + certificateId; };

// ==================== HANDLE CERTIFICATE FILE UPLOAD FROM GALLERY ====================
async function handleCertFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('certTemplatePreview');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    const nameEl = document.getElementById('certTemplateName');
    if (nameEl) nameEl.textContent = file.name;
  };
  reader.readAsDataURL(file);
  const statusEl = document.getElementById('certUploadStatus');
  if (statusEl) { statusEl.classList.remove('hidden'); statusEl.className = 'text-xs mt-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-400'; statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Uploading...'; }
  const formData = new FormData();
  formData.append('template', file);
  try {
    const token = localStorage.getItem('auth_token');
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api';
    const response = await fetch(API_BASE + '/admin/certificate-template/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
    const data = await response.json();
    if (!response.ok) { throw new Error(data.error || 'Upload failed'); }
    const urlInput = document.getElementById('certTemplateImage');
    if (urlInput) urlInput.value = data.imageUrl;
    if (statusEl) { statusEl.className = 'text-xs mt-2 p-2 rounded-lg bg-green-500/10 text-green-400'; statusEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> Template uploaded! Click Save Settings.'; }
    showToast('Template uploaded successfully!', 'success');
    if (window._certTemplate) { window._certTemplate.templateImage = data.imageUrl; }
    redrawCertPreviewCanvas();
  } catch (error) {
    console.error('Upload error:', error);
    if (statusEl) { statusEl.className = 'text-xs mt-2 p-2 rounded-lg bg-red-500/10 text-red-400'; statusEl.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Upload failed: ' + error.message; }
    showToast('Upload failed: ' + error.message, 'error');
  }
}
window.handleCertFileSelect = handleCertFileSelect;

// ==================== DELETE CERTIFICATE TEMPLATE ====================
async function deleteCertificateTemplate() {
  if (!confirm('Remove the current certificate template and reset to default?')) return;
  try {
    const response = await apiRequest('/admin/certificate-template', { method: 'DELETE' });
    if (response.success) {
      const preview = document.getElementById('certTemplatePreview');
      const urlInput = document.getElementById('certTemplateImage');
      const nameEl = document.getElementById('certTemplateName');
      if (preview) { preview.src = '/images/certificate-template.png'; preview.style.display = 'block'; }
      if (urlInput) urlInput.value = '/images/certificate-template.png';
      if (nameEl) nameEl.textContent = '/images/certificate-template.png (default)';
      const statusEl = document.getElementById('certUploadStatus');
      if (statusEl) { statusEl.className = 'text-xs mt-2 p-2 rounded-lg bg-green-500/10 text-green-400'; statusEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> Template removed. Using default.'; statusEl.classList.remove('hidden'); }
      if (window._certTemplate) { window._certTemplate.templateImage = '/images/certificate-template.png'; window._certTemplate.signatureImage = ''; }
      redrawCertPreviewCanvas();
      showToast('Template removed! Using default.', 'success');
    }
  } catch (error) { showToast('Failed: ' + error.message, 'error'); }
}
window.deleteCertificateTemplate = deleteCertificateTemplate;

// ==================== SIGNATURE PAD MODAL ====================
function openSignaturePadModal() {
  const existingSig = window._certTemplate?.signatureImage || '';
  
  const modal = document.createElement('div');
  modal.id = 'signaturePadModal';
  modal.className = 'fixed inset-0 bg-black/95 z-[1400] flex items-center justify-center p-4';
  modal.style.backdropFilter = 'blur(8px)';
  modal.innerHTML = `
    <div class="glass rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
      <div class="sticky top-0 bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4 flex justify-between items-center rounded-t-3xl">
        <h2 class="text-xl font-bold text-gray-900"><i class="fa-solid fa-signature mr-2"></i> Draw Your Signature</h2>
        <button onclick="closeSignaturePadModal()" class="text-gray-900/80 hover:text-gray-900 text-2xl">&times;</button>
      </div>
      <div class="p-6">
        <p class="text-sm text-gray-400 mb-4">Draw your official signature below. This will appear on all certificates issued to students.</p>
        
        <div style="background: #ffffff; border-radius: 16px; padding: 4px; margin-bottom: 16px;">
          <canvas id="signaturePadCanvas" width="700" height="300" style="width: 100%; height: auto; border-radius: 12px; cursor: crosshair; background: #ffffff; display: block;"></canvas>
        </div>
        
        <div class="flex flex-wrap gap-3 mb-4 items-center">
          <span class="text-sm text-gray-400">Pen Color:</span>
          <button onclick="setSignaturePenColor('#1a1a1a')" class="w-8 h-8 rounded-full border-2 border-white/30" style="background: #1a1a1a;" title="Black"></button>
          <button onclick="setSignaturePenColor('#D4AF37')" class="w-8 h-8 rounded-full border-2 border-white/30" style="background: #D4AF37;" title="Gold"></button>
          <button onclick="setSignaturePenColor('#1B2A4A')" class="w-8 h-8 rounded-full border-2 border-white/30" style="background: #1B2A4A;" title="Navy"></button>
          <button onclick="setSignaturePenColor('#8B0000')" class="w-8 h-8 rounded-full border-2 border-white/30" style="background: #8B0000;" title="Red"></button>
          <button onclick="setSignaturePenColor('#006400')" class="w-8 h-8 rounded-full border-2 border-white/30" style="background: #006400;" title="Green"></button>
          <span class="ml-4 text-sm text-gray-400">Width:</span>
          <input type="range" id="sigPenWidth" min="1" max="10" value="3" class="w-32" oninput="updateSigPenWidth(this.value)">
          <span id="sigPenWidthVal" class="text-xs text-gray-400">3px</span>
        </div>
        
        <div class="flex gap-3">
          <button onclick="clearSignaturePad()" class="flex-1 bg-red-600/30 hover:bg-red-600/50 py-3 rounded-xl font-bold transition border border-red-500/30">
            <i class="fa-solid fa-eraser mr-1"></i> Clear Signature
          </button>
          <button onclick="saveSignatureFromPad()" class="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 py-3 rounded-xl font-bold text-gray-900 transition">
            <i class="fa-solid fa-floppy-disk mr-1"></i> Save & Apply to Template
          </button>
        </div>
        
        ${existingSig ? `
          <div class="mt-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <p class="text-sm text-amber-400 mb-2"><i class="fa-solid fa-circle-check mr-1"></i> Current Signature:</p>
            <img src="${existingSig}" alt="Current Signature" style="max-height: 60px; background: white; padding: 8px; border-radius: 8px;">
            <button onclick="clearSavedSignature()" class="ml-3 text-xs text-red-400 hover:underline"><i class="fa-solid fa-trash mr-1"></i> Remove</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    const canvas = document.getElementById('signaturePadCanvas');
    if (!canvas) return;
    
    signaturePadState.canvas = canvas;
    signaturePadState.ctx = canvas.getContext('2d');
    signaturePadState.ctx.fillStyle = '#ffffff';
    signaturePadState.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (existingSig) {
      const img = new Image();
      img.onload = function() {
        signaturePadState.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = existingSig;
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
  }, 200);
}

function startDrawing(e) {
  signaturePadState.isDrawing = true;
  const rect = signaturePadState.canvas.getBoundingClientRect();
  const scaleX = signaturePadState.canvas.width / rect.width;
  const scaleY = signaturePadState.canvas.height / rect.height;
  signaturePadState.lastX = (e.clientX - rect.left) * scaleX;
  signaturePadState.lastY = (e.clientY - rect.top) * scaleY;
  e.preventDefault();
}

function draw(e) {
  if (!signaturePadState.isDrawing) return;
  e.preventDefault();
  const rect = signaturePadState.canvas.getBoundingClientRect();
  const scaleX = signaturePadState.canvas.width / rect.width;
  const scaleY = signaturePadState.canvas.height / rect.height;
  const currentX = (e.clientX - rect.left) * scaleX;
  const currentY = (e.clientY - rect.top) * scaleY;
  
  const ctx = signaturePadState.ctx;
  ctx.beginPath();
  ctx.moveTo(signaturePadState.lastX, signaturePadState.lastY);
  ctx.lineTo(currentX, currentY);
  ctx.strokeStyle = signaturePadState.penColor;
  ctx.lineWidth = signaturePadState.penWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  signaturePadState.lastX = currentX;
  signaturePadState.lastY = currentY;
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  signaturePadState.isDrawing = true;
  const rect = signaturePadState.canvas.getBoundingClientRect();
  const scaleX = signaturePadState.canvas.width / rect.width;
  const scaleY = signaturePadState.canvas.height / rect.height;
  signaturePadState.lastX = (touch.clientX - rect.left) * scaleX;
  signaturePadState.lastY = (touch.clientY - rect.top) * scaleY;
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!signaturePadState.isDrawing) return;
  const touch = e.touches[0];
  const rect = signaturePadState.canvas.getBoundingClientRect();
  const scaleX = signaturePadState.canvas.width / rect.width;
  const scaleY = signaturePadState.canvas.height / rect.height;
  const currentX = (touch.clientX - rect.left) * scaleX;
  const currentY = (touch.clientY - rect.top) * scaleY;
  
  const ctx = signaturePadState.ctx;
  ctx.beginPath();
  ctx.moveTo(signaturePadState.lastX, signaturePadState.lastY);
  ctx.lineTo(currentX, currentY);
  ctx.strokeStyle = signaturePadState.penColor;
  ctx.lineWidth = signaturePadState.penWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  signaturePadState.lastX = currentX;
  signaturePadState.lastY = currentY;
}

function stopDrawing() {
  signaturePadState.isDrawing = false;
}

function setSignaturePenColor(color) {
  signaturePadState.penColor = color;
}

function updateSigPenWidth(val) {
  signaturePadState.penWidth = parseInt(val);
  const valEl = document.getElementById('sigPenWidthVal');
  if (valEl) valEl.textContent = val + 'px';
}

function clearSignaturePad() {
  if (signaturePadState.ctx && signaturePadState.canvas) {
    signaturePadState.ctx.fillStyle = '#ffffff';
    signaturePadState.ctx.fillRect(0, 0, signaturePadState.canvas.width, signaturePadState.canvas.height);
  }
}

function saveSignatureFromPad() {
  if (!signaturePadState.canvas) return;
  const dataUrl = signaturePadState.canvas.toDataURL('image/png');
  
  if (window._certTemplate) {
    window._certTemplate.signatureImage = dataUrl;
  }
  
  const sigPreview = document.getElementById('signaturePreviewImg');
  if (sigPreview) {
    sigPreview.src = dataUrl;
    sigPreview.style.display = 'block';
  }
  const sigPlaceholder = document.getElementById('signaturePlaceholder');
  if (sigPlaceholder) sigPlaceholder.style.display = 'none';
  
  closeSignaturePadModal();
  redrawCertPreviewCanvas();
  showToast('Signature saved! Drag it on the canvas to position.', 'success');
}

function clearSavedSignature() {
  if (window._certTemplate) {
    window._certTemplate.signatureImage = '';
  }
  const sigPreview = document.getElementById('signaturePreviewImg');
  if (sigPreview) {
    sigPreview.src = '';
    sigPreview.style.display = 'none';
  }
  const sigPlaceholder = document.getElementById('signaturePlaceholder');
  if (sigPlaceholder) sigPlaceholder.style.display = 'block';
  redrawCertPreviewCanvas();
  showToast('Signature removed.', 'info');
}

function closeSignaturePadModal() {
  const modal = document.getElementById('signaturePadModal');
  if (modal) modal.remove();
  signaturePadState.isDrawing = false;
}

window.openSignaturePadModal = openSignaturePadModal;
window.setSignaturePenColor = setSignaturePenColor;
window.updateSigPenWidth = updateSigPenWidth;
window.clearSignaturePad = clearSignaturePad;
window.saveSignatureFromPad = saveSignatureFromPad;
window.clearSavedSignature = clearSavedSignature;
window.closeSignaturePadModal = closeSignaturePadModal;

// ==================== CUSTOM TEXT FIELDS MANAGEMENT ====================
function addCustomTextField() {
  if (!customTextFields) customTextFields = [];
  const newField = {
    id: 'custom_' + Date.now(),
    text: 'New Text',
    x: 800,
    y: 700 + (customTextFields.length * 60),
    fontSize: 28,
    fontColor: '#1a1a1a',
    fontFamily: 'Georgia'
  };
  customTextFields.push(newField);
  renderCustomTextFieldsList();
  redrawCertPreviewCanvas();
  showToast('Custom text field added! Drag it on the canvas.', 'info');
}

function removeCustomTextField(fieldId) {
  if (!customTextFields) return;
  customTextFields = customTextFields.filter(f => f.id !== fieldId);
  renderCustomTextFieldsList();
  redrawCertPreviewCanvas();
  showToast('Custom text field removed.', 'info');
}

function updateCustomTextField(fieldId, property, value) {
  if (!customTextFields) return;
  const field = customTextFields.find(f => f.id === fieldId);
  if (field) {
    if (property === 'fontSize' || property === 'x' || property === 'y') {
      field[property] = parseInt(value) || 0;
    } else {
      field[property] = value;
    }
    redrawCertPreviewCanvas();
  }
}

function renderCustomTextFieldsList() {
  const container = document.getElementById('customTextFieldsContainer');
  if (!container) return;
  if (!customTextFields || customTextFields.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">No custom text fields. Click "+ Add Custom Text Field" below.</p>';
    return;
  }
  container.innerHTML = customTextFields.map(field => `
    <div class="glass rounded-xl p-3 mb-3 border border-white/5">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-medium text-purple-400">Custom Text</span>
        <button onclick="removeCustomTextField('${field.id}')" class="text-red-400 hover:text-red-300 text-xs">
          <i class="fa-solid fa-trash mr-1"></i> Remove
        </button>
      </div>
      <div class="space-y-2">
        <input type="text" value="${escapeHtml(field.text)}" 
          oninput="updateCustomTextField('${field.id}', 'text', this.value)" 
          class="w-full bg-transparent border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:border-purple-400 transition" 
          placeholder="Type custom text..." autocomplete="off">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Size</label>
            <input type="range" min="12" max="80" value="${field.fontSize}" 
              oninput="updateCustomTextField('${field.id}', 'fontSize', this.value); document.getElementById('ctSize_${field.id}').textContent = this.value + 'px';" 
              class="w-full">
            <span id="ctSize_${field.id}" class="text-xs text-gray-400">${field.fontSize}px</span>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Color</label>
            <input type="color" value="${field.fontColor}" 
              oninput="updateCustomTextField('${field.id}', 'fontColor', this.value)" 
              class="w-full h-8 rounded-lg border-0 cursor-pointer">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X: ${field.x}</label>
            <input type="range" min="0" max="1600" value="${field.x}" 
              oninput="updateCustomTextField('${field.id}', 'x', this.value); this.previousElementSibling.innerHTML = 'X: ' + this.value;" 
              class="w-full">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y: ${field.y}</label>
            <input type="range" min="0" max="1131" value="${field.y}" 
              oninput="updateCustomTextField('${field.id}', 'y', this.value); this.previousElementSibling.innerHTML = 'Y: ' + this.value;" 
              class="w-full">
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

window.addCustomTextField = addCustomTextField;
window.removeCustomTextField = removeCustomTextField;
window.updateCustomTextField = updateCustomTextField;

// ==================== AUTO-CALCULATE EXPIRY DATE (CLEAN - NO PREFIX) ====================
function getAutoCalculatedExpiry() {
  const issueDateStr = document.getElementById('testIssueDate')?.value || '24 June 2026';
  const expiryPeriod = document.getElementById('expiryPeriod')?.value || window._certTemplate?.expiryPeriod || 'never';
  
  if (expiryPeriod === 'never' || !expiryPeriod) return '';
  
  try {
    const issueDate = new Date(issueDateStr);
    if (isNaN(issueDate.getTime())) return '';
    
    const yearsToAdd = parseInt(expiryPeriod.replace('year', '').replace('s', '').trim()) || 0;
    if (yearsToAdd <= 0) return '';
    
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return expiryDate.toLocaleDateString('en-US', options);
  } catch(e) {
    return '';
  }
}

// ==================== REDRAW CERTIFICATE PREVIEW CANVAS (v13.0 - CLEAN EXPIRY) ====================
function redrawCertPreviewCanvas() {
  const canvas = document.getElementById('certPreviewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const imageUrl = document.getElementById('certTemplateImage')?.value || window._certTemplate?.templateImage || '/images/certificate-template.png';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageUrl;
  img.onload = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawAllCertPreviewElements(ctx);
  };
  img.onerror = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = '24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Failed to load template image', 800, 500);
    ctx.fillText('URL: ' + imageUrl, 800, 540);
    drawAllCertPreviewElements(ctx);
  };
}

function drawAllCertPreviewElements(ctx) {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  
  const ff = getVal('fontFamily', window._certTemplate?.styles?.fontFamily || 'Georgia');
  
  // Student Name
  const studentName = getVal('testStudentName', 'John Doe');
  const posNameX = parseInt(getVal('posNameX', '800'));
  const posNameY = parseInt(getVal('posNameY', '455'));
  const nameSize = parseInt(getVal('fontNameSize', '52'));
  const nameColor = getVal('fontNameColorText') || getVal('fontNameColor', '#1a1a1a');
  
  ctx.font = 'bold ' + nameSize + 'px ' + ff;
  ctx.fillStyle = nameColor;
  ctx.textAlign = 'center';
  ctx.fillText(studentName, posNameX, posNameY);
  
  // Course Name
  const courseName = getVal('testCourseName', 'Computer Certified Professional (CCP)');
  const posCourseX = parseInt(getVal('posCourseX', '800'));
  const posCourseY = parseInt(getVal('posCourseY', '620'));
  const courseSize = parseInt(getVal('fontCourseSize', '36'));
  const courseColor = getVal('fontCourseColorText') || getVal('fontCourseColor', '#1a1a1a');
  
  ctx.font = courseSize + 'px ' + ff;
  ctx.fillStyle = courseColor;
  ctx.fillText(courseName, posCourseX, posCourseY);
  
  // Issue Date
  const issueDate = getVal('testIssueDate', '24 June 2026');
  const posDateX = parseInt(getVal('posDateX', '470'));
  const posDateY = parseInt(getVal('posDateY', '885'));
  const dateSize = parseInt(getVal('fontDateSize', '28'));
  const dateColor = getVal('fontDateColorText') || getVal('fontDateColor', '#1a1a1a');
  
  ctx.font = dateSize + 'px ' + ff;
  ctx.fillStyle = dateColor;
  ctx.fillText(issueDate, posDateX, posDateY);
  
  // Expiry Date - AUTO-CALCULATED, CLEAN (NO PREFIX)
  const autoExpiryText = getAutoCalculatedExpiry();
  if (autoExpiryText) {
    const posExpiryX = parseInt(getVal('posExpiryDateX', '470'));
    const posExpiryY = parseInt(getVal('posExpiryDateY', '920'));
    const expirySize = parseInt(getVal('fontExpiryDateSize', '24'));
    const expiryColor = getVal('fontExpiryDateColorText') || getVal('fontExpiryDateColor', '#1a1a1a');
    
    ctx.font = expirySize + 'px ' + ff;
    ctx.fillStyle = expiryColor;
    ctx.fillText(autoExpiryText, posExpiryX, posExpiryY);
  }
  
  // Cert ID
  const certId = getVal('testCertId', 'OBX-CCP-TEST123');
  const posCertIdX = parseInt(getVal('posCertIdX', '1180'));
  const posCertIdY = parseInt(getVal('posCertIdY', '885'));
  const certIdSize = parseInt(getVal('fontCertIdSize', '28'));
  const certIdColor = getVal('fontCertIdColorText') || getVal('fontCertIdColor', '#1a1a1a');
  
  ctx.font = certIdSize + 'px ' + ff;
  ctx.fillStyle = certIdColor;
  ctx.fillText(certId, posCertIdX, posCertIdY);
  
  // Verify URL
  const verifyBase = document.getElementById('verifyUrlBase')?.value || window._certTemplate?.verifyUrlBase || '';
  if (verifyBase) {
    const posVerifyX = parseInt(getVal('posVerifyUrlX', '1180'));
    const posVerifyY = parseInt(getVal('posVerifyUrlY', '920'));
    const verifySize = parseInt(getVal('fontVerifyUrlSize', '20'));
    const verifyColor = getVal('fontVerifyUrlColorText') || getVal('fontVerifyUrlColor', '#1a1a1a');
    const fullVerifyUrl = verifyBase + certId;
    
    ctx.font = verifySize + 'px ' + ff;
    ctx.fillStyle = verifyColor;
    ctx.fillText(fullVerifyUrl, posVerifyX, posVerifyY);
  }
  
  // Custom Text Fields
  if (customTextFields && customTextFields.length > 0) {
    customTextFields.forEach(field => {
      if (field.text && field.text.trim()) {
        ctx.font = (field.fontSize || 28) + 'px ' + (field.fontFamily || ff);
        ctx.fillStyle = field.fontColor || '#1a1a1a';
        ctx.fillText(field.text, field.x || 800, field.y || 700);
      }
    });
  }
  
  // Signature
  drawSignatureOnPreview(ctx);
  
  // Update the auto-calculated preview text in the UI
  const expiryPreviewEl = document.getElementById('expiryAutoPreview');
  if (expiryPreviewEl) {
    if (autoExpiryText) {
      expiryPreviewEl.innerHTML = '<i class="fa-solid fa-calculator mr-1"></i> ' + escapeHtml(autoExpiryText);
      expiryPreviewEl.className = 'text-sm text-green-400 font-semibold';
    } else {
      expiryPreviewEl.innerHTML = '<i class="fa-solid fa-circle-info mr-1"></i> No expiry (Never Expires selected)';
      expiryPreviewEl.className = 'text-xs text-gray-500';
    }
  }
}

function drawSignatureOnPreview(ctx) {
  const sigImage = window._certTemplate?.signatureImage || '';
  if (!sigImage) return;
  
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  
  const sigX = parseInt(getVal('posSignatureX', '800'));
  const sigY = parseInt(getVal('posSignatureY', '980'));
  const sigScale = parseFloat(getVal('posSignatureScale', '1.0'));
  
  const img = new Image();
  img.onload = function() {
    const w = img.width * sigScale;
    const h = img.height * sigScale;
    const x = sigX - w / 2;
    const y = sigY - h / 2;
    ctx.drawImage(img, x, y, w, h);
  };
  img.src = sigImage;
}

window.redrawCertPreviewCanvas = redrawCertPreviewCanvas;
window.drawAllCertPreviewElements = drawAllCertPreviewElements;
window.drawSignatureOnPreview = drawSignatureOnPreview;
window.getAutoCalculatedExpiry = getAutoCalculatedExpiry;

// ==================== CERTIFICATE PREVIEW MODAL (v13.0 - CLEAN EXPIRY) ====================
function showCertPreviewModal(imageUrl, positions, styles, testData, signatureImage, expiryPeriod, verifyUrlBase, customTexts) {
  var td = testData || { studentName: 'John Doe', courseName: 'Computer Certified Professional (CCP)', issueDate: '24 June 2026', certId: 'OBX-CCP-TEST123' };
  var sigImg = signatureImage || window._certTemplate?.signatureImage || '';
  var expPeriod = expiryPeriod || window._certTemplate?.expiryPeriod || 'never';
  var vrfBase = verifyUrlBase || window._certTemplate?.verifyUrlBase || '';
  var ct = customTexts || customTextFields || [];
  
  // Auto-calculate expiry for preview - CLEAN, NO PREFIX
  var autoExpiryText = '';
  if (expPeriod !== 'never' && expPeriod) {
    try {
      var issueDate = new Date(td.issueDate);
      if (!isNaN(issueDate.getTime())) {
        var yearsToAdd = parseInt(expPeriod.replace('year', '').replace('s', '').trim()) || 0;
        if (yearsToAdd > 0) {
          var expiryDate = new Date(issueDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
          var options = { year: 'numeric', month: 'long', day: 'numeric' };
          autoExpiryText = expiryDate.toLocaleDateString('en-US', options);
        }
      }
    } catch(e) {}
  }
  
  var m = '<div id="certPreviewModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold"><i class="fa-solid fa-eye mr-2"></i> Certificate Preview</h2><button onclick="closeModal(\'certPreviewModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6 text-center"><div class="canvas-wrapper" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);"><canvas id="previewCanvas" width="1600" height="1131" style="max-width: 100%; height: auto;"></canvas></div><p class="text-xs text-gray-500 mt-3">Test preview with: <strong>' + escapeHtml(td.studentName) + '</strong></p><button onclick="closeModal(\'certPreviewModal\')" class="glass px-6 py-3 rounded-xl font-bold mt-4">Close Preview</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
  
  setTimeout(function() {
    var canvas = document.getElementById('previewCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = function() {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var ff = (styles && styles.fontFamily) || 'Georgia';
      
      // Name
      ctx.font = 'bold ' + ((styles && styles.nameFontSize) || 52) + 'px ' + ff;
      ctx.fillStyle = (styles && styles.nameFontColor) || '#1a1a1a';
      ctx.textAlign = 'center';
      ctx.fillText(td.studentName, (positions && positions.nameX) || 800, (positions && positions.nameY) || 455);
      
      // Course
      ctx.font = ((styles && styles.courseFontSize) || 36) + 'px ' + ff;
      ctx.fillStyle = (styles && styles.courseFontColor) || '#1a1a1a';
      ctx.fillText(td.courseName, (positions && positions.courseX) || 800, (positions && positions.courseY) || 620);
      
      // Date
      ctx.font = ((styles && styles.dateFontSize) || 28) + 'px ' + ff;
      ctx.fillStyle = (styles && styles.dateFontColor) || '#1a1a1a';
      ctx.fillText(td.issueDate, (positions && positions.dateX) || 470, (positions && positions.dateY) || 885);
      
      // Expiry - AUTO-CALCULATED, CLEAN
      if (autoExpiryText) {
        ctx.font = ((styles && styles.expiryDateFontSize) || 24) + 'px ' + ff;
        ctx.fillStyle = (styles && styles.expiryDateFontColor) || '#1a1a1a';
        ctx.fillText(autoExpiryText, (positions && positions.expiryDateX) || 470, (positions && positions.expiryDateY) || 920);
      }
      
      // Cert ID
      ctx.font = ((styles && styles.certIdFontSize) || 28) + 'px ' + ff;
      ctx.fillStyle = (styles && styles.certIdFontColor) || '#1a1a1a';
      ctx.fillText(td.certId, (positions && positions.certIdX) || 1180, (positions && positions.certIdY) || 885);
      
      // Verify URL
      if (vrfBase) {
        ctx.font = ((styles && styles.verifyUrlFontSize) || 20) + 'px ' + ff;
        ctx.fillStyle = (styles && styles.verifyUrlFontColor) || '#1a1a1a';
        ctx.fillText(vrfBase + td.certId, (positions && positions.verifyUrlX) || 1180, (positions && positions.verifyUrlY) || 920);
      }
      
      // Custom texts
      if (ct && ct.length > 0) {
        ct.forEach(function(ctField) {
          if (ctField.text && ctField.text.trim()) {
            ctx.font = (ctField.fontSize || 28) + 'px ' + (ctField.fontFamily || ff);
            ctx.fillStyle = ctField.fontColor || '#1a1a1a';
            ctx.fillText(ctField.text, ctField.x || 800, ctField.y || 700);
          }
        });
      }
      
      // Signature
      if (sigImg) {
        var sigImgObj = new Image();
        sigImgObj.onload = function() {
          var sigScale = (positions && positions.signatureScale) || 1.0;
          var w = sigImgObj.width * sigScale;
          var h = sigImgObj.height * sigScale;
          var sx = ((positions && positions.signatureX) || 800) - w / 2;
          var sy = ((positions && positions.signatureY) || 980) - h / 2;
          ctx.drawImage(sigImgObj, sx, sy, w, h);
        };
        sigImgObj.src = sigImg;
      }
    };
  }, 200);
}
window.showCertPreviewModal = showCertPreviewModal;

// ==================== DRAG ENGINE FOR CERTIFICATE EDITOR (v13.0 - WITH ALL ELEMENTS) ====================
function initCertDragEngine() {
  const canvas = document.getElementById('certPreviewCanvas');
  if (!canvas) return;
  
  const getPosVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? parseInt(el.value) : fallback;
  };
  
  function getElementAtPosition(mx, my) {
    const threshold = 40;
    const elements = [
      { name: 'name', x: getPosVal('posNameX', 800), y: getPosVal('posNameY', 455), inputX: 'posNameX', inputY: 'posNameY', type: 'text' },
      { name: 'course', x: getPosVal('posCourseX', 800), y: getPosVal('posCourseY', 620), inputX: 'posCourseX', inputY: 'posCourseY', type: 'text' },
      { name: 'date', x: getPosVal('posDateX', 470), y: getPosVal('posDateY', 885), inputX: 'posDateX', inputY: 'posDateY', type: 'text' },
      { name: 'expiry', x: getPosVal('posExpiryDateX', 470), y: getPosVal('posExpiryDateY', 920), inputX: 'posExpiryDateX', inputY: 'posExpiryDateY', type: 'text' },
      { name: 'certId', x: getPosVal('posCertIdX', 1180), y: getPosVal('posCertIdY', 885), inputX: 'posCertIdX', inputY: 'posCertIdY', type: 'text' },
      { name: 'verifyUrl', x: getPosVal('posVerifyUrlX', 1180), y: getPosVal('posVerifyUrlY', 920), inputX: 'posVerifyUrlX', inputY: 'posVerifyUrlY', type: 'text' },
      { name: 'signature', x: getPosVal('posSignatureX', 800), y: getPosVal('posSignatureY', 980), inputX: 'posSignatureX', inputY: 'posSignatureY', type: 'image' }
    ];
    
    if (customTextFields && customTextFields.length > 0) {
      customTextFields.forEach(field => {
        elements.push({
          name: 'custom_' + field.id,
          x: field.x || 800,
          y: field.y || 700,
          inputX: null,
          inputY: null,
          type: 'custom',
          customId: field.id
        });
      });
    }
    
    for (const el of elements) {
      const dx = Math.abs(mx - el.x);
      const dy = Math.abs(my - el.y);
      if (dx < threshold && dy < threshold) {
        return el;
      }
    }
    return null;
  }
  
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }
  
  function onDragStart(e) {
    const coords = getCanvasCoords(e);
    const element = getElementAtPosition(coords.x, coords.y);
    if (element) {
      certDragState.isDragging = true;
      certDragState.draggedElement = element;
      certDragState.dragStartX = coords.x;
      certDragState.dragStartY = coords.y;
      certDragState.elementStartX = element.x;
      certDragState.elementStartY = element.y;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }
  
  function onDragMove(e) {
    if (!certDragState.isDragging || !certDragState.draggedElement) {
      const coords = getCanvasCoords(e);
      const hovered = getElementAtPosition(coords.x, coords.y);
      canvas.style.cursor = hovered ? 'grab' : 'default';
      return;
    }
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const dx = coords.x - certDragState.dragStartX;
    const dy = coords.y - certDragState.dragStartY;
    const newX = Math.round(certDragState.elementStartX + dx);
    const newY = Math.round(certDragState.elementStartY + dy);
    const clampedX = Math.max(0, Math.min(canvas.width, newX));
    const clampedY = Math.max(0, Math.min(canvas.height, newY));
    
    if (certDragState.draggedElement.type === 'custom') {
      updateCustomTextField(certDragState.draggedElement.customId, 'x', clampedX);
      updateCustomTextField(certDragState.draggedElement.customId, 'y', clampedY);
      renderCustomTextFieldsList();
    } else {
      const inputX = document.getElementById(certDragState.draggedElement.inputX);
      const inputY = document.getElementById(certDragState.draggedElement.inputY);
      if (inputX) inputX.value = clampedX;
      if (inputY) inputY.value = clampedY;
      if (inputX) inputX.dispatchEvent(new Event('input', { bubbles: true }));
      if (inputY) inputY.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    redrawCertPreviewCanvas();
  }
  
  function onDragEnd(e) {
    if (certDragState.isDragging) {
      certDragState.isDragging = false;
      certDragState.draggedElement = null;
      canvas.style.cursor = 'default';
    }
  }
  
  canvas.addEventListener('mousedown', onDragStart);
  canvas.addEventListener('mousemove', onDragMove);
  canvas.addEventListener('mouseup', onDragEnd);
  canvas.addEventListener('mouseleave', onDragEnd);
  canvas.addEventListener('touchstart', onDragStart, { passive: false });
  canvas.addEventListener('touchmove', onDragMove, { passive: false });
  canvas.addEventListener('touchend', onDragEnd);
  canvas.addEventListener('touchcancel', onDragEnd);
}
window.initCertDragEngine = initCertDragEngine;

// ==================== APPLY COLOR PRESET (v13.0 - ALL FIELDS) ====================
window.applyColorPreset = function(color) {
  var focusedEl = document.activeElement;
  if (focusedEl && focusedEl.id === 'fontNameColorText') {
    document.getElementById('fontNameColorText').value = color;
    document.getElementById('fontNameColor').value = color;
  } else if (focusedEl && focusedEl.id === 'fontCourseColorText') {
    document.getElementById('fontCourseColorText').value = color;
    document.getElementById('fontCourseColor').value = color;
  } else if (focusedEl && focusedEl.id === 'fontDateColorText') {
    document.getElementById('fontDateColorText').value = color;
    document.getElementById('fontDateColor').value = color;
  } else if (focusedEl && focusedEl.id === 'fontExpiryDateColorText') {
    document.getElementById('fontExpiryDateColorText').value = color;
    document.getElementById('fontExpiryDateColor').value = color;
  } else if (focusedEl && focusedEl.id === 'fontCertIdColorText') {
    document.getElementById('fontCertIdColorText').value = color;
    document.getElementById('fontCertIdColor').value = color;
  } else if (focusedEl && focusedEl.id === 'fontVerifyUrlColorText') {
    document.getElementById('fontVerifyUrlColorText').value = color;
    document.getElementById('fontVerifyUrlColor').value = color;
  } else {
    document.getElementById('fontNameColorText').value = color;
    document.getElementById('fontNameColor').value = color;
  }
  redrawCertPreviewCanvas();
  showToast('Color applied: ' + color, 'info');
};

// ==================== ADMIN CONSOLE (v13.0 - BUG FIX: expiryPeriod & verifyUrlBase SAVE CORRECTLY) ====================
async function renderAdmin() {
  hideAIWidget();
  if (!currentUser || currentUser.role !== 'admin') { renderPage('dashboard'); showToast('Admin access required', 'error'); return; }
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="text-center py-20"><div class="thinking-dots"><span></span><span></span><span></span></div><p class="mt-4">Loading admin panel...</p></div>';
  
  let stats = { totalStudents: 0, totalCourses: 0, totalRevenue: 0, pendingCertificates: 0, activeVouchers: 0, totalEnrollments: 0, totalPayments: 0 };
  let vouchers = []; let pending = []; let users = []; let courses = []; let financeData = { thisMonth: 0, lastMonth: 0, total: 0 }; let certTemplate = null;
  
  try {
    const privData = await getMyAdminPrivileges();
    myAdminPrivileges = privData;
    if (currentUser) {
      currentUser.isMainAdmin = privData.isMainAdmin;
      currentUser.adminPrivileges = privData.privileges;
    }
  } catch(e) {}
  
  try { stats = await getAdminStats(); } catch(e) { console.error('Stats error:', e); }
  try { const vd = await getVouchers(); vouchers = vd.vouchers || []; } catch(e) { console.error('Vouchers error:', e); }
  try { const pd = await getPendingCertificates(); pending = pd.pending || []; } catch(e) { console.error('Pending error:', e); }
  try { const ud = await getAllUsers(); users = ud.users || []; } catch(e) { console.error('Users error:', e); }
  try { courses = await getCourses(); } catch(e) { console.error('Courses error:', e); courses = []; }
  try { financeData = await getFinanceData(); } catch(e) { console.error('Finance error:', e); financeData = { thisMonth: 0, lastMonth: 0, total: 0 }; }
  
  try {
    const t = await getCertificateTemplate();
    certTemplate = t.template;
    if (certTemplate && certTemplate.customTexts && certTemplate.customTexts.length > 0) {
      customTextFields = [...certTemplate.customTexts];
    } else {
      customTextFields = [];
    }
  } catch(e) {
    certTemplate = {
      templateImage: '/images/certificate-template.png', signatureImage: '',
      expiryPeriod: 'never', verifyUrlBase: '',
      customTexts: [],
      positions: { nameX: 800, nameY: 455, courseX: 800, courseY: 620, dateX: 470, dateY: 885, expiryDateX: 470, expiryDateY: 920, certIdX: 1180, certIdY: 885, verifyUrlX: 1180, verifyUrlY: 920, signatureX: 800, signatureY: 980, signatureScale: 1.0 },
      styles: { nameFontSize: 52, nameFontColor: '#1a1a1a', courseFontSize: 36, courseFontColor: '#1a1a1a', dateFontSize: 28, dateFontColor: '#1a1a1a', expiryDateFontSize: 24, expiryDateFontColor: '#1a1a1a', certIdFontSize: 28, certIdFontColor: '#1a1a1a', verifyUrlFontSize: 20, verifyUrlFontColor: '#1a1a1a', fontFamily: 'Georgia' }
    };
    customTextFields = [];
  }
  
  window._adminCoursesData = courses;
  window._certTemplate = certTemplate;
  
  const isMain = !!(currentUser.isMainAdmin === true);
  const priv = currentUser.adminPrivileges || {};
  const canManageCourses = isMain || priv.manageCourses === true;
  const canManageVouchers = isMain || priv.manageVouchers === true;
  const canManageUsers = isMain || priv.manageUsers === true;
  const canManageAdmins = isMain || priv.manageAdmins === true;
  const canApproveCerts = isMain || priv.approveCertificates === true;
  const canViewFinance = isMain || priv.viewFinance === true;

  function renderAdminContent() {
    var currentCourses = window._adminCoursesData || courses;
    var ct = window._certTemplate || certTemplate;
    var pos = ct.positions || {};
    var sty = ct.styles || {};
    var sigImg = ct.signatureImage || '';
    var hasSignature = !!(sigImg && sigImg.length > 10);
    var expPeriod = ct.expiryPeriod || 'never';
    var vrfBase = ct.verifyUrlBase || 'oblixelacademy.com/verify/';
    
    var html = '';
    html += '<div class="max-w-7xl mx-auto fade-in">';
    
    // Header
    html += '<div class="flex justify-between items-center mb-6 flex-wrap gap-3"><div><button onclick="window.renderPage(\'dashboard\')" class="text-gray-400 hover:text-white mb-2 text-sm"><i class="fa-solid fa-arrow-left mr-1"></i> Back</button><h1 class="text-3xl sm:text-5xl font-black text-purple-400">' + (isMain ? '👑 ' : '') + 'Admin Console</h1>' + (isMain ? '<span class="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full ml-2">Main Admin</span>' : '<span class="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full ml-2">Admin</span>') + '</div>';
    
    html += '<div class="flex gap-2">';
    if (isMain || canManageAdmins) {
      html += '<button id="quickAddAdminBtn" class="bg-yellow-600/50 hover:bg-yellow-600 px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fa-solid fa-crown mr-1"></i> Add Admin</button>';
    }
    if (isMain) {
      html += '<div class="relative">';
      html += '<button id="systemControlsBtn" class="bg-red-600/30 hover:bg-red-600/50 px-4 py-2 rounded-xl text-sm font-bold transition border border-red-500/30"><i class="fa-solid fa-triangle-exclamation mr-1"></i> System Controls</button>';
      html += '<div id="systemControlsDropdown" class="hidden absolute right-0 mt-2 w-72 glass rounded-2xl p-4 z-50 shadow-2xl border border-white/10">';
      html += '<p class="text-xs text-gray-400 mb-3 font-bold">⚠️ Dangerous Actions</p>';
      html += '<button onclick="window.showResetRevenueModal()" class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-sm transition mb-1"><i class="fa-solid fa-dollar-sign mr-2"></i> Reset Revenue</button>';
      html += '<button onclick="window.showResetEnrollmentsModal()" class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-sm transition mb-1"><i class="fa-solid fa-users-slash mr-2"></i> Reset Enrollments</button>';
      html += '<button onclick="window.showResetCertificatesModal()" class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-sm transition"><i class="fa-solid fa-certificate mr-2"></i> Reset Certificates</button>';
      html += '</div></div>';
    }
    html += '</div></div>';
    
    // Stats
    html += '<div class="stats-grid mb-8">';
    html += '<div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-users text-cyan-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-cyan-400">' + (stats.totalStudents || 0) + '</h3><p class="text-xs">Students</p></div>';
    html += '<div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-book-open text-green-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-green-400">' + (stats.totalCourses || currentCourses.length) + '</h3><p class="text-xs">Courses</p></div>';
    if (canViewFinance) {
      html += '<div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-dollar-sign text-yellow-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-yellow-400">$' + formatMoney(financeData.total || stats.totalRevenue || 0) + '</h3><p class="text-xs">Revenue</p></div>';
    }
    html += '<div class="glass rounded-2xl p-4 text-center"><i class="fa-solid fa-clock text-purple-400 text-3xl mb-2"></i><h3 class="text-2xl font-black text-purple-400">' + pending.length + '</h3><p class="text-xs">Pending</p></div>';
    html += '</div>';
    
    // Quick Action Panels
    html += '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">';
    if (canManageCourses) {
      html += '<div class="relative"><button id="qaAddCourse" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition w-full"><i class="fa-solid fa-plus-circle text-green-400 text-2xl"></i><p class="text-xs mt-1">Add Course</p></button><div id="qaAddCourseInfo" class="hidden absolute top-full left-0 mt-1 w-48 glass rounded-xl p-3 z-40 border border-white/10 text-xs"><p class="text-gray-400">' + currentCourses.length + ' courses active</p><button onclick="showAddCourseModal()" class="mt-1 text-green-400 hover:underline">+ Add New Course</button></div></div>';
    }
    if (canManageVouchers) {
      html += '<div class="relative"><button id="qaVoucher" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition w-full"><i class="fa-solid fa-ticket text-purple-400 text-2xl"></i><p class="text-xs mt-1">Vouchers</p></button><div id="qaVoucherInfo" class="hidden absolute top-full left-0 mt-1 w-48 glass rounded-xl p-3 z-40 border border-white/10 text-xs"><p class="text-gray-400">' + vouchers.length + ' vouchers active</p><button onclick="showCreateVoucherModal()" class="mt-1 text-purple-400 hover:underline">+ Create Voucher</button></div></div>';
    }
    if (canManageUsers) {
      html += '<div class="relative"><button id="qaUsers" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition w-full"><i class="fa-solid fa-users-gear text-cyan-400 text-2xl"></i><p class="text-xs mt-1">Users</p></button><div id="qaUsersInfo" class="hidden absolute top-full left-0 mt-1 w-48 glass rounded-xl p-3 z-40 border border-white/10 text-xs"><p class="text-gray-400">' + users.length + ' users total</p></div></div>';
    }
    if (isMain || canManageAdmins) {
      html += '<div class="relative"><button id="qaAddAdmin" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition w-full"><i class="fa-solid fa-crown text-yellow-400 text-2xl"></i><p class="text-xs mt-1">Add Admin</p></button><div id="qaAddAdminInfo" class="hidden absolute top-full left-0 mt-1 w-48 glass rounded-xl p-3 z-40 border border-white/10 text-xs"><p class="text-gray-400">Manage admin team</p><button onclick="showAddAdminModal()" class="mt-1 text-yellow-400 hover:underline">+ Add Admin</button></div></div>';
    }
    if (canApproveCerts) {
      html += '<div class="relative"><button id="qaApprove" class="glass rounded-xl p-3 text-center hover:bg-white/10 transition w-full"><i class="fa-solid fa-certificate text-yellow-400 text-2xl"></i><p class="text-xs mt-1">Approve</p></button><div id="qaApproveInfo" class="hidden absolute top-full left-0 mt-1 w-48 glass rounded-xl p-3 z-40 border border-white/10 text-xs"><p class="text-gray-400">' + pending.length + ' pending certificates</p></div></div>';
    }
    html += '</div>';

    // Course Management Table
    if (canManageCourses) {
      html += '<div class="glass rounded-3xl p-6 mb-8"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold"><i class="fa-solid fa-book text-purple-400 mr-2"></i> Course Management</h2><div class="flex gap-2"><button id="saveCourseOrderBtn" class="bg-green-600/50 hover:bg-green-600 px-4 py-1.5 rounded-xl text-sm transition"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Order</button><button id="addCourseTableBtn" class="bg-green-600/50 hover:bg-green-600 px-4 py-1.5 rounded-xl text-sm transition">+ Add Course</button></div></div><p class="text-xs text-gray-500 mb-2">Drag rows to reorder courses, then click Save Order.</p><div class="overflow-x-auto"><table class="w-full admin-table" id="adminCourseTable"><thead><tr class="border-b border-white/10"><th class="text-left py-3 w-8"></th><th class="text-left">Course</th><th class="text-left">Fee $</th><th class="text-left">Students</th><th class="text-left">Actions</th></tr></thead><tbody id="adminCourseTableBody">';
      for (var i = 0; i < currentCourses.length; i++) {
        var c = currentCourses[i]; var cp = c.price || c.examPrice || 0;
        html += '<tr class="border-b border-white/10 hover:bg-white/5 course-drag-row" draggable="true" data-course-id="' + c.id + '" data-display-order="' + i + '"><td class="py-3"><span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span></td><td class="py-3"><div class="flex items-center gap-2"><i class="fa-solid ' + (c.icon || 'fa-certificate') + ' text-purple-400"></i><span class="font-medium">' + escapeHtml(c.name) + '</span></div></td><td>$' + cp + '</td><td>' + (c.enrolledCount || 0) + '</td><td class="space-x-2"><button onclick="window.showEditCourseModal(\'' + c.id + '\')" class="text-cyan-400 hover:text-cyan-300"><i class="fa-solid fa-pen"></i></button><button onclick="window.showDeleteCourseModal(\'' + c.id + '\', \'' + escapeHtml(c.name).replace(/'/g, "\\'") + '\')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button><button onclick="window.showManageVideosModal(\'' + c.id + '\')" class="text-yellow-400 hover:text-yellow-300"><i class="fa-solid fa-video"></i></button></td></tr>';
      }
      html += '</tbody></table></div></div>';
    }

    // ========== v13.0 CERTIFICATE SETTINGS - TWO COLUMN LAYOUT - BUG FIXED SAVE ==========
    if (canManageCourses) {
      html += '<div class="glass rounded-3xl p-6 mb-8" style="border: 1px solid rgba(139, 92, 246, 0.3);">';
      html += '<h2 class="text-xl font-bold mb-4"><i class="fa-solid fa-certificate text-purple-400 mr-2"></i> 🎓 Certificate Settings</h2>';
      
      html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
      
      // ===== LEFT COLUMN =====
      html += '<div>';
      
      // Template Image
      html += '<h3 class="font-semibold mb-2 text-purple-400">🖼️ Template Image</h3>';
      html += '<div class="mb-3 p-4 bg-purple-600/10 rounded-xl border border-purple-500/20 text-center">';
      html += '<img id="certTemplatePreview" src="' + escapeHtml(ct.templateImage || '/images/certificate-template.png') + '" alt="Template Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin: 0 auto;" onerror="this.style.display=\'none\'">';
      html += '<p id="certTemplateName" class="text-xs text-gray-400 mt-2">' + (ct.templateImage || 'No template selected') + '</p></div>';
      html += '<div class="flex gap-2 mb-3"><label for="certFileInput" class="flex-1 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm font-bold text-center cursor-pointer transition"><i class="fa-solid fa-folder-open mr-1"></i> Choose from Gallery</label><input type="file" id="certFileInput" accept="image/*" style="display:none;" onchange="window.handleCertFileSelect(event)"><button onclick="window.deleteCertificateTemplate()" class="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fa-solid fa-trash mr-1"></i> Remove</button></div>';
      html += '<div class="relative mb-4"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">or URL:</span><input type="text" id="certTemplateImage" value="' + escapeHtml(ct.templateImage || '/images/certificate-template.png') + '" class="w-full bg-transparent border border-white/20 rounded-xl pl-16 pr-4 py-2 text-sm focus:border-purple-400 transition" autocomplete="off"></div>';
      html += '<div id="certUploadStatus" class="hidden text-xs mt-2 p-2 rounded-lg"></div>';
      
      // Live Canvas Preview
      html += '<h3 class="font-semibold mt-4 mb-2 text-purple-400">🖼️ Live Preview <span class="text-xs text-gray-500 font-normal">(Click & Drag Elements)</span></h3>';
      html += '<div class="canvas-wrapper mb-4" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);"><canvas id="certPreviewCanvas" width="1600" height="1131" style="max-width: 100%; height: auto; cursor: default; border-radius: 8px;"></canvas></div>';
      html += '<p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-hand-pointer mr-1"></i> <strong>Click and drag</strong> any element directly on the canvas. Sliders update in real-time.</p>';
      
      // Signature Pad
      html += '<h3 class="font-semibold mt-4 mb-2 text-purple-400">✍️ Official Signature</h3>';
      html += '<div class="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 mb-4"><div class="flex items-center gap-3 mb-3"><div class="w-16 h-16 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden" style="min-width: 64px;">';
      if (hasSignature) { html += '<img id="signaturePreviewImg" src="' + sigImg + '" alt="Signature" style="max-width: 100%; max-height: 100%; object-fit: contain;"><span id="signaturePlaceholder" style="display:none;"><i class="fa-solid fa-signature text-2xl text-gray-400"></i></span>'; }
      else { html += '<img id="signaturePreviewImg" src="" alt="Signature" style="display:none; max-width: 100%; max-height: 100%; object-fit: contain;"><span id="signaturePlaceholder"><i class="fa-solid fa-signature text-2xl text-gray-400"></i></span>'; }
      html += '</div><div><p class="text-sm font-medium">' + (hasSignature ? 'Signature Ready' : 'No Signature Yet') + '</p><p class="text-xs text-gray-400">' + (hasSignature ? 'Drag on canvas to position' : 'Click below to draw') + '</p></div></div>';
      html += '<div class="flex gap-2"><button onclick="window.openSignaturePadModal()" class="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> ' + (hasSignature ? 'Redraw Signature' : 'Draw Signature') + '</button>';
      if (hasSignature) { html += '<button onclick="window.clearSavedSignature()" class="bg-red-600/50 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fa-solid fa-trash"></i></button>'; }
      html += '</div></div>';
      
      // Test Data
      html += '<h3 class="font-semibold mt-4 mb-2 text-purple-400">📝 Test Data</h3><div class="space-y-2">';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Student Name</label><input type="text" id="testStudentName" value="John Doe" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:border-purple-400 transition" autocomplete="off"></div>';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Course Name</label><input type="text" id="testCourseName" value="Computer Certified Professional (CCP)" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:border-purple-400 transition" autocomplete="off"></div>';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Issue Date</label><input type="text" id="testIssueDate" value="24 June 2026" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:border-purple-400 transition" autocomplete="off"></div>';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Certificate ID</label><input type="text" id="testCertId" value="OBX-CCP-TEST123" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:border-purple-400 transition" autocomplete="off"></div>';
      html += '</div>';
      
      html += '</div>'; // END LEFT COLUMN
      
      // ===== RIGHT COLUMN =====
      html += '<div>';
      
      // Position Sliders
      html += '<h3 class="font-semibold mb-2 text-cyan-400">📍 Positions (Drag or Slide)</h3>';
      html += '<div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">';
      
      // Name Position
      html += '<div class="glass rounded-xl p-3 border border-white/5"><p class="text-xs font-medium text-purple-400 mb-2">Student Name</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posNameXVal">' + (pos.nameX || 800) + '</span></label><input type="range" id="posNameX" min="0" max="1600" value="' + (pos.nameX || 800) + '" class="w-full" oninput="document.getElementById(\'posNameXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posNameYVal">' + (pos.nameY || 455) + '</span></label><input type="range" id="posNameY" min="0" max="1131" value="' + (pos.nameY || 455) + '" class="w-full" oninput="document.getElementById(\'posNameYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div></div>';
      
      // Course Position
      html += '<div class="glass rounded-xl p-3 border border-white/5"><p class="text-xs font-medium text-cyan-400 mb-2">Course Name</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posCourseXVal">' + (pos.courseX || 800) + '</span></label><input type="range" id="posCourseX" min="0" max="1600" value="' + (pos.courseX || 800) + '" class="w-full" oninput="document.getElementById(\'posCourseXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posCourseYVal">' + (pos.courseY || 620) + '</span></label><input type="range" id="posCourseY" min="0" max="1131" value="' + (pos.courseY || 620) + '" class="w-full" oninput="document.getElementById(\'posCourseYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div></div>';
      
      // Date Position
      html += '<div class="glass rounded-xl p-3 border border-white/5"><p class="text-xs font-medium text-green-400 mb-2">Issue Date</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posDateXVal">' + (pos.dateX || 470) + '</span></label><input type="range" id="posDateX" min="0" max="1600" value="' + (pos.dateX || 470) + '" class="w-full" oninput="document.getElementById(\'posDateXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posDateYVal">' + (pos.dateY || 885) + '</span></label><input type="range" id="posDateY" min="0" max="1131" value="' + (pos.dateY || 885) + '" class="w-full" oninput="document.getElementById(\'posDateYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div></div>';
      
      // Cert ID Position
      html += '<div class="glass rounded-xl p-3 border border-white/5"><p class="text-xs font-medium text-yellow-400 mb-2">Certificate ID</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posCertIdXVal">' + (pos.certIdX || 1180) + '</span></label><input type="range" id="posCertIdX" min="0" max="1600" value="' + (pos.certIdX || 1180) + '" class="w-full" oninput="document.getElementById(\'posCertIdXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posCertIdYVal">' + (pos.certIdY || 885) + '</span></label><input type="range" id="posCertIdY" min="0" max="1131" value="' + (pos.certIdY || 885) + '" class="w-full" oninput="document.getElementById(\'posCertIdYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div></div>';
      
      // Signature Position
      html += '<div class="glass rounded-xl p-3 border border-amber-500/20"><p class="text-xs font-medium text-amber-400 mb-2">✍️ Signature</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posSignatureXVal">' + (pos.signatureX || 800) + '</span></label><input type="range" id="posSignatureX" min="0" max="1600" value="' + (pos.signatureX || 800) + '" class="w-full" oninput="document.getElementById(\'posSignatureXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posSignatureYVal">' + (pos.signatureY || 980) + '</span></label><input type="range" id="posSignatureY" min="0" max="1131" value="' + (pos.signatureY || 980) + '" class="w-full" oninput="document.getElementById(\'posSignatureYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div>';
      html += '<div class="mt-2"><label class="text-xs text-gray-500">Scale: <span id="posSignatureScaleVal">' + (pos.signatureScale || 1.0) + '</span></label><input type="range" id="posSignatureScale" min="0.1" max="3.0" step="0.1" value="' + (pos.signatureScale || 1.0) + '" class="w-full" oninput="document.getElementById(\'posSignatureScaleVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div>';
      
      html += '</div>'; // End position sliders scrollable area
      
      // ===== FULL FONT SETTINGS FOR ALL ELEMENTS =====
      html += '<h3 class="font-semibold mt-4 mb-2 text-pink-400">🎨 Font Settings</h3>';
      html += '<div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">';
      
      // Font Family
      html += '<div class="glass rounded-xl p-3 border border-white/5"><div><label class="block text-xs text-gray-400 mb-1">Font Family</label><select id="fontFamily" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-1.5 text-sm"><option value="Georgia"' + (sty.fontFamily === 'Georgia' ? ' selected' : '') + '>Georgia</option><option value="Times New Roman"' + (sty.fontFamily === 'Times New Roman' ? ' selected' : '') + '>Times New Roman</option><option value="Arial"' + (sty.fontFamily === 'Arial' ? ' selected' : '') + '>Arial</option><option value="Playfair Display"' + (sty.fontFamily === 'Playfair Display' ? ' selected' : '') + '>Playfair Display</option><option value="Montserrat"' + (sty.fontFamily === 'Montserrat' ? ' selected' : '') + '>Montserrat</option></select></div></div>';
      
      // Student Name Font
      html += '<div class="glass rounded-xl p-3 border border-purple-500/20"><p class="text-xs font-medium text-purple-400 mb-2">📛 Student Name</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">Size: <span id="fontNameSizeVal">' + (sty.nameFontSize || 52) + 'px</span></label><input type="range" id="fontNameSize" min="20" max="100" value="' + (sty.nameFontSize || 52) + '" class="w-full" oninput="document.getElementById(\'fontNameSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Color</label><div class="flex gap-1"><input type="color" id="fontNameColor" value="' + escapeHtml(sty.nameFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontNameColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontNameColorText" value="' + escapeHtml(sty.nameFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontNameColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div></div>';
      
      // Course Name Font
      html += '<div class="glass rounded-xl p-3 border border-cyan-500/20"><p class="text-xs font-medium text-cyan-400 mb-2">📚 Course Name</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">Size: <span id="fontCourseSizeVal">' + (sty.courseFontSize || 36) + 'px</span></label><input type="range" id="fontCourseSize" min="16" max="80" value="' + (sty.courseFontSize || 36) + '" class="w-full" oninput="document.getElementById(\'fontCourseSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Color</label><div class="flex gap-1"><input type="color" id="fontCourseColor" value="' + escapeHtml(sty.courseFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontCourseColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontCourseColorText" value="' + escapeHtml(sty.courseFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontCourseColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div></div>';
      
      // Issue Date Font
      html += '<div class="glass rounded-xl p-3 border border-green-500/20"><p class="text-xs font-medium text-green-400 mb-2">📅 Issue Date</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">Size: <span id="fontDateSizeVal">' + (sty.dateFontSize || 28) + 'px</span></label><input type="range" id="fontDateSize" min="12" max="60" value="' + (sty.dateFontSize || 28) + '" class="w-full" oninput="document.getElementById(\'fontDateSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Color</label><div class="flex gap-1"><input type="color" id="fontDateColor" value="' + escapeHtml(sty.dateFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontDateColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontDateColorText" value="' + escapeHtml(sty.dateFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontDateColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div></div>';
      
      // Cert ID Font
      html += '<div class="glass rounded-xl p-3 border border-yellow-500/20"><p class="text-xs font-medium text-yellow-400 mb-2">🏷️ Certificate ID</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">Size: <span id="fontCertIdSizeVal">' + (sty.certIdFontSize || 28) + 'px</span></label><input type="range" id="fontCertIdSize" min="12" max="60" value="' + (sty.certIdFontSize || 28) + '" class="w-full" oninput="document.getElementById(\'fontCertIdSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Color</label><div class="flex gap-1"><input type="color" id="fontCertIdColor" value="' + escapeHtml(sty.certIdFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontCertIdColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontCertIdColorText" value="' + escapeHtml(sty.certIdFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontCertIdColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div></div>';
      
      html += '</div>'; // End font settings scrollable area
      
      // Color Presets
      html += '<div class="flex flex-wrap gap-2 mt-3">';
      var presets = [{ name: 'GOLD', color: '#D4AF37' }, { name: 'SILVER', color: '#C0C0C0' }, { name: 'NAVY', color: '#1B2A4A' }, { name: 'BLACK', color: '#1A1A1A' }];
      for (var pidx = 0; pidx < presets.length; pidx++) { var preset = presets[pidx]; html += '<button onclick="window.applyColorPreset(\'' + preset.color + '\')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition border-2 border-white/10 hover:scale-105" style="background:' + preset.color + '; color:' + (preset.color === '#FFFFFF' || preset.color === '#C0C0C0' ? '#1a1a1a' : '#ffffff') + ';">' + preset.name + '</button>'; }
      html += '</div>';
      
      // ===== EXPIRY DATE SECTION - AUTO-CALCULATE, CLEAN DATE (NO PREFIX) =====
      html += '<div class="glass rounded-xl p-4 mt-4 border border-yellow-500/20">';
      html += '<h3 class="font-semibold mb-3 text-yellow-400">📅 Expiry Date <span class="text-xs text-yellow-500/70 font-normal">(Auto-Calculated)</span></h3>';
      html += '<div class="mb-3"><label class="block text-xs text-gray-400 mb-1">Expiry Period</label><select id="expiryPeriod" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-2 text-sm" onchange="redrawCertPreviewCanvas();"><option value="never"' + (expPeriod === 'never' ? ' selected' : '') + '>Never Expires</option><option value="1year"' + (expPeriod === '1year' ? ' selected' : '') + '>1 Year</option><option value="2years"' + (expPeriod === '2years' ? ' selected' : '') + '>2 Years</option><option value="3years"' + (expPeriod === '3years' ? ' selected' : '') + '>3 Years</option></select></div>';
      html += '<div class="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10 mb-3"><p class="text-xs text-gray-400 mb-1">📐 Auto-Calculated Preview:</p><p id="expiryAutoPreview" class="text-sm text-green-400 font-semibold"></p><p class="text-xs text-gray-500 mt-1">(Issue Date + Selected Period = Expiry Date)</p></div>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posExpiryDateXVal">' + (pos.expiryDateX || 470) + '</span></label><input type="range" id="posExpiryDateX" min="0" max="1600" value="' + (pos.expiryDateX || 470) + '" class="w-full" oninput="document.getElementById(\'posExpiryDateXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posExpiryDateYVal">' + (pos.expiryDateY || 920) + '</span></label><input type="range" id="posExpiryDateY" min="0" max="1131" value="' + (pos.expiryDateY || 920) + '" class="w-full" oninput="document.getElementById(\'posExpiryDateYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div>';
      html += '<div class="grid grid-cols-2 gap-2 mt-2"><div><label class="block text-xs text-gray-400 mb-1">Font Size: <span id="fontExpiryDateSizeVal">' + (sty.expiryDateFontSize || 24) + 'px</span></label><input type="range" id="fontExpiryDateSize" min="12" max="60" value="' + (sty.expiryDateFontSize || 24) + '" class="w-full" oninput="document.getElementById(\'fontExpiryDateSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Color</label><div class="flex gap-1"><input type="color" id="fontExpiryDateColor" value="' + escapeHtml(sty.expiryDateFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontExpiryDateColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontExpiryDateColorText" value="' + escapeHtml(sty.expiryDateFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontExpiryDateColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div>';
      html += '</div>';
      
      // ===== VERIFY URL SECTION =====
      html += '<div class="glass rounded-xl p-4 mt-4 border border-cyan-500/20">';
      html += '<h3 class="font-semibold mb-3 text-cyan-400">🔗 Verify At URL</h3>';
      html += '<div class="mb-3"><label class="block text-xs text-gray-400 mb-1">Base URL</label><input type="text" id="verifyUrlBase" value="' + escapeHtml(vrfBase) + '" placeholder="e.g., oblixelacademy.com/verify/" class="w-full bg-transparent border border-white/20 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off" oninput="redrawCertPreviewCanvas();"></div>';
      html += '<p class="text-xs text-gray-500 mb-2"><i class="fa-solid fa-circle-info mr-1"></i> Certificate ID auto-appended: <span class="text-cyan-400" style="word-break: break-all;">' + escapeHtml(vrfBase) + '<strong>OBX-CCP-TEST123</strong></span></p>';
      html += '<p class="text-xs text-gray-500 mb-3"><i class="fa-solid fa-globe mr-1"></i> Anyone with this URL can verify the certificate — no login required.</p>';
      html += '<div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">X: <span id="posVerifyUrlXVal">' + (pos.verifyUrlX || 1180) + '</span></label><input type="range" id="posVerifyUrlX" min="0" max="1600" value="' + (pos.verifyUrlX || 1180) + '" class="w-full" oninput="document.getElementById(\'posVerifyUrlXVal\').textContent=this.value;redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="text-xs text-gray-500">Y: <span id="posVerifyUrlYVal">' + (pos.verifyUrlY || 920) + '</span></label><input type="range" id="posVerifyUrlY" min="0" max="1131" value="' + (pos.verifyUrlY || 920) + '" class="w-full" oninput="document.getElementById(\'posVerifyUrlYVal\').textContent=this.value;redrawCertPreviewCanvas();"></div></div>';
      html += '<div class="grid grid-cols-2 gap-2 mt-2"><div><label class="block text-xs text-gray-400 mb-1">Font Size: <span id="fontVerifyUrlSizeVal">' + (sty.verifyUrlFontSize || 20) + 'px</span></label><input type="range" id="fontVerifyUrlSize" min="10" max="50" value="' + (sty.verifyUrlFontSize || 20) + '" class="w-full" oninput="document.getElementById(\'fontVerifyUrlSizeVal\').textContent = this.value + \'px\'; redrawCertPreviewCanvas();"></div>';
      html += '<div><label class="block text-xs text-gray-400 mb-1">Color</label><div class="flex gap-1"><input type="color" id="fontVerifyUrlColor" value="' + escapeHtml(sty.verifyUrlFontColor || '#1a1a1a') + '" class="w-8 h-8 rounded-lg border-0 cursor-pointer" oninput="document.getElementById(\'fontVerifyUrlColorText\').value = this.value; redrawCertPreviewCanvas();"><input type="text" id="fontVerifyUrlColorText" value="' + escapeHtml(sty.verifyUrlFontColor || '#1a1a1a') + '" class="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs" oninput="document.getElementById(\'fontVerifyUrlColor\').value = this.value; redrawCertPreviewCanvas();"></div></div></div>';
      html += '</div>';
      
      // ===== CUSTOM TEXT FIELDS SECTION =====
      html += '<div class="glass rounded-xl p-4 mt-4 border border-green-500/20">';
      html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-green-400">📝 Custom Text Fields</h3><button onclick="window.addCustomTextField()" class="bg-green-600/50 hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa-solid fa-plus mr-1"></i> Add Custom Text Field</button></div>';
      html += '<div id="customTextFieldsContainer" class="max-h-[400px] overflow-y-auto pr-1"></div>';
      html += '</div>';
      
      html += '</div>'; // END RIGHT COLUMN
      
      html += '</div>'; // END TWO COLUMN GRID
      
      // Bottom Buttons
      html += '<div class="flex gap-3 mt-6 pt-4 border-t border-white/10">';
      html += '<button id="saveCertSettingsBtn" class="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl text-sm font-bold transition flex-1"><i class="fa-solid fa-floppy-disk mr-1"></i> Save All Settings</button>';
      html += '<button id="testCertPreviewBtn" class="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl text-sm font-bold transition flex-1"><i class="fa-solid fa-eye mr-1"></i> Test Full Preview</button>';
      html += '</div>';
      
      html += '</div>'; // End certificate settings glass container
    }

    // Vouchers
    if (canManageVouchers) {
      html += '<div class="glass rounded-3xl p-6 mb-8"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold"><i class="fa-solid fa-ticket text-purple-400 mr-2"></i> Vouchers</h2><div class="flex gap-2"><button id="createVoucherTableBtn" class="bg-purple-600/50 hover:bg-purple-600 px-4 py-1.5 rounded-xl text-sm">+ Create</button><button id="batchVoucherBtn" class="bg-blue-600/50 hover:bg-blue-600 px-4 py-1.5 rounded-xl text-sm">📦 Batch</button></div></div><div class="overflow-x-auto"><table class="w-full admin-table"><thead><tr class="border-b border-white/10"><th class="text-left py-3">Code</th><th class="text-left">Discount</th><th class="text-left">Course</th><th class="text-left">Used/Max</th><th class="text-left">Expires</th><th class="text-left">Actions</th></tr></thead><tbody>';
      if (vouchers.length > 0) { for (var j = 0; j < vouchers.length; j++) { var v = vouchers[j]; html += '<tr class="border-b border-white/10 hover:bg-white/5"><td class="py-3"><span class="font-mono text-cyan-400">' + escapeHtml(v.code) + '</span><button onclick="window.copyToClipboard(\'' + v.code + '\')" class="ml-2 text-gray-400 hover:text-cyan-400"><i class="fa-regular fa-copy"></i></button></td><td>' + (v.discountType === 'free' ? '🎁 FREE' : v.discountValue + (v.discountType === 'percentage' ? '% off' : '$ off')) + '</td><td>' + (v.courseId === 'all' ? 'All Courses' : (currentCourses.find(function(c2){return c2.id===v.courseId;})?.name||v.courseId)) + '</td><td>' + (v.usedCount||0) + '/' + (v.maxUses||1) + '</td><td>' + (v.expiresAt?new Date(v.expiresAt).toLocaleDateString():'Never') + '</td><td><button onclick="window.deleteVoucherItem(\'' + v._id + '\')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button></td></tr>'; } }
      else { html += '<tr><td colspan="6" class="text-center py-8 text-gray-400">No vouchers yet.</td></tr>'; }
      html += '</tbody></table></div></div>';
    }

    // Pending Certificates
    if (canApproveCerts) {
      html += '<div class="glass rounded-3xl p-6 mb-8"><h2 class="text-xl font-bold mb-4"><i class="fa-solid fa-clock text-yellow-400 mr-2"></i> Pending Certificates (' + pending.length + ')</h2><div class="space-y-3">';
      if (pending.length > 0) { for (var k = 0; k < pending.length; k++) { var p = pending[k]; html += '<div class="flex justify-between items-center glass rounded-xl p-4 flex-wrap gap-3"><div><p class="font-medium">' + escapeHtml(p.userName||p.userEmail) + '</p><p class="text-sm text-gray-400">' + escapeHtml(p.courseName) + ' • Score: ' + p.score + '% • Code: ' + (p.certificateId||'N/A') + '</p></div><div class="flex gap-2"><button onclick="window.approveCertificateItem(\'' + p.id + '\')" class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm">✅ Approve</button><button onclick="window.rejectCertificateItem(\'' + p.id + '\')" class="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm">❌ Reject</button></div></div>'; } }
      else { html += '<div class="text-center py-8 text-gray-400">✅ No pending certificates</div>'; }
      html += '</div></div>';
    }

    // User Management
    if (canManageUsers) {
      html += '<div class="glass rounded-3xl p-6 mb-8"><h2 class="text-xl font-bold mb-4"><i class="fa-solid fa-users-gear text-cyan-400 mr-2"></i> User Management</h2><div class="overflow-x-auto"><table class="w-full admin-table"><thead><tr class="border-b border-white/10"><th class="text-left py-3">User</th><th class="text-left">Role</th><th class="text-left">Courses</th><th class="text-left">Spent</th><th class="text-left">Actions</th></tr></thead><tbody>';
      if (users.length > 0) {
        for (var m = 0; m < users.length; m++) {
          var u = users[m];
          var isAdminUser = u.role === 'admin';
          var isMainAdminUser = u.isMainAdmin === true;
          var roleBadge = '';
          if (isMainAdminUser) { roleBadge = '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">👑 Main Admin</span>'; }
          else if (isAdminUser) { roleBadge = '<span class="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">Admin</span>'; }
          else { roleBadge = '<span class="px-2 py-1 rounded-full text-xs bg-gray-500/20">Student</span>'; }
          
          var actionsHtml = '';
          if (!isMainAdminUser && isAdminUser && (isMain || canManageAdmins)) {
            actionsHtml += '<button onclick="window.showEditAdminPrivilegesModal(\'' + u.id + '\', \'' + escapeHtml(u.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(u.email).replace(/'/g, "\\'") + '\')" class="text-yellow-400 hover:text-yellow-300 text-xs"><i class="fa-solid fa-gear"></i> Edit</button>';
          }
          if (!isMainAdminUser && isAdminUser && isMain) {
            actionsHtml += '<button onclick="window.showRemoveAdminModal(\'' + u.id + '\', \'' + escapeHtml(u.name).replace(/'/g, "\\'") + '\')" class="text-red-400 hover:text-red-300 ml-2 text-xs"><i class="fa-solid fa-user-slash"></i> Remove Admin</button>';
          }
          if (!isAdminUser && !isMainAdminUser && (isMain || canManageAdmins)) {
            actionsHtml += '<button onclick="window.showMakeAdminModal(\'' + u.id + '\', \'' + escapeHtml(u.name).replace(/'/g, "\\'") + '\')" class="text-yellow-400 hover:text-yellow-300 text-xs"><i class="fa-solid fa-crown"></i> Make Admin</button>';
          }
          if (u.email !== currentUser.email && !isMainAdminUser) {
            actionsHtml += '<button onclick="window.showDeleteUserModal(\'' + u.id + '\', \'' + escapeHtml(u.name).replace(/'/g, "\\'") + '\')" class="text-red-400 hover:text-red-300 ml-2 text-xs"><i class="fa-solid fa-trash"></i></button>';
          }
          
          html += '<tr class="border-b border-white/10 hover:bg-white/5"><td class="py-3"><div><p class="font-medium">' + escapeHtml(u.name) + '</p><p class="text-xs text-gray-400">' + escapeHtml(u.email) + '</p></div></td><td>' + roleBadge + '</td><td>' + (u.enrolledCourses||0) + '</td><td>$' + formatMoney(u.totalSpent||0) + '</td><td class="space-x-1">' + (actionsHtml || '<span class="text-xs text-gray-500">-</span>') + '</td></tr>';
        }
      } else { html += '<tr><td colspan="5" class="text-center py-8 text-gray-400">No users found.</td></tr>'; }
      html += '</tbody></table></div></div>';
    }
    
    html += '</div>';
    return html;
  }

  root.innerHTML = renderAdminContent();

  setTimeout(function() {
    var sysBtn = document.getElementById('systemControlsBtn');
    var sysDropdown = document.getElementById('systemControlsDropdown');
    if (sysBtn && sysDropdown) {
      sysBtn.addEventListener('click', function(e) { e.stopPropagation(); sysDropdown.classList.toggle('hidden'); });
      document.addEventListener('click', function(e) { if (!sysDropdown.classList.contains('hidden') && !sysDropdown.contains(e.target) && e.target !== sysBtn) { sysDropdown.classList.add('hidden'); } });
    }
    
    var qaPanels = ['qaAddCourse', 'qaVoucher', 'qaUsers', 'qaAddAdmin', 'qaApprove'];
    for (var qpi = 0; qpi < qaPanels.length; qpi++) {
      (function(panelId) {
        var btn = document.getElementById(panelId);
        var info = document.getElementById(panelId + 'Info');
        if (btn && info) {
          btn.addEventListener('click', function(e) { e.stopPropagation();
            var allInfos = document.querySelectorAll('[id$="Info"]');
            for (var ai = 0; ai < allInfos.length; ai++) { if (allInfos[ai] !== info) allInfos[ai].classList.add('hidden'); }
            info.classList.toggle('hidden');
          });
        }
      })(qaPanels[qpi]);
    }
    document.addEventListener('click', function() { var allInfos = document.querySelectorAll('[id$="Info"]'); for (var ai2 = 0; ai2 < allInfos.length; ai2++) { allInfos[ai2].classList.add('hidden'); } });
    
    var qaAdminBtn = document.getElementById('quickAddAdminBtn');
    if (qaAdminBtn) { qaAdminBtn.addEventListener('click', function() { showAddAdminModal(); }); }
    
    if (canManageCourses) {
      initDragAndDrop();
      var saveBtn = document.getElementById('saveCourseOrderBtn');
      if (saveBtn) { saveBtn.addEventListener('click', async function() { var rows = document.querySelectorAll('#adminCourseTableBody .course-drag-row'); var orderData = []; rows.forEach(function(row, index) { orderData.push({ courseId: row.dataset.courseId, displayOrder: index }); }); try { await apiRequest('/admin/courses/reorder', { method: 'PUT', body: JSON.stringify({ courses: orderData }) }); showToast('Course order saved!', 'success'); await loadCourses(); window._adminCoursesData = coursesData.slice(); } catch (error) { showToast('Failed: ' + error.message, 'error'); } }); }
      
      initCertDragEngine();
      renderCustomTextFieldsList();
      redrawCertPreviewCanvas();
      
      // ===== BUG FIX: SAVE CERTIFICATE SETTINGS - expiryPeriod & verifyUrlBase NOW SAVE CORRECTLY =====
      var saveCertBtn = document.getElementById('saveCertSettingsBtn');
      if (saveCertBtn) { saveCertBtn.addEventListener('click', async function() {
        var imageUrl = document.getElementById('certTemplateImage')?.value || '/images/certificate-template.png';
        var positions = {
          nameX: parseInt(document.getElementById('posNameX')?.value) || 800, nameY: parseInt(document.getElementById('posNameY')?.value) || 455,
          courseX: parseInt(document.getElementById('posCourseX')?.value) || 800, courseY: parseInt(document.getElementById('posCourseY')?.value) || 620,
          dateX: parseInt(document.getElementById('posDateX')?.value) || 470, dateY: parseInt(document.getElementById('posDateY')?.value) || 885,
          expiryDateX: parseInt(document.getElementById('posExpiryDateX')?.value) || 470, expiryDateY: parseInt(document.getElementById('posExpiryDateY')?.value) || 920,
          certIdX: parseInt(document.getElementById('posCertIdX')?.value) || 1180, certIdY: parseInt(document.getElementById('posCertIdY')?.value) || 885,
          verifyUrlX: parseInt(document.getElementById('posVerifyUrlX')?.value) || 1180, verifyUrlY: parseInt(document.getElementById('posVerifyUrlY')?.value) || 920,
          signatureX: parseInt(document.getElementById('posSignatureX')?.value) || 800, signatureY: parseInt(document.getElementById('posSignatureY')?.value) || 980,
          signatureScale: parseFloat(document.getElementById('posSignatureScale')?.value) || 1.0
        };
        var styles = {
          fontFamily: document.getElementById('fontFamily')?.value || 'Georgia',
          nameFontSize: parseInt(document.getElementById('fontNameSize')?.value) || 52,
          nameFontColor: document.getElementById('fontNameColorText')?.value || document.getElementById('fontNameColor')?.value || '#1a1a1a',
          courseFontSize: parseInt(document.getElementById('fontCourseSize')?.value) || 36,
          courseFontColor: document.getElementById('fontCourseColorText')?.value || document.getElementById('fontCourseColor')?.value || '#1a1a1a',
          dateFontSize: parseInt(document.getElementById('fontDateSize')?.value) || 28,
          dateFontColor: document.getElementById('fontDateColorText')?.value || document.getElementById('fontDateColor')?.value || '#1a1a1a',
          expiryDateFontSize: parseInt(document.getElementById('fontExpiryDateSize')?.value) || 24,
          expiryDateFontColor: document.getElementById('fontExpiryDateColorText')?.value || document.getElementById('fontExpiryDateColor')?.value || '#1a1a1a',
          certIdFontSize: parseInt(document.getElementById('fontCertIdSize')?.value) || 28,
          certIdFontColor: document.getElementById('fontCertIdColorText')?.value || document.getElementById('fontCertIdColor')?.value || '#1a1a1a',
          verifyUrlFontSize: parseInt(document.getElementById('fontVerifyUrlSize')?.value) || 20,
          verifyUrlFontColor: document.getElementById('fontVerifyUrlColorText')?.value || document.getElementById('fontVerifyUrlColor')?.value || '#1a1a1a'
        };
        var signatureImage = window._certTemplate?.signatureImage || '';
        var expiryPeriod = document.getElementById('expiryPeriod')?.value || 'never';
        var verifyUrlBase = document.getElementById('verifyUrlBase')?.value || '';
        
        console.log('💾 SAVING: expiryPeriod=' + expiryPeriod + ', verifyUrlBase=' + verifyUrlBase);
        
        try {
          await updateCertificateTemplateImage(imageUrl);
          await updateCertificateTemplateSettings(positions, styles, signatureImage, expiryPeriod, verifyUrlBase, customTextFields);
          showToast('Certificate settings saved!', 'success');
          // Refresh the certTemplate in memory
          window._certTemplate.expiryPeriod = expiryPeriod;
          window._certTemplate.verifyUrlBase = verifyUrlBase;
        } catch (error) { showToast('Failed: ' + error.message, 'error'); }
      }); }
      
      var testBtn = document.getElementById('testCertPreviewBtn');
      if (testBtn) { testBtn.addEventListener('click', function() {
        var imageUrl = document.getElementById('certTemplateImage')?.value || '/images/certificate-template.png';
        var positions = {
          nameX: parseInt(document.getElementById('posNameX')?.value) || 800, nameY: parseInt(document.getElementById('posNameY')?.value) || 455,
          courseX: parseInt(document.getElementById('posCourseX')?.value) || 800, courseY: parseInt(document.getElementById('posCourseY')?.value) || 620,
          dateX: parseInt(document.getElementById('posDateX')?.value) || 470, dateY: parseInt(document.getElementById('posDateY')?.value) || 885,
          expiryDateX: parseInt(document.getElementById('posExpiryDateX')?.value) || 470, expiryDateY: parseInt(document.getElementById('posExpiryDateY')?.value) || 920,
          certIdX: parseInt(document.getElementById('posCertIdX')?.value) || 1180, certIdY: parseInt(document.getElementById('posCertIdY')?.value) || 885,
          verifyUrlX: parseInt(document.getElementById('posVerifyUrlX')?.value) || 1180, verifyUrlY: parseInt(document.getElementById('posVerifyUrlY')?.value) || 920,
          signatureX: parseInt(document.getElementById('posSignatureX')?.value) || 800, signatureY: parseInt(document.getElementById('posSignatureY')?.value) || 980,
          signatureScale: parseFloat(document.getElementById('posSignatureScale')?.value) || 1.0
        };
        var styles = {
          fontFamily: document.getElementById('fontFamily')?.value || 'Georgia',
          nameFontSize: parseInt(document.getElementById('fontNameSize')?.value) || 52,
          nameFontColor: document.getElementById('fontNameColorText')?.value || '#1a1a1a',
          courseFontSize: parseInt(document.getElementById('fontCourseSize')?.value) || 36,
          courseFontColor: document.getElementById('fontCourseColorText')?.value || '#1a1a1a',
          dateFontSize: parseInt(document.getElementById('fontDateSize')?.value) || 28,
          dateFontColor: document.getElementById('fontDateColorText')?.value || '#1a1a1a',
          expiryDateFontSize: parseInt(document.getElementById('fontExpiryDateSize')?.value) || 24,
          expiryDateFontColor: document.getElementById('fontExpiryDateColorText')?.value || '#1a1a1a',
          certIdFontSize: parseInt(document.getElementById('fontCertIdSize')?.value) || 28,
          certIdFontColor: document.getElementById('fontCertIdColorText')?.value || '#1a1a1a',
          verifyUrlFontSize: parseInt(document.getElementById('fontVerifyUrlSize')?.value) || 20,
          verifyUrlFontColor: document.getElementById('fontVerifyUrlColorText')?.value || '#1a1a1a'
        };
        var testData = {
          studentName: document.getElementById('testStudentName')?.value || 'John Doe',
          courseName: document.getElementById('testCourseName')?.value || 'Computer Certified Professional (CCP)',
          issueDate: document.getElementById('testIssueDate')?.value || '24 June 2026',
          certId: document.getElementById('testCertId')?.value || 'OBX-CCP-TEST123'
        };
        var sigImg = window._certTemplate?.signatureImage || '';
        var expPeriod = document.getElementById('expiryPeriod')?.value || 'never';
        var vrfBase = document.getElementById('verifyUrlBase')?.value || '';
        
        showCertPreviewModal(imageUrl, positions, styles, testData, sigImg, expPeriod, vrfBase, customTextFields);
      }); }
      
      var allInputs = document.querySelectorAll('#posNameX, #posNameY, #posCourseX, #posCourseY, #posDateX, #posDateY, #posExpiryDateX, #posExpiryDateY, #posCertIdX, #posCertIdY, #posVerifyUrlX, #posVerifyUrlY, #posSignatureX, #posSignatureY, #posSignatureScale, #fontFamily, #fontNameSize, #fontNameColor, #fontNameColorText, #fontCourseSize, #fontCourseColor, #fontCourseColorText, #fontDateSize, #fontDateColor, #fontDateColorText, #fontExpiryDateSize, #fontExpiryDateColor, #fontExpiryDateColorText, #fontCertIdSize, #fontCertIdColor, #fontCertIdColorText, #fontVerifyUrlSize, #fontVerifyUrlColor, #fontVerifyUrlColorText, #testStudentName, #testCourseName, #testIssueDate, #testCertId, #certTemplateImage, #verifyUrlBase');
      allInputs.forEach(function(input) {
        input.addEventListener('input', function() {
          if (input.id === 'fontNameColor') { var t = document.getElementById('fontNameColorText'); if (t) t.value = input.value; }
          if (input.id === 'fontNameColorText') { var c = document.getElementById('fontNameColor'); if (c) c.value = input.value; }
          if (input.id === 'fontCourseColor') { var ct = document.getElementById('fontCourseColorText'); if (ct) ct.value = input.value; }
          if (input.id === 'fontCourseColorText') { var cc = document.getElementById('fontCourseColor'); if (cc) cc.value = input.value; }
          if (input.id === 'fontDateColor') { var dt = document.getElementById('fontDateColorText'); if (dt) dt.value = input.value; }
          if (input.id === 'fontDateColorText') { var dc = document.getElementById('fontDateColor'); if (dc) dc.value = input.value; }
          if (input.id === 'fontExpiryDateColor') { var et = document.getElementById('fontExpiryDateColorText'); if (et) et.value = input.value; }
          if (input.id === 'fontExpiryDateColorText') { var ec = document.getElementById('fontExpiryDateColor'); if (ec) ec.value = input.value; }
          if (input.id === 'fontCertIdColor') { var it = document.getElementById('fontCertIdColorText'); if (it) it.value = input.value; }
          if (input.id === 'fontCertIdColorText') { var ic = document.getElementById('fontCertIdColor'); if (ic) ic.value = input.value; }
          if (input.id === 'fontVerifyUrlColor') { var vt = document.getElementById('fontVerifyUrlColorText'); if (vt) vt.value = input.value; }
          if (input.id === 'fontVerifyUrlColorText') { var vc = document.getElementById('fontVerifyUrlColor'); if (vc) vc.value = input.value; }
          if (input.id === 'certTemplateImage') { var p = document.getElementById('certTemplatePreview'); if (p) p.src = input.value; var n = document.getElementById('certTemplateName'); if (n) n.textContent = input.value; }
          redrawCertPreviewCanvas();
        });
      });
      
      var addCourseBtn = document.getElementById('addCourseTableBtn'); if (addCourseBtn) addCourseBtn.addEventListener('click', function() { showAddCourseModal(); });
    }
    
    var cvBtn = document.getElementById('createVoucherTableBtn'); if (cvBtn && canManageVouchers) cvBtn.addEventListener('click', function() { showCreateVoucherModal(); });
    var bvBtn = document.getElementById('batchVoucherBtn'); if (bvBtn && canManageVouchers) bvBtn.addEventListener('click', function() { showBatchVoucherModal(); });
    
  }, 400);
}

console.log('✅ Part 2 (Course Dashboard + Admin Console v13.0 with SAVE BUG FIXED) loaded');

// ==================== obliXel Academy v13.0 - COMPLETE APP.JS PART 3 ====================
// v13.0 FINAL: All Admin Modals, Reset Modals, Edit Privileges, Make/Remove Admin,
//              AI Teacher Chat, AI Widget Chat, Global Exports, Initialization,
//              FULL Font Controls for ALL Certificate Elements
console.log('🚀 Loading Part 3 (Admin Modals, AI Chats, Initialization)');

// ==================== DRAG AND DROP FOR COURSE TABLE ====================
function initDragAndDrop() {
  var rows = document.querySelectorAll('#adminCourseTableBody .course-drag-row');
  var draggedRow = null;
  rows.forEach(function(row) {
    row.addEventListener('dragstart', function(e) {
      draggedRow = this;
      this.classList.add('course-row-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.dataset.courseId);
    });
    row.addEventListener('dragend', function(e) {
      this.classList.remove('course-row-dragging');
      document.querySelectorAll('.course-drag-row').forEach(function(r) {
        r.classList.remove('course-row-drag-over');
      });
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
        var tbody = document.getElementById('adminCourseTableBody');
        var allRows = Array.from(tbody.querySelectorAll('.course-drag-row'));
        var draggedIndex = allRows.indexOf(draggedRow);
        var droppedIndex = allRows.indexOf(this);
        if (draggedIndex < droppedIndex) {
          tbody.insertBefore(draggedRow, this.nextSibling);
        } else {
          tbody.insertBefore(draggedRow, this);
        }
      }
    });
  });
}

// ==================== ADMIN MODALS ====================
function showAddAdminModal() {
  var m = '<div id="addAdminModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-yellow-600 to-amber-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold"><i class="fa-solid fa-crown mr-2"></i> Add Admin</h2><button onclick="closeModal(\'addAdminModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><p class="text-sm text-gray-400 mb-4">Create a new admin account or promote an existing user.</p><div class="mb-6"><h3 class="font-semibold mb-3 text-yellow-400">Option 1: Create New Admin</h3><div class="space-y-3"><input type="text" id="newAdminName" placeholder="Full name" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off"><input type="email" id="newAdminEmail" placeholder="Email address" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off"><input type="password" id="newAdminPassword" placeholder="Password (min 5 chars)" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off"><button onclick="createNewAdminAccount()" class="w-full bg-yellow-600 hover:bg-yellow-500 py-2 rounded-xl font-bold text-sm transition">➕ Create Admin Account</button></div></div><div class="border-t border-white/10 pt-4"><h3 class="font-semibold mb-3 text-cyan-400">Option 2: Promote Existing User</h3><div class="space-y-3"><input type="text" id="promoteUserEmail" placeholder="Enter user email to promote" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-cyan-400 transition" autocomplete="off"><button onclick="promoteExistingUser()" class="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-bold text-sm transition">👑 Promote to Admin</button></div></div><button onclick="closeModal(\'addAdminModal\')" class="w-full glass py-3 rounded-xl font-bold mt-4">Cancel</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
}

async function createNewAdminAccount() {
  var n = document.getElementById('newAdminName')?.value;
  var e = document.getElementById('newAdminEmail')?.value;
  var p = document.getElementById('newAdminPassword')?.value;
  if (!n || !e || !p) { showToast('Please fill all fields', 'error'); return; }
  if (p.length < 5) { showToast('Password must be at least 5 characters', 'error'); return; }
  try {
    var r = await apiRequest('/admin/add-admin', { method: 'POST', body: JSON.stringify({ name: n, email: e, password: p }) });
    showToast(r.message, 'success');
    closeModal('addAdminModal');
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

async function promoteExistingUser() {
  var e = document.getElementById('promoteUserEmail')?.value;
  if (!e) { showToast('Please enter a user email', 'error'); return; }
  try {
    var ud = await getAllUsers();
    var u = ud.users?.find(function(u2) { return u2.email.toLowerCase() === e.toLowerCase(); });
    if (!u) { showToast('User not found', 'error'); return; }
    if (u.role === 'admin') { showToast('Already an admin', 'info'); return; }
    var r = await apiRequest('/admin/add-admin', { method: 'POST', body: JSON.stringify({ userId: u.id }) });
    showToast(r.message, 'success');
    closeModal('addAdminModal');
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

window.createNewAdminAccount = createNewAdminAccount;
window.promoteExistingUser = promoteExistingUser;

function showAddCourseModal() {
  var m = '<div id="addCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold"><i class="fa-solid fa-plus-circle mr-2"></i> Add New Course</h2><button onclick="closeModal(\'addCourseModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Course Name *</label><input type="text" id="courseName" placeholder="e.g., DevOps Master" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition" autocomplete="off"></div><div><label class="block text-sm font-medium mb-1">Description</label><textarea id="courseDesc" rows="3" placeholder="Course description..." class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></textarea></div><div><label class="block text-sm font-medium mb-1">Course Fee *</label><input type="number" id="coursePrice" placeholder="199" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Icon</label><input type="text" id="courseIcon" placeholder="fa-certificate" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Category</label><select id="courseCategory" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option>Networking</option><option>Cybersecurity</option><option>Cloud Computing</option><option>Development</option><option>AI</option><option>Business</option><option>Professional Skills</option></select></div></div><div class="pt-4 flex gap-3"><button onclick="createNewCourse()" class="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 py-3 rounded-xl font-bold">➕ Create Course</button><button onclick="closeModal(\'addCourseModal\')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
}

async function createNewCourse() {
  var n = document.getElementById('courseName')?.value;
  var d = document.getElementById('courseDesc')?.value;
  var p = document.getElementById('coursePrice')?.value;
  var i = document.getElementById('courseIcon')?.value || 'fa-certificate';
  var c = document.getElementById('courseCategory')?.value;
  if (!n || !p) { showToast('Name and course fee required', 'error'); return; }
  try {
    await createCourse({ name: n, description: d, price: parseFloat(p), icon: i, category: c });
    showToast('Course created!', 'success');
    closeModal('addCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

window.showEditCourseModal = function(courseId) {
  var c = coursesData.find(function(x) { return x.id === courseId; });
  if (!c) { showToast('Course not found', 'error'); return; }
  var cp = c.price || c.examPrice || 0;
  var m = '<div id="editCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">✏️ Edit: ' + escapeHtml(c.name) + '</h2><button onclick="closeModal(\'editCourseModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Course Name *</label><input type="text" id="editCourseName" value="' + escapeHtml(c.name) + '" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div><label class="block text-sm font-medium mb-1">Description</label><textarea id="editCourseDesc" rows="3" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition">' + escapeHtml(c.description || '') + '</textarea></div><div><label class="block text-sm font-medium mb-1">Course Fee *</label><input type="number" id="editCoursePrice" value="' + cp + '" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-cyan-400 transition"></div><div class="pt-4 flex gap-3"><button onclick="saveEditCourse(\'' + courseId + '\')" class="flex-1 bg-cyan-600 py-3 rounded-xl font-bold">💾 Save Changes</button><button onclick="closeModal(\'editCourseModal\')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.saveEditCourse = async function(courseId) {
  var n = document.getElementById('editCourseName')?.value;
  var d = document.getElementById('editCourseDesc')?.value;
  var p = document.getElementById('editCoursePrice')?.value;
  if (!n || !p) { showToast('Name and course fee required', 'error'); return; }
  try {
    await updateCourse(courseId, { name: n, description: d, price: parseFloat(p) });
    showToast('Course updated!', 'success');
    closeModal('editCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
};

window.showDeleteCourseModal = function(courseId, courseName) {
  var m = '<div id="deleteCourseModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">⚠️ Delete Course</h2><button onclick="closeModal(\'deleteCourseModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-book text-5xl text-red-400 mb-3"></i><p>Delete <strong class="text-red-400">"' + escapeHtml(courseName) + '"</strong>?</p><p class="text-sm text-gray-400 mt-2">This cannot be undone.</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">DELETE</span>:</label><input type="text" id="deleteConfirmInput" placeholder="DELETE" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2 focus:border-red-400 transition" autocomplete="off"></div><div class="flex gap-3"><button onclick="confirmDeleteCourse(\'' + courseId + '\')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Delete</button><button onclick="closeModal(\'deleteCourseModal\')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmDeleteCourse = async function(courseId) {
  var c = document.getElementById('deleteConfirmInput')?.value;
  if (c !== 'DELETE') { showToast('Type DELETE to confirm', 'error'); return; }
  try {
    await deleteCourse(courseId);
    showToast('Course deleted!', 'success');
    closeModal('deleteCourseModal');
    await loadCourses();
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
};

window.showManageVideosModal = function(courseId) {
  var c = coursesData.find(function(x) { return x.id === courseId; });
  if (!c) return;
  var tm = c.modules ? c.modules.length : (c.totalModules || 8);
  var mi = '';
  for (var i2 = 1; i2 <= tm; i2++) {
    mi += '<div><label class="block text-sm mb-1">Module ' + i2 + '</label><input type="text" id="videoUrl' + i2 + '" value="' + escapeHtml(c['module' + i2 + 'VideoUrl'] || '') + '" placeholder="YouTube URL" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 focus:border-yellow-400 transition mb-2" autocomplete="off"></div>';
  }
  var m = '<div id="manageVideosModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-yellow-600 to-orange-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">📹 Videos: ' + escapeHtml(c.name) + '</h2><button onclick="closeModal(\'manageVideosModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-3">' + mi + '</div><div class="pt-4 flex gap-3"><button onclick="saveCourseVideos(\'' + courseId + '\', ' + tm + ')" class="flex-1 bg-yellow-600 py-3 rounded-xl font-bold">💾 Save All</button><button onclick="closeModal(\'manageVideosModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.saveCourseVideos = async function(courseId, count) {
  var u = {};
  for (var i3 = 1; i3 <= count; i3++) {
    u['module' + i3 + 'VideoUrl'] = document.getElementById('videoUrl' + i3)?.value || '';
  }
  try {
    await updateCourse(courseId, u);
    showToast('Videos saved!', 'success');
    closeModal('manageVideosModal');
    await loadCourses();
  } catch (err) { showToast('Failed to save videos', 'error'); }
};

function showCreateVoucherModal() {
  var m = '<div id="createVoucherModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">🎟️ Create Voucher</h2><button onclick="closeModal(\'createVoucherModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm mb-1">Code *</label><input type="text" id="voucherCode" placeholder="SUMMER2026" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 uppercase focus:border-cyan-400 transition" autocomplete="off"><button id="genRandomCode" class="mt-1 text-xs text-cyan-400 hover:underline">🎲 Random</button></div><div><label class="block text-sm mb-1">Discount Type *</label><select id="discountType" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed ($)</option><option value="free">Free (100%)</option></select></div><div><label class="block text-sm mb-1">Discount Value</label><input type="number" id="discountValue" placeholder="20" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div><label class="block text-sm mb-1">Course</label><select id="voucherCourse" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="all">All Courses</option>' + coursesData.map(function(c2) { return '<option value="' + c2.id + '">' + escapeHtml(c2.name) + '</option>'; }).join('') + '</select></div><div><label class="block text-sm mb-1">Max Uses</label><input type="number" id="maxUses" value="100" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div class="pt-4 flex gap-3"><button onclick="createNewVoucher()" class="flex-1 bg-purple-600 py-3 rounded-xl font-bold">🎟️ Create</button><button onclick="closeModal(\'createVoucherModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
  document.getElementById('genRandomCode')?.addEventListener('click', function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var code = '';
    for (var i4 = 0; i4 < 8; i4++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('voucherCode').value = code;
  });
}

async function createNewVoucher() {
  var code = document.getElementById('voucherCode')?.value;
  var dt = document.getElementById('discountType')?.value;
  var dv = parseFloat(document.getElementById('discountValue')?.value) || 0;
  var ci = document.getElementById('voucherCourse')?.value;
  var mu = parseInt(document.getElementById('maxUses')?.value) || 1;
  if (!code) { showToast('Code required', 'error'); return; }
  try {
    await createVoucher({ code: code.toUpperCase(), discountType: dt, discountValue: dv, courseId: ci, maxUses: mu });
    showToast('Voucher created!', 'success');
    closeModal('createVoucherModal');
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

function showBatchVoucherModal() {
  var m = '<div id="batchVoucherModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-lg"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">📦 Batch Vouchers</h2><button onclick="closeModal(\'batchVoucherModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="space-y-4"><div><label class="block text-sm mb-1">Prefix *</label><input type="text" id="batchPrefix" placeholder="SUMMER" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2 uppercase"></div><div><label class="block text-sm mb-1">Count *</label><input type="number" id="batchCount" value="10" min="1" max="500" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div><label class="block text-sm mb-1">Discount Type</label><select id="batchDiscountType" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="free">Free</option></select></div><div><label class="block text-sm mb-1">Discount Value</label><input type="number" id="batchDiscountValue" placeholder="20" class="w-full bg-transparent border border-white/20 rounded-xl px-4 py-2"></div><div class="pt-4 flex gap-3"><button onclick="createBatchVouchers()" class="flex-1 bg-purple-600 py-3 rounded-xl font-bold">📦 Create</button><button onclick="closeModal(\'batchVoucherModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
}

async function createBatchVouchers() {
  var p = document.getElementById('batchPrefix')?.value;
  var c = parseInt(document.getElementById('batchCount')?.value);
  if (!p || c < 1) { showToast('Prefix and count required', 'error'); return; }
  try {
    var r = await createBatchVouchers({ prefix: p.toUpperCase(), count: c, discountType: document.getElementById('batchDiscountType')?.value, discountValue: parseFloat(document.getElementById('batchDiscountValue')?.value) || 0, courseId: 'all', maxUses: 1 });
    showToast('Created ' + r.vouchers.length + ' vouchers!', 'success');
    closeModal('batchVoucherModal');
    renderAdmin();
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

window.copyToClipboard = function(text) { navigator.clipboard.writeText(text); showToast('Copied!', 'success'); };
window.approveCertificateItem = async function(id) { try { await approveCertificate(id); showToast('Approved!', 'success'); renderAdmin(); } catch(e) { showToast('Failed', 'error'); } };
window.rejectCertificateItem = async function(id) { try { await rejectCertificate(id); showToast('Rejected', 'info'); renderAdmin(); } catch(e) { showToast('Failed', 'error'); } };

window.deleteVoucherItem = function(id) {
  var m = '<div id="deleteVoucherModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">🗑️ Delete Voucher</h2><button onclick="closeModal(\'deleteVoucherModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-ticket text-5xl text-red-400 mb-3"></i><p>Delete this voucher?</p><p class="text-sm text-gray-400 mt-2">This cannot be undone.</p></div><div class="flex gap-3"><button onclick="confirmDeleteVoucher(\'' + id + '\')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Delete</button><button onclick="closeModal(\'deleteVoucherModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmDeleteVoucher = async function(id) { closeModal('deleteVoucherModal'); try { await deleteVoucher(id); showToast('Voucher deleted', 'success'); renderAdmin(); } catch(e) { showToast('Failed: ' + e.message, 'error'); } };

window.showDeleteUserModal = function(userId, userName) {
  var m = '<div id="deleteUserModal" class="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">🗑️ Delete User</h2><button onclick="closeModal(\'deleteUserModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-user text-5xl text-red-400 mb-3"></i><p>Delete <strong class="text-red-400">"' + escapeHtml(userName) + '"</strong>?</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">DELETE</span>:</label><input type="text" id="deleteUserConfirmInput" placeholder="DELETE" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2" autocomplete="off"></div><div class="flex gap-3"><button onclick="confirmDeleteUser(\'' + userId + '\')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Delete</button><button onclick="closeModal(\'deleteUserModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmDeleteUser = async function(userId) {
  var i = document.getElementById('deleteUserConfirmInput')?.value;
  if (i !== 'DELETE') { showToast('Type DELETE to confirm', 'error'); return; }
  try { await deleteUserByAdmin(userId); showToast('User deleted', 'success'); closeModal('deleteUserModal'); renderAdmin(); } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

function closeModal(modalId) { var modal = document.getElementById(modalId); if (modal) modal.remove(); }
window.closeModal = closeModal;

// ==================== SYSTEM RESET MODALS ====================
window.showResetRevenueModal = function() {
  var m = '<div id="resetRevenueModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold text-white">⚠️ Reset Revenue</h2><button onclick="closeModal(\'resetRevenueModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-dollar-sign text-5xl text-red-400 mb-3"></i><p>This will <strong class="text-red-400">permanently delete</strong> all payment records and reset revenue to $0.</p><p class="text-sm text-gray-400 mt-2">This cannot be undone!</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">RESET</span> to confirm:</label><input type="text" id="resetRevenueInput" placeholder="RESET" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2 focus:border-red-400 transition" autocomplete="off"></div><div class="flex gap-3"><button onclick="window.confirmResetRevenue()" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Reset Revenue</button><button onclick="closeModal(\'resetRevenueModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmResetRevenue = async function() {
  var input = document.getElementById('resetRevenueInput')?.value;
  if (input !== 'RESET') { showToast('Type RESET to confirm', 'error'); return; }
  try { var result = await resetRevenue('RESET'); showToast(result.message, 'success'); closeModal('resetRevenueModal'); renderAdmin(); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

window.showResetEnrollmentsModal = function() {
  var m = '<div id="resetEnrollmentsModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold text-white">⚠️ Reset Enrollments</h2><button onclick="closeModal(\'resetEnrollmentsModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-users-slash text-5xl text-red-400 mb-3"></i><p>This will <strong class="text-red-400">delete all enrollments</strong> and progress for all users.</p><p class="text-sm text-gray-400 mt-2">This cannot be undone!</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">RESET</span> to confirm:</label><input type="text" id="resetEnrollmentsInput" placeholder="RESET" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2 focus:border-red-400 transition" autocomplete="off"></div><div class="flex gap-3"><button onclick="window.confirmResetEnrollments()" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Reset Enrollments</button><button onclick="closeModal(\'resetEnrollmentsModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmResetEnrollments = async function() {
  var input = document.getElementById('resetEnrollmentsInput')?.value;
  if (input !== 'RESET') { showToast('Type RESET to confirm', 'error'); return; }
  try { var result = await resetEnrollments('RESET'); showToast(result.message, 'success'); closeModal('resetEnrollmentsModal'); renderAdmin(); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

window.showResetCertificatesModal = function() {
  var m = '<div id="resetCertificatesModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold text-white">⚠️ Reset Certificates</h2><button onclick="closeModal(\'resetCertificatesModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-certificate text-5xl text-red-400 mb-3"></i><p>This will <strong class="text-red-400">delete all certificates</strong> issued to students.</p><p class="text-sm text-gray-400 mt-2">This cannot be undone!</p></div><div class="mb-4"><label class="block text-sm mb-2">Type <span class="text-red-400 font-bold">RESET</span> to confirm:</label><input type="text" id="resetCertificatesInput" placeholder="RESET" class="w-full bg-transparent border border-red-500/50 rounded-xl px-4 py-2 focus:border-red-400 transition" autocomplete="off"></div><div class="flex gap-3"><button onclick="window.confirmResetCertificates()" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Reset Certificates</button><button onclick="closeModal(\'resetCertificatesModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmResetCertificates = async function() {
  var input = document.getElementById('resetCertificatesInput')?.value;
  if (input !== 'RESET') { showToast('Type RESET to confirm', 'error'); return; }
  try { var result = await resetCertificates('RESET'); showToast(result.message, 'success'); closeModal('resetCertificatesModal'); renderAdmin(); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// ==================== EDIT ADMIN PRIVILEGES MODAL ====================
window.showEditAdminPrivilegesModal = function(userId, userName, userEmail) {
  var m = '<div id="editPrivilegesModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold">⚙️ Edit Admin Privileges</h2><button onclick="closeModal(\'editPrivilegesModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><p class="text-sm text-gray-400 mb-2">Admin: <strong>' + escapeHtml(userName) + '</strong> (' + escapeHtml(userEmail) + ')</p><p class="text-xs text-gray-500 mb-4">Select which permissions this admin has.</p><div class="space-y-3">';
  
  var privList = [
    { key: 'manageCourses', label: 'Manage Courses', desc: 'Add, edit, delete courses' },
    { key: 'manageVouchers', label: 'Manage Vouchers', desc: 'Create and delete vouchers' },
    { key: 'manageUsers', label: 'Manage Users', desc: 'View and delete users' },
    { key: 'manageAdmins', label: 'Manage Admins', desc: 'Add and remove other admins' },
    { key: 'approveCertificates', label: 'Approve Certificates', desc: 'Approve or reject pending certs' },
    { key: 'resetRevenue', label: 'Reset Revenue', desc: 'Delete all payment records' },
    { key: 'systemSettings', label: 'System Settings', desc: 'Change platform settings' },
    { key: 'viewFinance', label: 'View Finance', desc: 'See revenue and financial data' }
  ];
  
  for (var pi = 0; pi < privList.length; pi++) {
    var p = privList[pi];
    m += '<label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer hover:bg-white/5 transition"><input type="checkbox" id="priv_' + p.key + '" checked class="w-4 h-4"><div><p class="text-sm font-medium">' + p.label + '</p><p class="text-xs text-gray-400">' + p.desc + '</p></div></label>';
  }
  
  m += '</div><div class="pt-4 flex gap-3"><button onclick="window.saveAdminPrivileges(\'' + userId + '\')" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold transition">💾 Save Privileges</button><button onclick="closeModal(\'editPrivilegesModal\')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.saveAdminPrivileges = async function(userId) {
  var privileges = {
    manageCourses: document.getElementById('priv_manageCourses')?.checked || false,
    manageVouchers: document.getElementById('priv_manageVouchers')?.checked || false,
    manageUsers: document.getElementById('priv_manageUsers')?.checked || false,
    manageAdmins: document.getElementById('priv_manageAdmins')?.checked || false,
    approveCertificates: document.getElementById('priv_approveCertificates')?.checked || false,
    resetRevenue: document.getElementById('priv_resetRevenue')?.checked || false,
    systemSettings: document.getElementById('priv_systemSettings')?.checked || false,
    viewFinance: document.getElementById('priv_viewFinance')?.checked || false
  };
  
  try {
    await updateAdminPrivileges(userId, privileges);
    showToast('Admin privileges updated!', 'success');
    closeModal('editPrivilegesModal');
    renderAdmin();
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// ==================== REMOVE ADMIN MODAL ====================
window.showRemoveAdminModal = function(userId, userName) {
  var m = '<div id="removeAdminModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-md"><div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold text-white">⚠️ Remove Admin</h2><button onclick="closeModal(\'removeAdminModal\')" class="text-white/80 hover:text-white text-2xl">&times;</button></div><div class="p-6"><div class="text-center mb-4"><i class="fa-solid fa-user-slash text-5xl text-red-400 mb-3"></i><p>Remove admin status from <strong class="text-red-400">' + escapeHtml(userName) + '</strong>?</p><p class="text-sm text-gray-400 mt-2">They will become a regular student.</p></div><div class="flex gap-3"><button onclick="window.confirmRemoveAdmin(\'' + userId + '\')" class="flex-1 bg-red-600 py-3 rounded-xl font-bold">🗑️ Remove Admin</button><button onclick="closeModal(\'removeAdminModal\')" class="flex-1 glass py-3 rounded-xl">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmRemoveAdmin = async function(userId) {
  try {
    await removeAdminUser(userId);
    showToast('Admin removed successfully', 'success');
    closeModal('removeAdminModal');
    renderAdmin();
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// ==================== MAKE ADMIN MODAL (WITH PRIVILEGES) ====================
window.showMakeAdminModal = function(userId, userName) {
  var m = '<div id="makeAdminPrivModal" class="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-4" style="backdrop-filter: blur(4px);"><div class="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-gradient-to-r from-yellow-600 to-amber-500 px-6 py-4 flex justify-between items-center rounded-t-3xl"><h2 class="text-xl font-bold text-gray-900">👑 Make Admin: ' + escapeHtml(userName) + '</h2><button onclick="closeModal(\'makeAdminPrivModal\')" class="text-gray-900/80 hover:text-gray-900 text-2xl">&times;</button></div><div class="p-6"><p class="text-sm text-gray-400 mb-4">Select which privileges this admin should have.</p><div class="space-y-3">';
  
  var privList2 = [
    { key: 'manageCourses', label: 'Manage Courses', desc: 'Add, edit, delete courses' },
    { key: 'manageVouchers', label: 'Manage Vouchers', desc: 'Create and delete vouchers' },
    { key: 'manageUsers', label: 'Manage Users', desc: 'View and delete users' },
    { key: 'manageAdmins', label: 'Manage Admins', desc: 'Add and remove other admins' },
    { key: 'approveCertificates', label: 'Approve Certificates', desc: 'Approve or reject pending certs' },
    { key: 'resetRevenue', label: 'Reset Revenue', desc: 'Delete all payment records' },
    { key: 'systemSettings', label: 'System Settings', desc: 'Change platform settings' },
    { key: 'viewFinance', label: 'View Finance', desc: 'See revenue and financial data' }
  ];
  
  for (var pj = 0; pj < privList2.length; pj++) {
    var p2 = privList2[pj];
    var defaultChecked = (p2.key === 'manageAdmins' || p2.key === 'resetRevenue' || p2.key === 'systemSettings') ? '' : ' checked';
    m += '<label class="flex items-center gap-3 glass p-3 rounded-xl cursor-pointer hover:bg-white/5 transition"><input type="checkbox" id="makePriv_' + p2.key + '"' + defaultChecked + ' class="w-4 h-4"><div><p class="text-sm font-medium">' + p2.label + '</p><p class="text-xs text-gray-400">' + p2.desc + '</p></div></label>';
  }
  
  m += '</div><div class="pt-4 flex gap-3"><button onclick="window.confirmMakeAdminWithPrivileges(\'' + userId + '\')" class="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold text-gray-900 transition">👑 Make Admin</button><button onclick="closeModal(\'makeAdminPrivModal\')" class="flex-1 glass py-3 rounded-xl font-bold">Cancel</button></div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', m);
};

window.confirmMakeAdminWithPrivileges = async function(userId) {
  var privileges = {
    manageCourses: document.getElementById('makePriv_manageCourses')?.checked || false,
    manageVouchers: document.getElementById('makePriv_manageVouchers')?.checked || false,
    manageUsers: document.getElementById('makePriv_manageUsers')?.checked || false,
    manageAdmins: document.getElementById('makePriv_manageAdmins')?.checked || false,
    approveCertificates: document.getElementById('makePriv_approveCertificates')?.checked || false,
    resetRevenue: document.getElementById('makePriv_resetRevenue')?.checked || false,
    systemSettings: document.getElementById('makePriv_systemSettings')?.checked || false,
    viewFinance: document.getElementById('makePriv_viewFinance')?.checked || false
  };
  
  try {
    await makeAdmin(userId, privileges);
    showToast('Admin created with selected privileges!', 'success');
    closeModal('makeAdminPrivModal');
    renderAdmin();
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// ==================== AI TEACHER CHAT ====================
var teacherChatHistory = {};
var currentTeacherCourseId = null;

function getTeacherConfig(courseId) {
  var t = {
    ncp: { name: 'Professor Carlos', title: 'Network Certified Instructor • 12 Years', avatar: '📡', theme: 'ncp', greeting: 'Hello! I\'m Professor Carlos. I specialize in networking certifications. How can I help you master NCP today? 📡\n\nFeel free to ask me about:\n• Subnetting and IP addressing\n• Routing protocols\n• Network security\n• Exam preparation tips' },
    ccp: { name: 'Professor Sarah Chen', title: 'Computer Science Professor • 15 Years', avatar: '📚', theme: 'ccp', greeting: 'Welcome! I\'m Professor Sarah Chen. Ready to dive into computer science fundamentals? Let\'s learn together! 📚\n\nI can help you with:\n• Computer hardware and architecture\n• Operating systems\n• Programming basics\n• Database concepts' },
    clp: { name: 'Professor Mike Ross', title: 'Cloud Architect • AWS Certified', avatar: '☁️', theme: 'clp', greeting: 'Hey there! I\'m Professor Mike Ross. The cloud is infinite — let me show you how to master it! ☁️' },
    aip: { name: 'Professor Nova Turing', title: 'AI Research Scientist', avatar: '🧠', theme: 'aip', greeting: 'Greetings! I\'m Professor Nova Turing. Neural networks, deep learning — let\'s explore AI together! 🧠' },
    default: { name: 'Professor Sarah Chen', title: 'Senior Instructor', avatar: '📚', theme: 'default', greeting: 'Hello! I\'m here to help you learn.' }
  };
  return t[courseId] || t.default;
}

window.openAITeacherChat = function(courseId) {
  currentTeacherCourseId = courseId;
  var teacher = getTeacherConfig(courseId);
  var modal = document.getElementById('aiTeacherModal');
  if (!modal) return;
  var header = document.getElementById('aiTeacherHeader');
  header.className = 'px-5 py-4 flex justify-between items-center shrink-0';
  header.classList.add('teacher-header-' + teacher.theme);
  document.getElementById('aiTeacherAvatar').textContent = teacher.avatar;
  document.getElementById('aiTeacherName').textContent = teacher.name;
  document.getElementById('aiTeacherTitle').textContent = teacher.title;
  var sendBtn = document.getElementById('sendTeacherChat');
  sendBtn.className = 'w-10 h-10 rounded-xl flex items-center justify-center transition hover:scale-105';
  sendBtn.classList.add('teacher-send-btn-' + teacher.theme);
  if (!teacherChatHistory[courseId]) { teacherChatHistory[courseId] = [{ role: 'assistant', content: teacher.greeting }]; }
  restoreTeacherChatHistory(courseId, teacher);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function restoreTeacherChatHistory(courseId, teacher) {
  var chatDiv = document.getElementById('teacherChatMessages');
  if (!chatDiv) return;
  chatDiv.innerHTML = '';
  var history = teacherChatHistory[courseId] || [];
  history.forEach(function(msg) {
    if (msg.role === 'user') {
      var d = document.createElement('div');
      d.className = 'flex justify-end mb-3';
      d.innerHTML = '<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm whitespace-pre-wrap">' + escapeHtml(msg.content) + '</p></div>';
      chatDiv.appendChild(d);
    } else if (msg.role === 'assistant') {
      var d2 = document.createElement('div');
      d2.className = 'flex gap-2 mb-3';
      var content = msg.content;
      var wa = '+263714587259';
      if (content.indexOf(wa) !== -1) content = content.replace(new RegExp(escapeRegex(wa), 'g'), '<a href="https://wa.me/' + wa.replace(/\+/g, '') + '" target="_blank" class="whatsapp-link">' + wa + '</a>');
      d2.innerHTML = '<div class="w-8 h-8 rounded-full teacher-avatar-bg-' + teacher.theme + ' flex items-center justify-center text-xs text-white shrink-0">' + teacher.avatar + '</div><div class="glass rounded-2xl p-3 max-w-[80%]"><div class="text-sm whitespace-pre-wrap">' + content + '</div><div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2"><button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition"><i class="fa-regular fa-copy"></i></button><button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition"><i class="fa-regular fa-thumbs-up"></i></button><button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition"><i class="fa-regular fa-thumbs-down"></i></button><button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition"><i class="fa-solid fa-rotate"></i></button></div></div>';
      var cb = d2.querySelector('.ai-copy-btn');
      if (cb) cb.addEventListener('click', function() { navigator.clipboard.writeText(msg.content); showToast('Copied!', 'success'); });
      var lb = d2.querySelector('.ai-like-btn');
      var db = d2.querySelector('.ai-dislike-btn');
      if (lb) lb.addEventListener('click', function() { lb.classList.add('ai-liked'); if (db) db.classList.remove('ai-disliked'); showToast('Thanks for your feedback! 👍', 'success'); });
      if (db) db.addEventListener('click', function() { db.classList.add('ai-disliked'); if (lb) lb.classList.remove('ai-liked'); showToast('Thanks for your feedback. We\'ll improve.', 'info'); });
      chatDiv.appendChild(d2);
    }
  });
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

async function sendTeacherChatMessage() {
  var input = document.getElementById('teacherChatInput');
  var message = input.value.trim();
  if (!message || !currentTeacherCourseId) return;
  var courseId = currentTeacherCourseId;
  var teacher = getTeacherConfig(courseId);
  var chatDiv = document.getElementById('teacherChatMessages');
  var ud = document.createElement('div');
  ud.className = 'flex justify-end mb-3';
  ud.innerHTML = '<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm whitespace-pre-wrap">' + escapeHtml(message) + '</p></div>';
  chatDiv.appendChild(ud);
  var ad = document.createElement('div');
  ad.className = 'flex gap-2 mb-3';
  ad.innerHTML = '<div class="w-8 h-8 rounded-full teacher-avatar-bg-' + teacher.theme + ' flex items-center justify-center text-xs text-white shrink-0">' + teacher.avatar + '</div><div class="glass rounded-2xl p-3 max-w-[80%]"><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  chatDiv.appendChild(ad);
  var rd = ad.querySelector('.glass');
  var dots = ad.querySelector('.thinking-dots');
  input.value = '';
  chatDiv.scrollTop = chatDiv.scrollHeight;
  if (!teacherChatHistory[courseId]) teacherChatHistory[courseId] = [];
  teacherChatHistory[courseId].push({ role: 'user', content: message });
  try {
    var response = await apiRequest('/ai/teacher/' + courseId, { method: 'POST', body: JSON.stringify({ message: message, moduleContext: teacher.title }) });
    var aiResponse = response.response || 'Let me help you with that!';
    if (dots) dots.remove();
    var fr = aiResponse;
    var wa = '+263714587259';
    if (fr.indexOf(wa) !== -1) fr = fr.replace(new RegExp(escapeRegex(wa), 'g'), '<a href="https://wa.me/' + wa.replace(/\+/g, '') + '" target="_blank" class="whatsapp-link">' + wa + '</a>');
    rd.innerHTML = '<div class="text-sm whitespace-pre-wrap">' + fr + '</div><div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2"><button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition"><i class="fa-regular fa-copy"></i></button><button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition"><i class="fa-regular fa-thumbs-up"></i></button><button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition"><i class="fa-regular fa-thumbs-down"></i></button><button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition"><i class="fa-solid fa-rotate"></i></button></div>';
    var cb2 = rd.querySelector('.ai-copy-btn');
    if (cb2) cb2.addEventListener('click', function() { navigator.clipboard.writeText(aiResponse); showToast('Copied!', 'success'); });
    var lb2 = rd.querySelector('.ai-like-btn');
    var db2 = rd.querySelector('.ai-dislike-btn');
    if (lb2) lb2.addEventListener('click', function() { lb2.classList.add('ai-liked'); if (db2) db2.classList.remove('ai-disliked'); showToast('Thanks for your feedback! 👍', 'success'); });
    if (db2) db2.addEventListener('click', function() { db2.classList.add('ai-disliked'); if (lb2) lb2.classList.remove('ai-liked'); showToast('Thanks for your feedback. We\'ll improve.', 'info'); });
    teacherChatHistory[courseId].push({ role: 'assistant', content: aiResponse });
  } catch (e) { if (dots) dots.remove(); rd.innerHTML = '<p class="text-red-400 text-sm">Sorry, I\'m having trouble responding.</p>'; teacherChatHistory[courseId].push({ role: 'assistant', content: 'Sorry.' }); }
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function closeTeacherChatModal() { var modal = document.getElementById('aiTeacherModal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } currentTeacherCourseId = null; }
function clearTeacherChat() { if (currentTeacherCourseId) { var teacher = getTeacherConfig(currentTeacherCourseId); teacherChatHistory[currentTeacherCourseId] = [{ role: 'assistant', content: teacher.greeting }]; restoreTeacherChatHistory(currentTeacherCourseId, teacher); showToast('Chat cleared', 'info'); } }
function expandTeacherChat() { var modal = document.getElementById('aiTeacherModal'); if (modal) { modal.classList.toggle('expanded'); var icon = document.querySelector('#expandTeacherChat i'); if (icon) icon.className = modal.classList.contains('expanded') ? 'fa-solid fa-compress' : 'fa-solid fa-expand'; } }

// ==================== AI WIDGET CHAT ====================
window.openAIChatModal = function(courseId) {
  window.currentAIChatCourseId = courseId || null;
  aiWidgetActive = true;
  var modal = document.getElementById('aiChatModal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); restoreChatHistory(); }
};

function restoreChatHistory() {
  var chatDiv = document.getElementById('chatMessages');
  if (!chatDiv) return;
  chatDiv.innerHTML = '';
  aiChatHistory.forEach(function(msg) {
    if (msg.role === 'user') {
      var d = document.createElement('div');
      d.className = 'flex justify-end mb-3';
      d.innerHTML = '<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm whitespace-pre-wrap">' + escapeHtml(msg.content) + '</p></div>';
      chatDiv.appendChild(d);
    } else if (msg.role === 'assistant') {
      var d2 = document.createElement('div');
      d2.className = 'flex gap-2 mb-3';
      var content = msg.content;
      var wa = '+263714587259';
      if (content.indexOf(wa) !== -1) content = content.replace(new RegExp(escapeRegex(wa), 'g'), '<a href="https://wa.me/' + wa.replace(/\+/g, '') + '" target="_blank" class="whatsapp-link">' + wa + '</a>');
      d2.innerHTML = '<div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white shrink-0">AI</div><div class="glass rounded-2xl p-3 max-w-[80%]"><div class="text-sm whitespace-pre-wrap">' + content + '</div><div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2"><button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition"><i class="fa-regular fa-copy"></i></button><button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition"><i class="fa-regular fa-thumbs-up"></i></button><button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition"><i class="fa-regular fa-thumbs-down"></i></button><button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition"><i class="fa-solid fa-rotate"></i></button></div></div>';
      var cb3 = d2.querySelector('.ai-copy-btn');
      if (cb3) cb3.addEventListener('click', function() { navigator.clipboard.writeText(msg.content); showToast('Copied!', 'success'); });
      var lb3 = d2.querySelector('.ai-like-btn');
      var db3 = d2.querySelector('.ai-dislike-btn');
      if (lb3) lb3.addEventListener('click', function() { lb3.classList.add('ai-liked'); if (db3) db3.classList.remove('ai-disliked'); showToast('Thanks for your feedback! 👍', 'success'); });
      if (db3) db3.addEventListener('click', function() { db3.classList.add('ai-disliked'); if (lb3) lb3.classList.remove('ai-liked'); showToast('Thanks for your feedback. We\'ll improve.', 'info'); });
      chatDiv.appendChild(d2);
    }
  });
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

window.openAIChatModal = openAIChatModal;
window.openAITeacherChat = openAITeacherChat;

function closeAIChatModal() { var modal = document.getElementById('aiChatModal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } aiWidgetActive = false; aiChatHistory = [{ role: 'assistant', content: 'Hi! I\'m ObliXel AI, your study assistant.' }]; }

async function sendAIChatMessage() {
  var input = document.getElementById('chatInput');
  var message = input.value.trim();
  if (!message) return;
  var chatDiv = document.getElementById('chatMessages');
  var ud = document.createElement('div');
  ud.className = 'flex justify-end mb-3';
  ud.innerHTML = '<div class="bg-purple-600/30 rounded-2xl p-3 max-w-[80%]"><p class="text-sm whitespace-pre-wrap">' + escapeHtml(message) + '</p></div>';
  chatDiv.appendChild(ud);
  var ad = document.createElement('div');
  ad.className = 'flex gap-2 mb-3';
  ad.innerHTML = '<div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white shrink-0">AI</div><div class="glass rounded-2xl p-3 max-w-[80%]"><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  chatDiv.appendChild(ad);
  var rd = ad.querySelector('.glass');
  var dots = ad.querySelector('.thinking-dots');
  input.value = '';
  chatDiv.scrollTop = chatDiv.scrollHeight;
  try {
    var result = await sendAIMessage(message);
    if (dots) dots.remove();
    rd.innerHTML = '<div class="text-sm whitespace-pre-wrap">' + result.response + '</div><div class="ai-action-buttons mt-2 pt-2 border-t border-white/10 flex gap-2"><button class="ai-copy-btn text-xs text-gray-400 hover:text-cyan-400 transition"><i class="fa-regular fa-copy"></i></button><button class="ai-like-btn text-xs text-gray-400 hover:text-green-400 transition"><i class="fa-regular fa-thumbs-up"></i></button><button class="ai-dislike-btn text-xs text-gray-400 hover:text-red-400 transition"><i class="fa-regular fa-thumbs-down"></i></button><button class="ai-regenerate-btn text-xs text-gray-400 hover:text-yellow-400 transition"><i class="fa-solid fa-rotate"></i></button></div>';
    var cb4 = rd.querySelector('.ai-copy-btn');
    if (cb4) cb4.addEventListener('click', function() { navigator.clipboard.writeText(result.response); showToast('Copied!', 'success'); });
    var lb4 = rd.querySelector('.ai-like-btn');
    var db4 = rd.querySelector('.ai-dislike-btn');
    if (lb4) lb4.addEventListener('click', function() { lb4.classList.add('ai-liked'); if (db4) db4.classList.remove('ai-disliked'); showToast('Thanks for your feedback! 👍', 'success'); });
    if (db4) db4.addEventListener('click', function() { db4.classList.add('ai-disliked'); if (lb4) lb4.classList.remove('ai-liked'); showToast('Thanks for your feedback. We\'ll improve.', 'info'); });
  } catch (e) { if (dots) dots.remove(); rd.innerHTML = '<p class="text-red-400 text-sm">AI unavailable.</p>'; }
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function clearAIChat() { aiChatHistory = [{ role: 'assistant', content: 'Hi! I\'m ObliXel AI, your study assistant.' }]; var chatDiv = document.getElementById('chatMessages'); if (chatDiv) restoreChatHistory(); showToast('Chat cleared', 'info'); }
function expandAIChat() { var modal = document.getElementById('aiChatModal'); if (modal) { modal.classList.toggle('expanded'); var icon = document.querySelector('#expandAIChat i'); if (icon) icon.className = modal.classList.contains('expanded') ? 'fa-solid fa-compress' : 'fa-solid fa-expand'; } }

// ==================== GLOBAL WINDOW EXPORTS ====================
window.renderPage = renderPage;
window.renderCourseDashboard = renderCourseDashboard;
window.renderModulePage = renderModulePage;
window.startExam = startExam;
window.startExamCheck = startExamCheck;
window.completeModuleAndReturn = completeModuleAndReturn;
window.retryQuiz = retryQuiz;
window.handleEnrollClick = handleEnrollClick;
window.openCheckout = openCheckout;
window.openAIChatModal = openAIChatModal;
window.openAITeacherChat = openAITeacherChat;
window.showLegalNameModal = showLegalNameModal;
window.saveLegalName = saveLegalName;
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
window.deleteVoucherItem = deleteVoucherItem;
window.confirmDeleteVoucher = confirmDeleteVoucher;
window.copyToClipboard = copyToClipboard;
window.downloadCertificate = downloadCertificate;
window.handleCertFileSelect = handleCertFileSelect;
window.deleteCertificateTemplate = deleteCertificateTemplate;
window.showCertPreviewModal = showCertPreviewModal;
window.redrawCertPreviewCanvas = redrawCertPreviewCanvas;
window.initCertDragEngine = initCertDragEngine;
window.openSignaturePadModal = openSignaturePadModal;
window.setSignaturePenColor = setSignaturePenColor;
window.updateSigPenWidth = updateSigPenWidth;
window.clearSignaturePad = clearSignaturePad;
window.saveSignatureFromPad = saveSignatureFromPad;
window.clearSavedSignature = clearSavedSignature;
window.closeSignaturePadModal = closeSignaturePadModal;
window.applyColorPreset = applyColorPreset;
window.addCustomTextField = addCustomTextField;
window.removeCustomTextField = removeCustomTextField;
window.updateCustomTextField = updateCustomTextField;
window.showResetRevenueModal = showResetRevenueModal;
window.confirmResetRevenue = confirmResetRevenue;
window.showResetEnrollmentsModal = showResetEnrollmentsModal;
window.confirmResetEnrollments = confirmResetEnrollments;
window.showResetCertificatesModal = showResetCertificatesModal;
window.confirmResetCertificates = confirmResetCertificates;
window.showEditAdminPrivilegesModal = showEditAdminPrivilegesModal;
window.saveAdminPrivileges = saveAdminPrivileges;
window.showRemoveAdminModal = showRemoveAdminModal;
window.confirmRemoveAdmin = confirmRemoveAdmin;
window.showMakeAdminModal = showMakeAdminModal;
window.confirmMakeAdminWithPrivileges = confirmMakeAdminWithPrivileges;
window.closeModal = closeModal;
window.shareToLinkedIn = function(id) { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.origin + '/verify/' + id), '_blank'); };
window.verifyCertificate = function(id) { window.open('/verify/' + id, '_blank'); };

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 obliXel Academy v13.0 - DOM loaded');
  
  initNavbarAutoHide();
  
  // Mobile menu
  var mmb = document.getElementById('mobileMenuBtn');
  var mm = document.getElementById('mobileMenu');
  if (mmb) mmb.addEventListener('click', function(e) { e.stopPropagation(); mm.classList.toggle('hidden'); });
  document.addEventListener('click', function(e) { if (mm && !mm.classList.contains('hidden') && !mm.contains(e.target) && e.target !== mmb && !mmb?.contains(e.target)) { mm.classList.add('hidden'); } });
  window.addEventListener('scroll', function() { if (mm && !mm.classList.contains('hidden')) mm.classList.add('hidden'); });
  document.querySelectorAll('.nav-link-mobile').forEach(function(link) { link.addEventListener('click', function() { mm.classList.add('hidden'); }); });
  
  // Nav buttons
  var lib = document.getElementById('login-nav-btn');
  if (lib) lib.addEventListener('click', function(e) { e.preventDefault(); renderPage('login'); });
  var rib = document.getElementById('register-nav-btn');
  if (rib) rib.addEventListener('click', function(e) { e.preventDefault(); renderPage('register'); });
  var lob = document.getElementById('logout-btn');
  if (lob) lob.addEventListener('click', function() { logout(); });
  var mlb = document.getElementById('mobileLogoutBtn');
  if (mlb) mlb.addEventListener('click', function() { logout(); if (mm) mm.classList.add('hidden'); });
  var logo = document.getElementById('navbarLogo');
  if (logo) logo.addEventListener('click', function() { renderPage(currentUser ? 'dashboard' : 'landing'); });
  document.querySelectorAll('[data-nav]').forEach(function(btn) { btn.addEventListener('click', function(e) { e.preventDefault(); renderPage(btn.dataset.nav); if (mm) mm.classList.add('hidden'); }); });
  
  // AI Widget buttons
  var aiBtn = document.getElementById('aiChatButton');
  if (aiBtn) aiBtn.addEventListener('click', function() { openAIChatModal(); });
  var cab = document.getElementById('closeAiChat');
  if (cab) cab.addEventListener('click', closeAIChatModal);
  var scb = document.getElementById('sendChat');
  if (scb) scb.addEventListener('click', sendAIChatMessage);
  var clb = document.getElementById('clearAIChat');
  if (clb) clb.addEventListener('click', clearAIChat);
  var exb = document.getElementById('expandAIChat');
  if (exb) exb.addEventListener('click', expandAIChat);
  var cib = document.getElementById('chatInput');
  if (cib) cib.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendAIChatMessage(); });
  
  // AI Teacher buttons
  var ctb = document.getElementById('closeTeacherChat');
  if (ctb) ctb.addEventListener('click', closeTeacherChatModal);
  var stb = document.getElementById('sendTeacherChat');
  if (stb) stb.addEventListener('click', sendTeacherChatMessage);
  var cltb = document.getElementById('clearTeacherChat');
  if (cltb) cltb.addEventListener('click', clearTeacherChat);
  var etb = document.getElementById('expandTeacherChat');
  if (etb) etb.addEventListener('click', expandTeacherChat);
  var tci = document.getElementById('teacherChatInput');
  if (tci) tci.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendTeacherChatMessage(); });
  
  // Modal backdrop clicks
  var wm = document.getElementById('aiChatModal');
  if (wm) wm.addEventListener('click', function(e) { if (e.target === wm) closeAIChatModal(); });
  var tm2 = document.getElementById('aiTeacherModal');
  if (tm2) tm2.addEventListener('click', function(e) { if (e.target === tm2) closeTeacherChatModal(); });
  
  // Loader
  var loader = document.getElementById('loader');
  var pb = document.getElementById('loaderProgress');
  if (pb) { var width = 0; var interval = setInterval(function() { width += (100 / (6000 / 50)); if (width >= 100) { width = 100; pb.style.width = '100%'; clearInterval(interval); } else pb.style.width = width + '%'; }, 50); }
  
  // Initialize app
  setTimeout(async function() {
    await loadCourses();
    await checkAuth();
    updateAuthUI();
    updateNavbarStyle();
    if (loader) { loader.style.transition = 'opacity 0.5s ease-out'; loader.style.opacity = '0'; setTimeout(function() { loader.style.display = 'none'; }, 500); }
    renderPage(currentUser ? 'dashboard' : 'landing');
    console.log('✅ obliXel Academy v13.0 fully initialized');
    console.log('🎉 ALL FEATURES READY');
  }, 6000);
});

console.log('🎉 obliXel Academy v13.0 - COMPLETE - All 3 Parts Loaded');
console.log('✅ Main Admin: mutaurijoe@gmail.com');
console.log('✅ Two-Column Certificate Settings with Sliders');
console.log('✅ FULL Font Controls for ALL Elements (Name, Course, Date, Cert ID, Expiry, Verify)');
console.log('✅ Expiry Date with text + period dropdown');
console.log('✅ Verify URL with auto-appended cert ID');
console.log('✅ Unlimited Custom Text Fields - add/remove/edit');
console.log('✅ Position Sliders for ALL elements (X and Y)');
console.log('✅ Drag-to-Position on Live Canvas');
console.log('✅ Signature Pad with color/width controls');
console.log('✅ Gold/Silver/Navy/Black Color Presets');
console.log('✅ Color presets apply to ALL font color fields');
console.log('✅ Privilege-based UI rendering');
console.log('✅ Sub-admin restricted access');
console.log('✅ System reset controls (Revenue, Enrollments, Certificates)');
console.log('✅ Edit Admin Privileges');
console.log('✅ Remove Admin (demote to student)');
console.log('✅ Make Admin with privilege selection');
console.log('✅ Legal name banner auto-hide');
console.log('✅ Blurred professor when certified');
console.log('✅ Quick action panels with dropdown info');

// ESC closes quiz
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const el = document.getElementById('quizOverlay');
    if (el) {
      el.remove();
      showToast('Quiz closed', 'info');
    }
  }
});