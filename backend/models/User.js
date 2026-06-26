const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 5, select: false },
  role: { type: String, enum: ['student', 'admin', 'instructor'], default: 'student' },
  avatar: { type: String, default: 'U' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  enrolledCourses: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  // Certificate legal name fields
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  fullName: { type: String, trim: true, default: '' },
  idNumber: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: '' },
  hasProvidedLegalName: { type: Boolean, default: false },
  // Admin privilege system
  isMainAdmin: { type: Boolean, default: false },
  adminPrivileges: {
    manageCourses: { type: Boolean, default: true },
    manageVouchers: { type: Boolean, default: true },
    manageUsers: { type: Boolean, default: true },
    manageAdmins: { type: Boolean, default: false },
    approveCertificates: { type: Boolean, default: true },
    resetRevenue: { type: Boolean, default: false },
    systemSettings: { type: Boolean, default: false },
    viewFinance: { type: Boolean, default: true }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date
}, { timestamps: true });

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Check main admin
userSchema.methods.isMainAdminCheck = function() {
  return this.isMainAdmin === true;
};

// Check if admin has a specific privilege
userSchema.methods.hasPrivilege = function(privilege) {
  if (this.isMainAdmin) return true;
  if (this.role !== 'admin') return false;
  return this.adminPrivileges && this.adminPrivileges[privilege] === true;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
