const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data');
const usersPath = path.join(dataPath, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Read or create users.json
let users = [];
if (fs.existsSync(usersPath)) {
  users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
}

const adminEmail = 'mutaurijoe@gmail.com';
const adminPassword = 'JOELMUTAURI@2005';

// Check if admin exists
const existingAdmin = users.find(u => u.email === adminEmail);

if (!existingAdmin) {
  // Create admin user
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
  users.push(newAdmin);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  console.log('✅ Admin user created!');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
} else {
  console.log('✅ Admin user already exists');
}
