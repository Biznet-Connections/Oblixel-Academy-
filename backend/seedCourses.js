const fs = require('fs');
const path = require('path');

const courses = [
  { id: "cyber", name: "Cybersecurity Expert", description: "Master cybersecurity fundamentals, threat detection, incident response.", examPrice: 499, pathPrice: 699, icon: "fa-shield-haltered", category: "Cybersecurity", color: "purple", enrolledCount: 2847 },
  { id: "cloud", name: "Cloud Engineering", description: "Learn AWS, Azure, Google Cloud, Kubernetes, and DevOps practices.", examPrice: 599, pathPrice: 799, icon: "fa-cloud", category: "Cloud Computing", color: "cyan", enrolledCount: 1956 },
  { id: "ccna", name: "Cisco CCNA", description: "Comprehensive networking certification covering routing and switching.", examPrice: 399, pathPrice: 599, icon: "fa-network-wired", category: "Networking", color: "blue", enrolledCount: 3124 },
  { id: "ai", name: "Artificial Intelligence", description: "Master machine learning, neural networks, and AI deployment.", examPrice: 699, pathPrice: 899, icon: "fa-robot", category: "AI", color: "green", enrolledCount: 1567 }
];

const dataDir = path.join(__dirname, 'data');
const coursesPath = path.join(dataDir, 'courses.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(coursesPath, JSON.stringify({ courses }, null, 2));
console.log('✅ Seeded', courses.length, 'courses');
