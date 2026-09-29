/**
 * seedCCP.js — Full CCP course with 15 rich modules + 150 quiz questions
 * Run: node backend/seedCCP.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Course = require('./models/Course');
const ExamQuestion = require('./models/ExamQuestion');

const MONGODB_URI = process.env.MONGODB_URI;
const dbName = 'oblixel_academy';

// -------- 15 CCP MODULES --------
const ccpModules = [
  {
    moduleId: 1,
    name: 'Computer Fundamentals',
    description: 'Discover what makes a computer tick — hardware, software, and how they work together to solve problems.',
    complexity: 'Beginner',
    estimatedMinutes: 25,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=AkFi90lZmXA',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    icon: 'fa-computer',
    xpReward: 50,
    prerequisites: [],
    keyTopics: ['Hardware vs Software', 'Input/Output', 'The Information Processing Cycle'],
    learningObjectives: [
      'Identify the main components of a computer system',
      'Explain the difference between hardware and software',
      'Describe the information processing cycle (input → process → output → storage)',
      'Recognize common input and output devices'
    ]
  },
  {
    moduleId: 2,
    name: 'Hardware Basics',
    description: 'Explore the physical parts of a computer — from motherboards to peripherals — and what each one does.',
    complexity: 'Beginner',
    estimatedMinutes: 30,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=ExxFxD4OSZ0',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011318cc908e?w=800&q=80',
    icon: 'fa-microchip',
    xpReward: 60,
    prerequisites: [1],
    keyTopics: ['Motherboard', 'CPU', 'RAM', 'Storage Devices', 'Peripherals'],
    learningObjectives: [
      'Identify the internal components of a computer',
      'Explain the role of the motherboard and its connections',
      'Compare different types of storage (HDD, SSD, NVMe)',
      'Understand how peripherals connect (USB, Bluetooth, HDMI)'
    ]
  },
  {
    moduleId: 3,
    name: 'CPU & Memory',
    description: 'Learn how processors execute billions of instructions per second and how memory stores data temporarily.',
    complexity: 'Intermediate',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=Z5JC9Ve1sfI',
    imageUrl: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&q=80',
    icon: 'fa-microchip',
    xpReward: 100,
    prerequisites: [2],
    keyTopics: ['Fetch-Decode-Execute', 'CPU Cores', 'Cache Levels', 'RAM vs ROM'],
    learningObjectives: [
      'Explain the fetch-decode-execute cycle',
      'Differentiate between RAM, ROM, and cache memory',
      'Understand clock speed, cores, and hyperthreading',
      'Compare x86 and ARM architectures'
    ]
  },
  {
    moduleId: 4,
    name: 'Storage & File Systems',
    description: 'Understand how data persists — from spinning disks to SSDs — and how operating systems organize files.',
    complexity: 'Intermediate',
    estimatedMinutes: 40,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=KN8YgJnShPM',
    imageUrl: 'https://images.unsplash.com/photo-1601737487795-dab272f52420?w=800&q=80',
    icon: 'fa-hard-drive',
    xpReward: 80,
    prerequisites: [3],
    keyTopics: ['HDD vs SSD', 'File Systems (NTFS, ext4, APFS)', 'Partitions', 'Backups'],
    learningObjectives: [
      'Compare HDD, SSD, and NVMe storage technologies',
      'Explain how file systems organize data (FAT32, NTFS, ext4)',
      'Understand partitions and disk management',
      'Implement a basic backup strategy (3-2-1 rule)'
    ]
  },
  {
    moduleId: 5,
    name: 'Operating Systems',
    description: 'Explore Windows, macOS, and Linux — how they manage hardware, run apps, and give you a usable interface.',
    complexity: 'Intermediate',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
    imageUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&q=80',
    icon: 'fa-windows',
    xpReward: 90,
    prerequisites: [2],
    keyTopics: ['Kernel', 'Processes', 'Users & Permissions', 'Command Line'],
    learningObjectives: [
      'Explain the role of the OS kernel',
      'Describe how processes and threads are managed',
      'Understand file permissions and user accounts',
      'Use basic command-line tools (cd, ls, mkdir, etc.)'
    ]
  },
  {
    moduleId: 6,
    name: 'Networking Basics',
    description: 'How computers talk to each other — IP addresses, routers, switches, and the layers of network communication.',
    complexity: 'Intermediate',
    estimatedMinutes: 50,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=qiQR5rTSshw',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    icon: 'fa-network-wired',
    xpReward: 100,
    prerequisites: [1],
    keyTopics: ['OSI Model', 'IP Addressing', 'DNS', 'Routers & Switches', 'Protocols'],
    learningObjectives: [
      'Explain the OSI 7-layer model',
      'Understand IP addressing (IPv4 and IPv6)',
      'Describe how DNS resolves domain names',
      'Differentiate between routers, switches, and hubs'
    ]
  },
  {
    moduleId: 7,
    name: 'Internet & Web Technology',
    description: 'How the web works — HTTP, browsers, servers, and the technologies that power the modern internet.',
    complexity: 'Intermediate',
    estimatedMinutes: 40,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=7_LPdttKXPc',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    icon: 'fa-globe',
    xpReward: 80,
    prerequisites: [6],
    keyTopics: ['HTTP/HTTPS', 'Browsers', 'Web Servers', 'Cookies & Sessions', 'APIs'],
    learningObjectives: [
      'Explain how HTTP requests and responses work',
      'Understand the role of DNS, servers, and CDNs',
      'Describe cookies, sessions, and browser storage',
      'Recognize what APIs are and how they power modern apps'
    ]
  },
  {
    moduleId: 8,
    name: 'Databases Fundamentals',
    description: 'How applications store and retrieve data — relational databases, SQL, and modern NoSQL systems.',
    complexity: 'Intermediate',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=FR4QIeZaPeM',
    imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
    icon: 'fa-database',
    xpReward: 100,
    prerequisites: [5],
    keyTopics: ['Relational DBs', 'SQL Basics', 'NoSQL', 'Indexes', 'Backups'],
    learningObjectives: [
      'Explain tables, rows, columns, and relationships',
      'Write basic SQL queries (SELECT, INSERT, UPDATE, DELETE)',
      'Understand when to use SQL vs NoSQL',
      'Recognize the importance of indexes and backups'
    ]
  },
  {
    moduleId: 9,
    name: 'Cybersecurity Basics',
    description: 'Protect systems and data from threats — passwords, encryption, malware, and security best practices.',
    complexity: 'Advanced',
    estimatedMinutes: 50,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
    icon: 'fa-shield-halved',
    xpReward: 120,
    prerequisites: [6, 7],
    keyTopics: ['Threats & Attacks', 'Encryption', 'Authentication', 'Firewalls', 'Malware'],
    learningObjectives: [
      'Identify common cyber threats (phishing, malware, ransomware)',
      'Explain encryption basics (symmetric, asymmetric, hashing)',
      'Understand MFA and password best practices',
      'Describe the role of firewalls and antivirus'
    ]
  },
  {
    moduleId: 10,
    name: 'Cloud Computing Intro',
    description: 'Learn how AWS, Azure, and Google Cloud deliver computing as a service — IaaS, PaaS, SaaS, and beyond.',
    complexity: 'Advanced',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=M988_fsOSWo',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    icon: 'fa-cloud',
    xpReward: 110,
    prerequisites: [6],
    keyTopics: ['IaaS/PaaS/SaaS', 'AWS/Azure/GCP', 'Virtualization', 'Containers', 'Serverless'],
    learningObjectives: [
      'Differentiate IaaS, PaaS, and SaaS',
      'Explain virtualization and containers',
      'Understand core AWS/Azure/GCP services',
      'Recognize when serverless makes sense'
    ]
  },
  {
    moduleId: 11,
    name: 'Software Development Basics',
    description: 'How software gets built — programming languages, version control, testing, and the dev lifecycle.',
    complexity: 'Advanced',
    estimatedMinutes: 55,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=poJfwre2PIs',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    icon: 'fa-code',
    xpReward: 130,
    prerequisites: [5],
    keyTopics: ['Programming Languages', 'Git & GitHub', 'SDLC', 'Testing', 'Debugging'],
    learningObjectives: [
      'Compare popular programming languages and their uses',
      'Use Git for version control (commit, push, pull, branch)',
      'Explain the software development lifecycle',
      'Describe unit testing and debugging strategies'
    ]
  },
  {
    moduleId: 12,
    name: 'IT Support & Troubleshooting',
    description: 'Diagnose and fix common IT problems — a systematic approach to helping users and maintaining systems.',
    complexity: 'Advanced',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=oDZ7mC8oF0s',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    icon: 'fa-screwdriver-wrench',
    xpReward: 110,
    prerequisites: [5, 6],
    keyTopics: ['Troubleshooting Steps', 'Ticketing Systems', 'Remote Support', 'Documentation'],
    learningObjectives: [
      'Apply a systematic troubleshooting methodology',
      'Use ticketing systems to track and resolve issues',
      'Provide effective remote support',
      'Document solutions for future reference'
    ]
  },
  {
    moduleId: 13,
    name: 'Data Privacy & Ethics',
    description: 'Handle data responsibly — privacy laws, user consent, ethical AI, and protecting personal information.',
    complexity: 'Advanced',
    estimatedMinutes: 40,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=9CeBP6lH6rA',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
    icon: 'fa-user-shield',
    xpReward: 100,
    prerequisites: [9],
    keyTopics: ['GDPR', 'Data Protection', 'Consent', 'AI Ethics', 'Anonymization'],
    learningObjectives: [
      'Explain key data privacy regulations (GDPR, POPIA)',
      'Understand user consent and data handling principles',
      'Recognize ethical concerns in AI and automation',
      'Apply data anonymization techniques'
    ]
  },
  {
    moduleId: 14,
    name: 'Emerging Technologies',
    description: 'Explore the future — AI, IoT, blockchain, quantum computing, and how they\'ll reshape IT.',
    complexity: 'Advanced',
    estimatedMinutes: 60,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=QEzlsjAqADA',
    imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    icon: 'fa-rocket',
    xpReward: 140,
    prerequisites: [10, 11],
    keyTopics: ['Artificial Intelligence', 'IoT', 'Blockchain', 'Quantum Computing', 'AR/VR'],
    learningObjectives: [
      'Explain the basics of AI and machine learning',
      'Describe IoT architecture and use cases',
      'Understand how blockchain works and its applications',
      'Recognize the potential of quantum computing and AR/VR'
    ]
  },
  {
    moduleId: 15,
    name: 'Career Readiness & Interview Prep',
    description: 'Turn your CCP certification into a career — CVs, interviews, portfolios, and professional growth.',
    complexity: 'Professional',
    estimatedMinutes: 45,
    contentType: 'mixed',
    videoUrl: 'https://www.youtube.com/watch?v=naIkpQ_cIt0',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    icon: 'fa-briefcase',
    xpReward: 150,
    prerequisites: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    keyTopics: ['CV Writing', 'Interview Skills', 'Portfolio', 'Networking', 'Job Search'],
    learningObjectives: [
      'Build an IT-focused CV and cover letter',
      'Prepare for technical and behavioral interviews',
      'Create a portfolio showcasing your skills',
      'Use LinkedIn and networking to find opportunities'
    ]
  }
];

// -------- 150 QUIZ QUESTIONS (10 per module) --------
const ccpQuestions = {
  1: [
    { text: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correct: 0 },
    { text: 'Which is an example of hardware?', options: ['Windows 11', 'Google Chrome', 'A keyboard', 'A PDF file'], correct: 2 },
    { text: 'What is the correct order of the information processing cycle?', options: ['Output → Input → Process', 'Input → Process → Output', 'Process → Input → Output', 'Input → Output → Process'], correct: 1 },
    { text: 'Which of these is software?', options: ['RAM', 'Monitor', 'Microsoft Word', 'Motherboard'], correct: 2 },
    { text: 'What does "I/O" stand for?', options: ['Internal/Output', 'Input/Output', 'Instant/Operation', 'Internet/Online'], correct: 1 },
    { text: 'Which is an OUTPUT device?', options: ['Keyboard', 'Mouse', 'Monitor', 'Scanner'], correct: 2 },
    { text: 'Which is an INPUT device?', options: ['Speaker', 'Printer', 'Monitor', 'Microphone'], correct: 3 },
    { text: 'What is a computer?', options: ['An electronic device that processes data into information', 'A type of phone', 'A television screen', 'A power supply'], correct: 0 },
    { text: 'What does "data" mean in computing?', options: ['Finished report', 'Raw facts and figures', 'A type of software', 'A network'], correct: 1 },
    { text: 'What is information?', options: ['Raw data', 'Random numbers', 'Processed data with meaning', 'A backup file'], correct: 2 }
  ],
  2: [
    { text: 'What is the motherboard?', options: ['The screen', 'The main circuit board that connects all components', 'A cooling fan', 'A type of cable'], correct: 1 },
    { text: 'Which component performs calculations?', options: ['GPU', 'CPU', 'RAM', 'PSU'], correct: 1 },
    { text: 'What does RAM stand for?', options: ['Read Access Memory', 'Random Access Memory', 'Rapid Application Module', 'Remote Access Memory'], correct: 1 },
    { text: 'Which is a non-volatile storage device?', options: ['RAM', 'CPU cache', 'SSD', 'Registers'], correct: 2 },
    { text: 'What does PSU stand for?', options: ['Processor Storage Unit', 'Power Supply Unit', 'Primary System Unit', 'Peripheral Support Unit'], correct: 1 },
    { text: 'Which is faster for storage?', options: ['HDD', 'SSD', 'CD-ROM', 'Floppy disk'], correct: 1 },
    { text: 'What is a peripheral?', options: ['The CPU', 'Any external device connected to the computer', 'The motherboard', 'The power supply'], correct: 1 },
    { text: 'What type of port is commonly used for modern monitors?', options: ['VGA', 'HDMI', 'PS/2', 'Parallel'], correct: 1 },
    { text: 'Which component cools the CPU?', options: ['RAM', 'Heatsink + fan', 'SSD', 'GPU'], correct: 1 },
    { text: 'What is the role of the GPU?', options: ['Store files', 'Render graphics and images', 'Connect to the internet', 'Supply power'], correct: 1 }
  ],
  3: [
    { text: 'What is the fetch-decode-execute cycle?', options: ['A network protocol', 'The process by which a CPU runs instructions', 'A type of RAM', 'A storage method'], correct: 1 },
    { text: 'What does cache memory do?', options: ['Permanent storage', 'Speeds up CPU access to frequently used data', 'Connects to the internet', 'Renders graphics'], correct: 1 },
    { text: 'What does "dual-core" mean?', options: ['Two RAM sticks', 'Two CPUs on one chip', 'Two hard drives', 'Two monitors'], correct: 1 },
    { text: 'What is clock speed measured in?', options: ['Bytes', 'Hertz (GHz)', 'Meters', 'Watts'], correct: 1 },
    { text: 'Which cache level is closest to the CPU?', options: ['L1', 'L2', 'L3', 'L4'], correct: 0 },
    { text: 'What is hyperthreading?', options: ['Adding more RAM', 'Running two threads per core', 'A storage technology', 'A network protocol'], correct: 1 },
    { text: 'Which is an example of an x86 CPU?', options: ['Intel Core i7', 'Apple M2', 'Qualcomm Snapdragon', 'ARM Cortex'], correct: 0 },
    { text: 'What is RAM used for?', options: ['Permanent data storage', 'Temporary fast-access memory', 'Rendering graphics', 'Cooling the CPU'], correct: 1 },
    { text: 'What happens to RAM contents when power is lost?', options: ['They are saved automatically', 'They are lost', 'They are compressed', 'They are sent to the cloud'], correct: 1 },
    { text: 'What is the role of the memory controller?', options: ['Manage access between CPU and RAM', 'Store files permanently', 'Render graphics', 'Connect to Wi-Fi'], correct: 0 }
  ],
  4: [
    { text: 'What is a file system?', options: ['A way to organize and store files on a disk', 'A programming language', 'A type of RAM', 'A network protocol'], correct: 0 },
    { text: 'Which file system is used by Windows by default?', options: ['ext4', 'APFS', 'NTFS', 'FAT16'], correct: 2 },
    { text: 'What does partitioning a disk do?', options: ['Deletes all data', 'Splits it into logical sections', 'Encrypts the drive', 'Installs an OS'], correct: 1 },
    { text: 'Which is faster?', options: ['HDD', 'SSD', 'CD-ROM', 'Tape drive'], correct: 1 },
    { text: 'What does the 3-2-1 backup rule mean?', options: ['3 copies, 2 media types, 1 offsite', '3 disks, 2 servers, 1 cloud', '3 passwords, 2 users, 1 admin', '3 files, 2 folders, 1 zip'], correct: 0 },
    { text: 'What is a partition?', options: ['A type of file', 'A section of a storage device', 'A network segment', 'A user account'], correct: 1 },
    { text: 'What does SSD stand for?', options: ['Solid State Drive', 'Super Speed Disk', 'Simple Storage Device', 'Secure System Disk'], correct: 0 },
    { text: 'Which is a Linux file system?', options: ['NTFS', 'ext4', 'APFS', 'FAT32'], correct: 1 },
    { text: 'What is RAID used for?', options: ['Increase CPU speed', 'Combine disks for performance or redundancy', 'Encrypt files', 'Connect to the internet'], correct: 1 },
    { text: 'What is formatting a disk?', options: ['Deleting files', 'Preparing it with a file system', 'Encrypting it', 'Backing it up'], correct: 1 }
  ],
  5: [
    { text: 'What is the kernel?', options: ['The central part of the OS that manages hardware', 'A type of application', 'A network protocol', 'A file system'], correct: 0 },
    { text: 'Which is an operating system?', options: ['Windows', 'Microsoft Word', 'Google Chrome', 'Photoshop'], correct: 0 },
    { text: 'What is a process?', options: ['A running program', 'A saved file', 'A network cable', 'A user account'], correct: 0 },
    { text: 'What does GUI stand for?', options: ['Graphical User Interface', 'General User Input', 'Guided User Installation', 'Global Unified Interface'], correct: 0 },
    { text: 'What is a shell?', options: ['A command-line interface', 'A type of monitor', 'A storage device', 'A network port'], correct: 0 },
    { text: 'Which OS is open source?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correct: 2 },
    { text: 'What is multitasking?', options: ['Running multiple apps at once', 'Deleting files', 'Formatting a disk', 'Installing an OS'], correct: 0 },
    { text: 'What are user permissions?', options: ['Rules that control what users can do', 'Passwords only', 'Internet speeds', 'Screen brightness'], correct: 0 },
    { text: 'What is the purpose of a device driver?', options: ['Let the OS communicate with hardware', 'Encrypt files', 'Improve Wi-Fi', 'Speed up the CPU'], correct: 0 },
    { text: 'Which is a mobile OS?', options: ['Android', 'Ubuntu', 'Fedora', 'CentOS'], correct: 0 }
  ],
  6: [
    { text: 'What does IP stand for?', options: ['Internet Protocol', 'Internal Process', 'Instant Packet', 'Input Port'], correct: 0 },
    { text: 'How many layers in the OSI model?', options: ['4', '5', '6', '7'], correct: 3 },
    { text: 'What is a router?', options: ['Connects networks and routes traffic', 'Stores files', 'Prints documents', 'Renders graphics'], correct: 0 },
    { text: 'What is DNS?', options: ['Domain Name System', 'Digital Network Service', 'Data Node System', 'Direct Network Socket'], correct: 0 },
    { text: 'What is an IPv4 address made of?', options: ['4 numbers separated by dots', '6 letters', '8 binary digits', '3 words'], correct: 0 },
    { text: 'What does LAN stand for?', options: ['Local Area Network', 'Long Access Node', 'Large Area Network', 'Linked Access Network'], correct: 0 },
    { text: 'Which device connects multiple devices on a LAN?', options: ['Switch', 'Router', 'Modem', 'Firewall'], correct: 0 },
    { text: 'What is the purpose of a subnet mask?', options: ['Identify the network portion of an IP', 'Encrypt traffic', 'Increase speed', 'Assign MAC addresses'], correct: 0 },
    { text: 'What is a MAC address?', options: ['A unique hardware identifier', 'A type of IP', 'A network protocol', 'A file system'], correct: 0 },
    { text: 'Which protocol is used to load web pages?', options: ['HTTP', 'SMTP', 'FTP', 'SSH'], correct: 0 }
  ],
  7: [
    { text: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'Hyper Terminal Transfer Protocol', 'Home Tool Transfer Protocol'], correct: 0 },
    { text: 'What is HTTPS?', options: ['HTTP Secure', 'HTTP Standard', 'HTTP System', 'HTTP Server'], correct: 0 },
    { text: 'Which port is HTTPS by default?', options: ['80', '443', '21', '25'], correct: 1 },
    { text: 'What is a cookie?', options: ['A small piece of data stored by a website', 'A type of server', 'A programming language', 'A network device'], correct: 0 },
    { text: 'What is a CDN?', options: ['Content Delivery Network', 'Central Data Node', 'Cloud Domain Name', 'Cached Database Network'], correct: 0 },
    { text: 'What is an API?', options: ['Application Programming Interface', 'Advanced Protocol Interface', 'Automated Process Integration', 'App Private Input'], correct: 0 },
    { text: 'What is a URL?', options: ['Uniform Resource Locator', 'Universal Reference Line', 'Unified Routing Link', 'User Request Line'], correct: 0 },
    { text: 'What is the role of a web server?', options: ['Serve web pages to clients', 'Store cookies', 'Block ads', 'Run JavaScript'], correct: 0 },
    { text: 'What does "stateless" mean in HTTP?', options: ['Server forgets each request', 'Server never restarts', 'Client stores everything', 'No encryption'], correct: 0 },
    { text: 'What is JSON?', options: ['A data format', 'A browser', 'A server', 'A network protocol'], correct: 0 }
  ],
  8: [
    { text: 'What is a database?', options: ['An organized collection of data', 'A type of server', 'A network cable', 'A programming language'], correct: 0 },
    { text: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Question Logic', 'System Query Layer', 'Stored Query Language'], correct: 0 },
    { text: 'Which is a relational database?', options: ['MySQL', 'MongoDB', 'Redis', 'Cassandra'], correct: 0 },
    { text: 'What is a primary key?', options: ['A unique identifier for a row', 'A password', 'A foreign table', 'An index'], correct: 0 },
    { text: 'What does SELECT do in SQL?', options: ['Retrieve data', 'Delete data', 'Insert data', 'Update data'], correct: 0 },
    { text: 'Which is a NoSQL database?', options: ['MongoDB', 'PostgreSQL', 'Oracle', 'SQL Server'], correct: 0 },
    { text: 'What is an index used for?', options: ['Speed up queries', 'Encrypt data', 'Backup data', 'Sort files'], correct: 0 },
    { text: 'What is a foreign key?', options: ['A reference to another table\'s primary key', 'An encrypted field', 'A backup copy', 'A user account'], correct: 0 },
    { text: 'What is normalization?', options: ['Organizing data to reduce redundancy', 'Encrypting a database', 'Backing up data', 'Sharding data'], correct: 0 },
    { text: 'What does ACID stand for?', options: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Integrity, Data', 'Automatic, Consistent, Indexed, Distributed', 'Atomic, Cached, Indexed, Distributed'], correct: 0 }
  ],
  9: [
    { text: 'What is phishing?', options: ['A scam to steal credentials via fake messages', 'A type of firewall', 'A password manager', 'A network protocol'], correct: 0 },
    { text: 'What is encryption?', options: ['Converting data into an unreadable form', 'Deleting data', 'Backing up data', 'Compressing data'], correct: 0 },
    { text: 'What does MFA stand for?', options: ['Multi-Factor Authentication', 'Managed Firewall Access', 'Multi-File Archive', 'Manual File Audit'], correct: 0 },
    { text: 'What is malware?', options: ['Malicious software', 'A type of firewall', 'A network device', 'A backup tool'], correct: 0 },
    { text: 'What is a firewall?', options: ['Monitors and controls network traffic', 'Encrypts files', 'Backs up data', 'Renders graphics'], correct: 0 },
    { text: 'What is ransomware?', options: ['Malware that encrypts files and demands payment', 'A backup tool', 'A password manager', 'A browser extension'], correct: 0 },
    { text: 'What is a strong password?', options: ['Long, random, mixed characters', 'Your birthday', 'Your pet\'s name', '123456'], correct: 0 },
    { text: 'What is symmetric encryption?', options: ['Same key for encrypt and decrypt', 'Two different keys', 'No key', 'A hash only'], correct: 0 },
    { text: 'What is hashing?', options: ['A one-way function producing fixed-length output', 'Encryption with two keys', 'A type of password', 'A network protocol'], correct: 0 },
    { text: 'What is SQL injection?', options: ['An attack via malicious SQL input', 'A backup method', 'A file format', 'A network protocol'], correct: 0 }
  ],
  10: [
    { text: 'What is IaaS?', options: ['Infrastructure as a Service', 'Internet as a Service', 'Identity as a Service', 'Integration as a Service'], correct: 0 },
    { text: 'Which is a cloud provider?', options: ['AWS', 'Photoshop', 'Excel', 'Notepad'], correct: 0 },
    { text: 'What is SaaS?', options: ['Software as a Service', 'Storage as a Service', 'Security as a Service', 'Server as a Service'], correct: 0 },
    { text: 'What is virtualization?', options: ['Running multiple OSs on one physical machine', 'Backing up files', 'Encrypting data', 'Optimizing networks'], correct: 0 },
    { text: 'What is a container?', options: ['A lightweight isolated environment', 'A physical server', 'A backup file', 'A network device'], correct: 0 },
    { text: 'What is serverless?', options: ['Cloud model where you don\'t manage servers', 'A server without a CPU', 'A backup server', 'A network switch'], correct: 0 },
    { text: 'Which is not a major cloud provider?', options: ['Microsoft Azure', 'Google Cloud', 'AWS', 'Dell CloudOS'], correct: 3 },
    { text: 'What is auto-scaling?', options: ['Automatically adjusting resources', 'Automatically backing up', 'Automatically encrypting', 'Automatically deploying'], correct: 0 },
    { text: 'What is a region in cloud computing?', options: ['A geographic location with data centers', 'A subnet', 'A user group', 'A type of VM'], correct: 0 },
    { text: 'What is object storage?', options: ['Storage for unstructured data (files, media)', 'Storage for databases', 'Temporary memory', 'Block storage'], correct: 0 }
  ],
  11: [
    { text: 'What is Git?', options: ['A version control system', 'A programming language', 'A database', 'An IDE'], correct: 0 },
    { text: 'What does "commit" do in Git?', options: ['Save a snapshot of changes', 'Delete files', 'Push to remote', 'Merge branches'], correct: 0 },
    { text: 'What is a branch in Git?', options: ['An independent line of development', 'A file', 'A commit message', 'A remote server'], correct: 0 },
    { text: 'What is GitHub?', options: ['A platform for hosting Git repos', 'A programming language', 'A database', 'An operating system'], correct: 0 },
    { text: 'What does SDLC stand for?', options: ['Software Development Life Cycle', 'System Design Lifecycle', 'Source Data Language Controller', 'Software Deployment Log'], correct: 0 },
    { text: 'What is unit testing?', options: ['Testing individual components', 'Testing the whole system', 'Testing UI', 'Testing network'], correct: 0 },
    { text: 'What is debugging?', options: ['Finding and fixing bugs', 'Writing new code', 'Deploying code', 'Documenting code'], correct: 0 },
    { text: 'Which is a programming language?', options: ['Python', 'HTML', 'JSON', 'YAML'], correct: 0 },
    { text: 'What is a pull request?', options: ['A proposal to merge code changes', 'A command to fetch updates', 'A type of branch', 'A commit message'], correct: 0 },
    { text: 'What is CI/CD?', options: ['Continuous Integration / Continuous Deployment', 'Code Inspection / Code Delivery', 'Central Input / Central Distribution', 'Common Interface / Common Data'], correct: 0 }
  ],
  12: [
    { text: 'What is the first step in troubleshooting?', options: ['Identify the problem', 'Restart the machine', 'Replace hardware', 'Call the vendor'], correct: 0 },
    { text: 'What is a ticketing system?', options: ['Software to track IT issues', 'A printer', 'An OS', 'A cloud service'], correct: 0 },
    { text: 'What is remote support?', options: ['Helping users from a distance', 'On-site repair', 'Backup service', 'Cloud migration'], correct: 0 },
    { text: 'Why document solutions?', options: ['To help future troubleshooting', 'To fill space', 'To slow down work', 'To confuse users'], correct: 0 },
    { text: 'What is escalation?', options: ['Passing an issue to a higher tier', 'Closing a ticket', 'Deleting logs', 'Rebooting'], correct: 0 },
    { text: 'What is a knowledge base?', options: ['A repository of articles and solutions', 'A database of users', 'A network device', 'A backup'], correct: 0 },
    { text: 'What is RDP?', options: ['Remote Desktop Protocol', 'Rapid Data Processing', 'Runtime Debugging Platform', 'Router Data Port'], correct: 0 },
    { text: 'What is user training?', options: ['Teaching users to use systems', 'Fixing hardware', 'Backing up data', 'Installing OS'], correct: 0 },
    { text: 'What is a service-level agreement (SLA)?', options: ['A contract specifying service expectations', 'A type of ticket', 'A networking protocol', 'A backup strategy'], correct: 0 },
    { text: 'What is root cause analysis?', options: ['Finding the underlying cause of an issue', 'Rebooting the system', 'Escalating a ticket', 'Logging an issue'], correct: 0 }
  ],
  13: [
    { text: 'What is GDPR?', options: ['EU data protection law', 'A programming language', 'A cloud provider', 'A network protocol'], correct: 0 },
    { text: 'What is personal data?', options: ['Info that identifies a person', 'Public info', 'Server logs', 'Backup files'], correct: 0 },
    { text: 'What is consent?', options: ['Permission to process data', 'A password', 'A signature', 'A backup'], correct: 0 },
    { text: 'What is anonymization?', options: ['Removing identifying info from data', 'Encrypting data', 'Backing up data', 'Compressing data'], correct: 0 },
    { text: 'What is AI ethics?', options: ['Principles guiding responsible AI use', 'A type of AI', 'A programming language', 'A database'], correct: 0 },
    { text: 'What is the right to be forgotten?', options: ['Users can request deletion of their data', 'Users can delete their account', 'Users can hide their posts', 'Users can opt out of emails'], correct: 0 },
    { text: 'What is data minimization?', options: ['Collect only what you need', 'Delete all data', 'Store data forever', 'Encrypt all data'], correct: 0 },
    { text: 'What is a data breach?', options: ['Unauthorized access to data', 'A backup failure', 'A network outage', 'A password reset'], correct: 0 },
    { text: 'What is PII?', options: ['Personally Identifiable Information', 'Public Internet Info', 'Private Input Interface', 'Personal IP Identifier'], correct: 0 },
    { text: 'What is a privacy policy?', options: ['A document explaining data practices', 'A user manual', 'A password rule', 'A backup plan'], correct: 0 }
  ],
  14: [
    { text: 'What is AI?', options: ['Artificial Intelligence', 'Automated Input', 'Advanced Interface', 'Applied Integration'], correct: 0 },
    { text: 'What is machine learning?', options: ['AI that learns from data', 'Manual coding', 'A database', 'A programming language'], correct: 0 },
    { text: 'What is IoT?', options: ['Internet of Things', 'Input/Output Technology', 'Internet of Tasks', 'Internal Operating Table'], correct: 0 },
    { text: 'What is blockchain?', options: ['A distributed ledger technology', 'A programming language', 'A cloud provider', 'A network protocol'], correct: 0 },
    { text: 'What is quantum computing?', options: ['Computing using quantum bits (qubits)', 'Very fast CPUs', 'Cloud computing', 'A type of RAM'], correct: 0 },
    { text: 'What is AR?', options: ['Augmented Reality', 'Advanced Routing', 'Automated Response', 'Applied Research'], correct: 0 },
    { text: 'What is VR?', options: ['Virtual Reality', 'Variable Routing', 'Virtual Response', 'Verified Resource'], correct: 0 },
    { text: 'Which is an AI application?', options: ['Chatbots', 'Notepad', 'Calculator', 'Clock'], correct: 0 },
    { text: 'What is a smart device?', options: ['A device with internet connectivity and automation', 'A large computer', 'A backup drive', 'An old phone'], correct: 0 },
    { text: 'What is edge computing?', options: ['Processing data near the source', 'Cloud computing', 'Backup computing', 'Batch processing'], correct: 0 }
  ],
  15: [
    { text: 'What should a good CV include?', options: ['Skills, experience, education', 'Only photo', 'Only hobbies', 'Only name'], correct: 0 },
    { text: 'What is a cover letter?', options: ['A personalized letter for a job', 'A resume summary', 'A backup file', 'A reference letter'], correct: 0 },
    { text: 'What is a portfolio?', options: ['A showcase of your work', 'A file cabinet', 'A password', 'A backup'], correct: 0 },
    { text: 'What is a behavioral interview question?', options: ['Asks about past experiences', 'Tests coding', 'Tests math', 'Tests typing'], correct: 0 },
    { text: 'What is STAR method?', options: ['Situation, Task, Action, Result', 'Skills, Training, Attitude, Results', 'Study, Test, Apply, Review', 'Start, Test, Ask, Repeat'], correct: 0 },
    { text: 'What is LinkedIn used for?', options: ['Professional networking', 'Gaming', 'Shopping', 'Streaming'], correct: 0 },
    { text: 'How should you prepare for an interview?', options: ['Research the company + role', 'Show up late', 'Skip the prep', 'Wing it'], correct: 0 },
    { text: 'What is a technical interview?', options: ['A test of your skills', 'A casual chat', 'A written test', 'A group activity'], correct: 0 },
    { text: 'What is networking?', options: ['Building professional relationships', 'Setting up Wi-Fi', 'Connecting servers', 'Installing routers'], correct: 0 },
    { text: 'What should you do after an interview?', options: ['Send a thank-you email', 'Forget about it', 'Call 10 times', 'Post on social media'], correct: 0 }
  ]
};

async function run() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName, serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected');

    // ==================== BACKUP CURRENT CCP ====================
    const existingCCP = await Course.findOne({ courseId: 'ccp' });
    if (existingCCP) {
      const fs = require('fs');
      const backupPath = path.join(__dirname, `ccp-backup-${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(existingCCP.toObject(), null, 2));
      console.log('💾 Backed up existing CCP to:', backupPath);
    }

    // ==================== COMPUTE TOTAL MINUTES ====================
    const totalMinutes = ccpModules.reduce((sum, m) => sum + m.estimatedMinutes, 0);
    const totalXP = ccpModules.reduce((sum, m) => sum + m.xpReward, 0);

    // ==================== UPDATE CCP COURSE ====================
    const updates = {
      name: 'Computer Certified Professional (CCP)',
      abbreviation: 'CCP',
      level: 'Professional',
      description: 'Professional computing certification covering computer fundamentals, hardware, operating systems, networking, cybersecurity, and modern IT practices.',
      longDescription: 'The CCP certification is a comprehensive 15-module program covering the full spectrum of modern computing — from hardware fundamentals to cybersecurity, cloud, AI, and career readiness. Complete all modules and pass the final exam to earn your globally-recognized CCP credential.',
      examPrice: 150,
      pathPrice: 250,
      price: 150,
      icon: 'fa-microchip',
      bannerImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80',
      category: 'Development',
      color: 'purple',
      duration: '15 weeks',
      totalModules: ccpModules.length,
      totalMinutes,
      modules: ccpModules,
      learningOutcomes: [
        'Understand computer hardware, software, and operating systems',
        'Configure and troubleshoot basic networks',
        'Identify and mitigate common cybersecurity threats',
        'Explain cloud, AI, and emerging technologies',
        'Build a professional IT career foundation'
      ],
      careerPaths: [
        'IT Support Specialist',
        'Junior Systems Administrator',
        'Help Desk Technician',
        'Network Technician',
        'Cybersecurity Analyst (entry)'
      ],
      isActive: true,
      displayOrder: 1
    };

    const result = await Course.findOneAndUpdate(
      { courseId: 'ccp' },
      { $set: updates },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('✅ CCP updated:');
    console.log('   Total modules:', ccpModules.length);
    console.log('   Total study time:', Math.round(totalMinutes / 60 * 10) / 10, 'hours');
    console.log('   Total XP available:', totalXP);

    // ==================== SEED QUIZ QUESTIONS ====================
    let questionCount = 0;
    for (const moduleId of Object.keys(ccpQuestions)) {
      const qs = ccpQuestions[moduleId];
      // Delete old questions for this module
      await ExamQuestion.deleteMany({ courseId: 'ccp', moduleId: parseInt(moduleId) });
      // Insert new
      const toInsert = qs.map(q => ({
        courseId: 'ccp',
        moduleId: parseInt(moduleId),
        text: q.text,
        options: q.options,
        correct: q.correct,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await ExamQuestion.insertMany(toInsert);
      questionCount += toInsert.length;
      console.log(`   📝 Module ${moduleId}: ${toInsert.length} questions`);
    }

    console.log('\n🎉 DONE!');
    console.log('   ✅ 15 modules seeded');
    console.log('   ✅ ' + questionCount + ' quiz questions seeded');
    console.log('   ✅ Backed up old CCP to JSON');
    console.log('\n   Next: Restart the server and open /courses/ccp');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

run();
