// frontend/js/api.js - Complete API communication layer

const API_BASE_URL = 'http://localhost:5000/api';

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
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

// Auth endpoints
async function register(name, email, password, careerPath) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, careerPath })
  });
}

async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

async function getCurrentUser() {
  return apiRequest('/auth/me');
}

function logout() {
  setAuthToken(null);
}

// Course endpoints
async function getCourses() {
  return apiRequest('/courses');
}

async function getCourse(courseId) {
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
  return apiRequest('/payments/validate-voucher', {
    method: 'POST',
    body: JSON.stringify({ code, courseId })
  });
}

async function createCheckout(courseId, type, voucherCode = null) {
  return apiRequest('/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ courseId, type, voucherCode })
  });
}

// AI Chat endpoint
async function sendAIMessage(message) {
  return apiRequest('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
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

// Admin endpoints
async function getAdminStats() {
  return apiRequest('/admin/stats');
}

async function updatePrices(prices) {
  return apiRequest('/admin/prices', {
    method: 'PUT',
    body: JSON.stringify({ prices })
  });
}

async function createVoucher(voucherData) {
  return apiRequest('/admin/vouchers', {
    method: 'POST',
    body: JSON.stringify(voucherData)
  });
}

async function getVouchers() {
  return apiRequest('/admin/vouchers');
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

async function rejectCertificate(pendingId) {
  return apiRequest('/admin/certificates/reject', {
    method: 'POST',
    body: JSON.stringify({ pendingId })
  });
}

async function getUsers() {
  return apiRequest('/admin/users');
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

// Export all functions to window
window.OBliXelAPI = {
  auth: { register, login, getCurrentUser, logout },
  courses: { getCourses, getCourse, enroll, getMyEnrollments },
  exams: { startExam, submitExam, getExamHistory },
  certificates: { getMyCertificates, verifyCertificate },
  payments: { validateVoucher, createCheckout },
  ai: { sendAIMessage },
  community: { getForumPosts, getOnlineUsers, getStudyGroups, getLiveSessions },
  user: { getProfile: getUserProfile, getActivity: getUserActivity },
  admin: { getAdminStats, updatePrices, createVoucher, getVouchers, getPendingCertificates, approveCertificate, rejectCertificate, getUsers, addVideo, addTutor, getTutors, deleteTutor }
};
