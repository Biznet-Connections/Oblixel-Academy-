module.exports = {
  JWT_EXPIRY: '7d',
  BCRYPT_ROUNDS: 10,
  EXAM_PASS_SCORE: 70,
  EXAM_COOLDOWN_DAYS: 7,
  RETAKE_DISCOUNT_PERCENT: 50,
  
  // Course categories
  COURSE_CATEGORIES: ['Security', 'Cloud', 'AI', 'Telecom', 'Networking', 'DevOps', 'Programming', 'SysAdmin'],
  
  // User roles
  USER_ROLES: {
    STUDENT: 'student',
    TUTOR: 'tutor',
    ADMIN: 'admin'
  },
  
  // Enrollment types
  ENROLLMENT_TYPES: {
    EXAM_ONLY: 'exam_only',
    LEARNING_PATH: 'learning'
  },
  
  // Enrollment statuses
  ENROLLMENT_STATUS: {
    ENROLLED: 'enrolled',
    PASSED_WAITING: 'passed_waiting',
    FAILED: 'failed',
    COMPLETED: 'completed'
  }
};
