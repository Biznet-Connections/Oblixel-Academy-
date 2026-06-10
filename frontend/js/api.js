// frontend/js/api.js - Complete API communication layer
// AUTO-DETECTS if running locally or on Render

// Auto-detect API URL - works on localhost AND Render!
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

console.log('[API] Using API_BASE_URL:', API_BASE_URL);

let authToken = localStorage.getItem('auth_token');

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

function getAuthToken() {
  return authToken;
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('[API] Error:', error);
    throw error;
  }
}

// Auth endpoints
async function register(name, email, password, careerPath) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, careerPath })
  });
}

async function login(email, password, rememberMe) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe })
  });
  if (data.token) {
    setAuthToken(data.token);
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
  setAuthToken(null);
  localStorage.removeItem('remember_me');
}

// Course endpoints
async function getCourses() {
  const data = await apiRequest('/courses');
  return data.courses || [];
}

async function getCourse(courseId) {
  return apiRequest(`/courses/${courseId}`);
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

// Exam endpoints
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

async function getExamHistory() {
  return apiRequest('/exams/history');
}

// Certificate endpoints
async function getMyCertificates() {
  return apiRequest('/certificates/my-certificates');
}

async function verifyCertificate(certificateId) {
  return apiRequest(`/certificates/verify/${certificateId}`);
}

// Payment endpoints
async function validateVoucher(code, courseId) {
  console.log('[VOUCHER] Validating code:', code);
  return apiRequest('/payments/validate-voucher', {
    method: 'POST',
    body: JSON.stringify({ code, courseId })
  });
}

async function createCheckout(courseId, type, voucherCode = null, billingInfo) {
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

// AI Chat endpoint
async function sendAIMessage(message, history = []) {
  return apiRequest('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  });
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
    body: JSON.stringify({ courseId, moduleName, topic, numberOfQuestions: 5 })
  });
}

// Community endpoints
async function getForumPosts() {
  return apiRequest('/community/posts');
}

async function getOnlineUsers() {
  return apiRequest('/community/online');
}

async function getStudyGroups() {
  return apiRequest('/community/study-groups');
}

async function getLiveSessions() {
  return apiRequest('/community/live-sessions');
}

// User profile endpoints
async function getUserProfile() {
  return apiRequest('/user/profile');
}

async function getUserActivity() {
  return apiRequest('/user/activity');
}

async function updateUserProfile(data) {
  return apiRequest('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteAccount(confirmDelete) {
  return apiRequest('/user/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmDelete })
  });
}

// Admin endpoints
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

async function updatePrices(prices) {
  return apiRequest('/admin/prices', {
    method: 'PUT',
    body: JSON.stringify({ prices })
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

async function addVideo(videoData) {
  return apiRequest('/admin/videos', {
    method: 'POST',
    body: JSON.stringify(videoData)
  });
}

async function addTutor(tutorData) {
  return apiRequest('/admin/tutors', {
    method: 'POST',
    body: JSON.stringify(tutorData)
  });
}

async function getTutors() {
  return apiRequest('/admin/tutors');
}

async function deleteTutor(tutorId) {
  return apiRequest(`/admin/tutors/${tutorId}`, {
    method: 'DELETE'
  });
}

// YouTube metadata
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

// Export all functions to window
window.OBliXelAPI = {
  auth: { register, login, getCurrentUser, logout, forgotPassword },
  courses: { getCourses, getCourse, getCourseDetails, enroll, getMyEnrollments, getModuleProgress, completeModule },
  exams: { startExam, submitExam, getExamHistory },
  certificates: { getMyCertificates, verifyCertificate },
  payments: { validateVoucher, createCheckout, confirmPayment },
  ai: { sendAIMessage, generateAINotes, generateAIGuiz },
  community: { getForumPosts, getOnlineUsers, getStudyGroups, getLiveSessions },
  user: { getProfile: getUserProfile, getActivity: getUserActivity, updateProfile: updateUserProfile, deleteAccount },
  admin: { 
    getAdminStats, getAllUsers, makeAdmin, removeAdmin, updatePrices, 
    createCourse, updateCourse, deleteCourse,
    createVoucher, createBatchVouchers, getVouchers, deleteVoucher, deleteUserByAdmin,
    getPendingCertificates, approveCertificate, rejectCertificate, getFinanceData,
    addVideo, addTutor, getTutors, deleteTutor 
  },
  youtube: { fetchYouTubeMetadata, getYouTubeVideoId }
};

console.log('✅ API module loaded with base URL:', API_BASE_URL);
