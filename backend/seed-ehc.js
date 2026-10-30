const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const courseId = 'ehc'; // Renaming from ehp to ehc
  
  // 1. Rename the course first if it still says EHP
  await db.collection('courses').updateOne(
    { courseId: 'ehp' },
    { $set: { courseId: 'ehc', name: 'Ethical Hacking Certification (EHC)' } }
  );

  // 2. Define the 15 modules with real content
  const modules = [
    {
      moduleId: 1, name: 'Introduction to Cybersecurity', 
      description: 'What is hacking? The difference between ethical and malicious hackers.',
      contentType: 'reading', duration: '45 min',
      keyTopics: ['What is Cybersecurity?', 'Types of Hackers', 'The CIA Triad', 'Legal Boundaries']
    },
    {
      moduleId: 2, name: 'Networking Fundamentals',
      description: 'How computers talk to each other. IP addresses, MAC addresses, and DNS.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['IP vs MAC', 'DNS Explained', 'Routers and Switches', 'Public vs Private IPs']
    },
    {
      moduleId: 3, name: 'The OSI Model & TCP/IP',
      description: 'The 7 layers of the internet and how data travels through them.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['The 7 Layers', 'TCP vs UDP', 'Handshakes', 'Packets']
    },
    {
      moduleId: 4, name: 'Ports and Protocols',
      description: 'Understanding the doors into a computer system.',
      contentType: 'reading', duration: '45 min',
      keyTopics: ['Common Ports (80, 443, 22, 21)', 'Protocols', 'Port Scans']
    },
    {
      moduleId: 5, name: 'Linux Fundamentals for Hackers',
      description: 'The terminal is a hacker\'s best friend. Learn basic Kali Linux commands.',
      contentType: 'interactive', duration: '1.5 hours',
      keyTopics: ['Basic Navigation (ls, cd, pwd)', 'File Permissions', 'Users & Groups']
    },
    {
      moduleId: 6, name: 'Reconnaissance (OSINT)',
      description: 'Finding information about a target without touching their servers.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['Google Dorking', 'Shodan', 'Social Media Intelligence', 'Whois']
    },
    {
      moduleId: 7, name: 'Scanning with Nmap',
      description: 'Using Nmap to find open ports and running services.',
      contentType: 'interactive', duration: '1 hour',
      keyTopics: ['Nmap Syntax', 'Ping Sweeps', 'Service Detection', 'OS Detection']
    },
    {
      moduleId: 8, name: 'Vulnerability Assessment',
      description: 'How hackers identify weaknesses in systems.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['What is a CVE?', 'Vulnerability Scanners', 'False Positives']
    },
    {
      moduleId: 9, name: 'SQL Injection',
      description: 'The most common web vulnerability. Learn how hackers bypass logins.',
      contentType: 'interactive', duration: '1 hour',
      keyTopics: ['What is SQL?', 'Injection Payloads', 'Bypassing Authentication']
    },
    {
      moduleId: 10, name: 'Cross-Site Scripting (XSS)',
      description: 'Injecting malicious scripts into trusted websites.',
      contentType: 'interactive', duration: '45 min',
      keyTopics: ['Reflected XSS', 'Stored XSS', 'DOM XSS', 'Defenses']
    },
    {
      moduleId: 11, name: 'Password Cracking',
      description: 'How passwords are stored and how they are broken.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['Hashes', 'Brute Force', 'Dictionary Attacks', 'Salting']
    },
    {
      moduleId: 12, name: 'Exploitation Basics',
      description: 'Using vulnerabilities to gain access to a system.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['Payloads', 'Metasploit Basics', 'Reverse Shells']
    },
    {
      moduleId: 13, name: 'Post-Exploitation',
      description: 'What happens once you are inside? Privilege escalation and pivoting.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['Privilege Escalation', 'Lateral Movement', 'Covering Tracks']
    },
    {
      moduleId: 14, name: 'Defense & Hardening',
      description: 'How to protect yourself and your company from attacks.',
      contentType: 'reading', duration: '1.5 hours',
      keyTopics: ['Firewalls', 'IDS/IPS', 'Patch Management', 'Security Policies']
    },
    {
      moduleId: 15, name: 'Final Review & Exam Prep',
      description: 'Prepare for the final certification exam.',
      contentType: 'reading', duration: '1 hour',
      keyTopics: ['Course Summary', 'Exam Format', 'Practice Questions']
    }
  ];

  // Add required fields for the modules
  modules.forEach((m, i) => {
    m.quizQuestions = 10;
    m.videoUrl = '';
    m.imageUrl = '';
    m.estimatedMinutes = m.duration === '45 min' ? 45 : m.duration === '1 hour' ? 60 : 90;
  });

  // 3. Update the course
  const result = await db.collection('courses').updateOne(
    { courseId: 'ehc' },
    { 
      $set: { 
        modules: modules,
        totalModules: 15,
        duration: '8 weeks',
        description: 'Learn ethical hacking from scratch. Master networking, reconnaissance, exploitation, and defense.'
      } 
    }
  );

  console.log('✅ Updated EHC course with 15 detailed modules');
  console.log('Matched:', result.matchedCount, '| Modified:', result.modifiedCount);

  await mongoose.disconnect();
})().catch(e => console.error('❌', e.message));
