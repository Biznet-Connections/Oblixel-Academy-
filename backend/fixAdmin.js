const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data');
const usersPath = path.join(dataPath, 'users.json');

// Read current users
let users = [];
if (fs.existsSync(usersPath)) {
  users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  console.log(`📁 Found ${users.length} users in database`);
} else {
  console.log('❌ users.json not found');
  process.exit(1);
}

const adminEmail = 'mutaurijoe@gmail.com';
const adminPassword = 'JOELMUTAURI@2005';

// Remove any existing admin user with this email
const filteredUsers = users.filter(u => u.email !== adminEmail);
console.log(`🗑️ Removed existing entries for ${adminEmail}`);

// Create fresh admin user
const hashedPassword = bcrypt.hashSync(adminPassword, 10);
const newAdmin = {
  id: 'admin_' + Date.now(),
  email: adminEmail,
  name: 'Admin User',
  password: hashedPassword,
  role: 'admin',
  xp: 0,
  level: 1,
  totalSpent: 0,
  avatar: 'A',
  createdAt: new Date().toISOString()
};

filteredUsers.push(newAdmin);
fs.writeFileSync(usersPath, JSON.stringify(filteredUsers, null, 2));

console.log('✅ Admin user created/updated successfully!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📧 Email: ${adminEmail}`);
console.log(`🔑 Password: ${adminPassword}`);
console.log(`👑 Role: admin`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 Please restart your backend server and try logging in again.');
