require("dotenv").config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5001;

console.log(`\n🔧 ENVIRONMENT CHECK:`);
console.log(`   DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✅ Present (' + process.env.DEEPSEEK_API_KEY.substring(0, 12) + '...)' : '❌ MISSING'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Present' : '❌ MISSING'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Present (Atlas)' : '❌ MISSING'}`);
console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '❌ MISSING'}\n`);

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5001', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('📦 Loading route modules...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/community', require('./routes/community'));

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK',
    version: '10.0',
    database: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

const frontendPath = path.join(__dirname, '../frontend');
console.log(`📁 Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

// ==================== SEED ====================
async function seedDatabase() {
  const mongoose = require('mongoose');
  const User = require('./models/User');
  const Course = require('./models/Course');
  const ExamQuestion = require('./models/ExamQuestion');

  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('👤 No users found. Creating admin user...');
      const adminEmail = process.env.ADMIN_EMAIL || 'mutaurijoe@gmail.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'JOELMUTAURI@2005';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        avatar: 'A',
        xp: 0,
        level: 1,
        streak: 0,
        totalSpent: 0,
        enrolledCourses: 0
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      console.log(`👥 ${userCount} users in database`);
    }

    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      console.log('🌱 Seeding courses...');
      await Course.insertMany(getSeedCourses());
      console.log(`✅ Courses seeded`);
    } else {
      await Course.deleteMany({ courseId: { $in: ['ona', 'onp'] } });
      console.log(`📚 ${courseCount} courses in database`);
    }

    const questionCount = await ExamQuestion.countDocuments();
    if (questionCount < 50) {
      await ExamQuestion.deleteMany({});
      console.log('📝 Seeding exam questions...');
      await ExamQuestion.insertMany(getSeedQuestions());
      console.log(`✅ ${getSeedQuestions().length} exam questions seeded`);
    } else {
      console.log(`📝 ${questionCount} exam questions in database`);
    }
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  }
}

function getSeedCourses() {
  const mods = {
    ncp: ['Networking Fundamentals','IP Addressing & Subnetting','Routing Protocols','Switching & VLANs','WAN Technologies','Network Security Basics','Wireless Networking','Network Troubleshooting'],
    ccp: ['Computer Fundamentals','Hardware & Architecture','Operating Systems','Programming Basics','Networking Essentials','Database Fundamentals','Web Technologies','IT Support & Troubleshooting'],
    oca: ['Intro to Cybersecurity','Threat Landscape','Network Security Basics','Cryptography Fundamentals','Access Control & Authentication','Incident Response Basics'],
    ocp: ['Advanced Threat Analysis','Ethical Hacking','Penetration Testing','SOC Operations','Malware Analysis','Digital Forensics','Cloud Security','Compliance & Governance'],
    oce: ['Threat Intelligence','Advanced Forensics','Red Team Ops','Purple Team','Zero Day Research','ICS/SCADA Security','Blockchain Security','AI Security','Quantum Security','Security Architecture'],
    clp: ['Cloud Fundamentals','AWS Core','Azure Essentials','GCP','Docker & Containers','Kubernetes','Serverless','Cloud Security','DevOps & CI/CD','Cloud Migration'],
    aip: ['Intro to AI','Python for AI','Data Preprocessing','Supervised Learning','Unsupervised Learning','Neural Networks','Deep Learning','NLP','Computer Vision','Reinforcement Learning','AI Ethics','AI Deployment']
  };

  const list = [
    { courseId:'ncp',name:'Network Certified Professional (NCP)',abbreviation:'NCP',level:'Professional',description:'Professional networking certification covering switching, routing protocols, WAN technologies, network security, wireless networking, and troubleshooting.',examPrice:379,pathPrice:599,icon:'fa-network-wired',category:'Networking',color:'purple',enrolledCount:2156,duration:'7 weeks',totalModules:8},
    { courseId:'ccp',name:'Computer Certified Professional (CCP)',abbreviation:'CCP',level:'Professional',description:'Professional computing certification covering computer fundamentals, hardware, operating systems, programming, networking, databases, web tech, and IT support.',examPrice:429,pathPrice:679,icon:'fa-laptop-code',category:'Development',color:'blue',enrolledCount:1876,duration:'8 weeks',totalModules:8},
    { courseId:'one',name:'Oblixel Network Expert (ONE)',abbreviation:'ONE',level:'Expert',description:'Expert-level networking certification covering MPLS, BGP, SD-WAN, and network design.',examPrice:549,pathPrice:849,icon:'fa-crown',category:'Networking',color:'purple',enrolledCount:234,duration:'10 weeks',totalModules:10,prerequisite:'NCP'},
    { courseId:'oca',name:'Oblixel Cybersecurity Associate (OCA)',abbreviation:'OCA',level:'Associate',description:'Entry-level cybersecurity certification covering security fundamentals, threat types, and basic defense mechanisms.',examPrice:349,pathPrice:549,icon:'fa-shield-haltered',category:'Cybersecurity',color:'cyan',enrolledCount:1892,duration:'6 weeks',totalModules:6},
    { courseId:'ocp',name:'Oblixel Cybersecurity Professional (OCP)',abbreviation:'OCP',level:'Professional',description:'Professional cybersecurity certification covering ethical hacking, incident response, and security operations.',examPrice:449,pathPrice:699,icon:'fa-shield-virus',category:'Cybersecurity',color:'cyan',enrolledCount:1123,duration:'8 weeks',totalModules:8,prerequisite:'OCA'},
    { courseId:'oce',name:'Oblixel Cybersecurity Expert (OCE)',abbreviation:'OCE',level:'Expert',description:'Expert-level cybersecurity certification for security architects.',examPrice:599,pathPrice:899,icon:'fa-skull',category:'Cybersecurity',color:'cyan',enrolledCount:312,duration:'10 weeks',totalModules:10,prerequisite:'OCP'},
    { courseId:'ocp-core',name:'Oblixel Certified Professional (OCP Core)',abbreviation:'OCP',level:'Foundation',description:'Core professional certification covering essential workplace skills.',examPrice:199,pathPrice:349,icon:'fa-certificate',category:'Professional Skills',color:'gold',enrolledCount:3421,duration:'4 weeks',totalModules:4},
    { courseId:'tcp',name:'Telecommunications Certified Professional (TCP)',abbreviation:'TCP',level:'Professional',description:'Professional telecommunications certification covering VoIP, fiber optics, and 5G networks.',examPrice:399,pathPrice:629,icon:'fa-phone-alt',category:'Telecommunications',color:'green',enrolledCount:876,duration:'7 weeks',totalModules:7},
    { courseId:'wdp',name:'Web Development Professional (WDP)',abbreviation:'WDP',level:'Professional',description:'Full-stack web development certification covering HTML, CSS, JavaScript, React, and Node.js.',examPrice:449,pathPrice:699,icon:'fa-code',category:'Development',color:'blue',enrolledCount:3245,duration:'10 weeks',totalModules:10},
    { courseId:'adp',name:'App Development Professional (ADP)',abbreviation:'ADP',level:'Professional',description:'Mobile app development certification covering React Native, Flutter, iOS, and Android.',examPrice:479,pathPrice:729,icon:'fa-mobile-alt',category:'Development',color:'green',enrolledCount:1876,duration:'10 weeks',totalModules:10},
    { courseId:'dap',name:'Data Analytics Professional (DAP)',abbreviation:'DAP',level:'Professional',description:'Data analytics certification covering SQL, Python, Excel, Tableau, and data visualization.',examPrice:499,pathPrice:749,icon:'fa-chart-bar',category:'Data Science',color:'teal',enrolledCount:2341,duration:'9 weeks',totalModules:9},
    { courseId:'aip',name:'Artificial Intelligence Professional (AIP)',abbreviation:'AIP',level:'Professional',description:'AI certification covering machine learning, neural networks, NLP, and computer vision.',examPrice:599,pathPrice:899,icon:'fa-robot',category:'AI',color:'purple',enrolledCount:1654,duration:'12 weeks',totalModules:12},
    { courseId:'clp',name:'Cloud Computing Professional (CLP)',abbreviation:'CLP',level:'Professional',description:'Cloud certification covering AWS, Azure, GCP, Kubernetes, and serverless architecture.',examPrice:549,pathPrice:799,icon:'fa-cloud',category:'Cloud',color:'cyan',enrolledCount:2134,duration:'10 weeks',totalModules:10},
    { courseId:'dmp',name:'Digital Marketing Professional (DMP)',abbreviation:'DMP',level:'Professional',description:'Digital marketing certification covering SEO, SEM, social media, email, and content marketing.',examPrice:399,pathPrice:599,icon:'fa-chart-line',category:'Marketing',color:'orange',enrolledCount:2876,duration:'8 weeks',totalModules:8},
    { courseId:'bap',name:'Business Administration Professional (BAP)',abbreviation:'BAP',level:'Professional',description:'Business administration certification covering management, operations, and business strategy.',examPrice:379,pathPrice:579,icon:'fa-building',category:'Business',color:'navy',enrolledCount:1987,duration:'8 weeks',totalModules:8},
    { courseId:'fmp',name:'Financial Management Professional (FMP)',abbreviation:'FMP',level:'Professional',description:'Financial management certification covering accounting, budgeting, and financial analysis.',examPrice:429,pathPrice:649,icon:'fa-dollar-sign',category:'Finance',color:'green',enrolledCount:1654,duration:'8 weeks',totalModules:8},
    { courseId:'pmp',name:'Project Management Professional (PMP)',abbreviation:'PMP',level:'Professional',description:'Project management certification covering Agile, Scrum, Waterfall, and PMBOK methodologies.',examPrice:449,pathPrice:699,icon:'fa-tasks',category:'Management',color:'blue',enrolledCount:2987,duration:'8 weeks',totalModules:8},
    { courseId:'acp',name:'Accounting Certified Professional (ACP)',abbreviation:'ACP',level:'Professional',description:'Accounting certification covering financial accounting, managerial accounting, and tax basics.',examPrice:399,pathPrice:599,icon:'fa-calculator',category:'Finance',color:'teal',enrolledCount:1234,duration:'7 weeks',totalModules:7},
    { courseId:'hrp',name:'Human Resources Professional (HRP)',abbreviation:'HRP',level:'Professional',description:'HR certification covering recruitment, employee relations, compensation, and labor laws.',examPrice:379,pathPrice:579,icon:'fa-users',category:'Business',color:'pink',enrolledCount:1543,duration:'7 weeks',totalModules:7},
    { courseId:'mcp',name:'Mechanical Certified Professional (MCP)',abbreviation:'MCP',level:'Professional',description:'Mechanical engineering certification covering CAD, thermodynamics, and manufacturing processes.',examPrice:449,pathPrice:699,icon:'fa-cogs',category:'Engineering',color:'gray',enrolledCount:987,duration:'10 weeks',totalModules:10},
    { courseId:'ecp',name:'Electrical Certified Professional (ECP)',abbreviation:'ECP',level:'Professional',description:'Electrical engineering certification covering circuits, power systems, and electronics.',examPrice:449,pathPrice:699,icon:'fa-bolt',category:'Engineering',color:'yellow',enrolledCount:876,duration:'10 weeks',totalModules:10},
    { courseId:'acp-auto',name:'Automotive Certified Professional (ACP Auto)',abbreviation:'ACP-Auto',level:'Professional',description:'Automotive certification covering vehicle diagnostics, electrical systems, and modern auto tech.',examPrice:399,pathPrice:599,icon:'fa-car',category:'Automotive',color:'red',enrolledCount:765,duration:'8 weeks',totalModules:8},
    { courseId:'gdp',name:'Graphic Design Professional (GDP)',abbreviation:'GDP',level:'Professional',description:'Graphic design certification covering Photoshop, Illustrator, typography, and branding.',examPrice:379,pathPrice:579,icon:'fa-palette',category:'Design',color:'purple',enrolledCount:2345,duration:'8 weeks',totalModules:8},
    { courseId:'mep',name:'Media Editing Professional (MEP)',abbreviation:'MEP',level:'Professional',description:'Media editing certification covering Premiere Pro, After Effects, DaVinci Resolve, and Final Cut.',examPrice:399,pathPrice:599,icon:'fa-video',category:'Media',color:'red',enrolledCount:1567,duration:'8 weeks',totalModules:8},
    { courseId:'hsp',name:'Hardware Support Professional (HSP)',abbreviation:'HSP',level:'Professional',description:'Hardware support certification covering PC repair, troubleshooting, and IT support fundamentals.',examPrice:349,pathPrice:549,icon:'fa-desktop',category:'IT Support',color:'blue',enrolledCount:1987,duration:'6 weeks',totalModules:6},
    { courseId:'csp',name:'Customer Service Professional (CSP)',abbreviation:'CSP',level:'Professional',description:'Customer service certification covering communication, conflict resolution, and client management.',examPrice:299,pathPrice:499,icon:'fa-headset',category:'Service',color:'green',enrolledCount:2876,duration:'5 weeks',totalModules:5},
    { courseId:'esp',name:'Entrepreneurship Skills Professional (ESP)',abbreviation:'ESP',level:'Professional',description:'Entrepreneurship certification covering business planning, funding, marketing, and growth strategies.',examPrice:429,pathPrice:649,icon:'fa-lightbulb',category:'Business',color:'gold',enrolledCount:1432,duration:'8 weeks',totalModules:8},
    { courseId:'lcp',name:'Leadership Certified Professional (LCP)',abbreviation:'LCP',level:'Professional',description:'Leadership certification covering team management, decision making, and organizational behavior.',examPrice:399,pathPrice:599,icon:'fa-crown',category:'Leadership',color:'purple',enrolledCount:1876,duration:'6 weeks',totalModules:6},
    { courseId:'ttp',name:'Technical Training Professional (TTP)',abbreviation:'TTP',level:'Professional',description:'Technical training certification covering instructional design, delivery methods, and assessment.',examPrice:379,pathPrice:579,icon:'fa-chalkboard-teacher',category:'Education',color:'blue',enrolledCount:876,duration:'6 weeks',totalModules:6}
  ];

  return list.map(c => {
    const names = mods[c.courseId] || [];
    const modules = [];
    for (let i = 0; i < c.totalModules; i++) {
      modules.push({ moduleId: i+1, name: names[i] || `Module ${i+1}`, duration: '30 min', quizQuestions: 10, videoUrl: '' });
    }
    return { ...c, modules };
  });
}

function getSeedQuestions() {
  return [
    { courseId:'ncp',text:'What does the OSI model stand for?',options:['Open System Interconnection','Open Source Integration','Operating System Interface','Online Service Integration'],correct:0},
    { courseId:'ncp',text:'Which OSI layer handles routing?',options:['Layer 1','Layer 2','Layer 3','Layer 4'],correct:2},
    { courseId:'ncp',text:'What protocol ensures reliable delivery?',options:['UDP','TCP','IP','ICMP'],correct:1},
    { courseId:'ncp',text:'Class C default subnet mask?',options:['255.0.0.0','255.255.0.0','255.255.255.0','255.255.255.255'],correct:2},
    { courseId:'ncp',text:'Link-state routing protocol?',options:['RIP','BGP','OSPF','EIGRP'],correct:2},
    { courseId:'ncp',text:'Layer 2 device?',options:['Router','Switch','Hub','Repeater'],correct:1},
    { courseId:'ncp',text:'VLAN purpose?',options:['Speed','Broadcast segmentation','Replace routers','Encryption'],correct:1},
    { courseId:'ncp',text:'Auto IP assignment?',options:['DNS','DHCP','HTTP','FTP'],correct:1},
    { courseId:'ncp',text:'Gigabit Ethernet speed?',options:['100 Mbps','500 Mbps','1000 Mbps','10000 Mbps'],correct:2},
    { courseId:'ncp',text:'NAT stands for?',options:['Network Address Translation','Network Access Terminal','Node Auth Token','Network Allocation Table'],correct:0},
    { courseId:'ncp',text:'Firewall function?',options:['Speed network','Filter traffic','Assign IPs','Manage users'],correct:1},
    { courseId:'ncp',text:'5GHz WiFi?',options:['802.11b','802.11g','802.11n','802.11a'],correct:3},
    { courseId:'ncp',text:'Ping tests?',options:['Bandwidth','Connectivity','Encryption','DNS'],correct:1},
    { courseId:'ncp',text:'DNS function?',options:['Assign IPs','Resolve names to IPs','Encrypt data','Route packets'],correct:1},
    { courseId:'ncp',text:'BGP used for?',options:['LAN routing','Internet routing','Wireless','Firewall'],correct:1},
    { courseId:'ncp',text:'Ethernet cable?',options:['Coaxial','Fiber','Cat5e/Cat6','HDMI'],correct:2},
    { courseId:'ncp',text:'Loopback IP?',options:['192.168.1.1','10.0.0.1','127.0.0.1','255.255.255.0'],correct:2},
    { courseId:'ncp',text:'Secure remote access?',options:['Telnet','SSH','FTP','HTTP'],correct:1},
    { courseId:'ncp',text:'DDoS meaning?',options:['Data encryption','Distributed Denial of Service','Domain deletion','Data override'],correct:1},
    { courseId:'ncp',text:'Error detection layer?',options:['Physical','Data Link','Network','Application'],correct:1},
    { courseId:'ncp',text:'Router function?',options:['Connect networks','Amplify signal','Store data','Display pages'],correct:0},
    { courseId:'ncp',text:'VPN stands for?',options:['Virtual Private Network','Very Personal Network','Virtual Protocol Node','Verified Public Network'],correct:0},
    { courseId:'ncp',text:'QoS meaning?',options:['Quality of Service','Quick OS','Query Optimization','Quantum Standard'],correct:0},
    { courseId:'ncp',text:'Subnet mask purpose?',options:['Identify network vs host','Encrypt data','Speed routing','Assign IPs'],correct:0},
    { courseId:'ncp',text:'MPLS used in?',options:['Frame Relay','ATM','MPLS VPN','ISDN'],correct:2},
    { courseId:'ccp',text:'Brain of computer?',options:['RAM','CPU','Hard Drive','Power Supply'],correct:1},
    { courseId:'ccp',text:'RAM stands for?',options:['Random Access Memory','Read Always Memory','Rapid App Module','Remote Access'],correct:0},
    { courseId:'ccp',text:'Input device?',options:['Monitor','Printer','Keyboard','Speaker'],correct:2},
    { courseId:'ccp',text:'Computer number system?',options:['Decimal','Octal','Binary','Hexadecimal'],correct:2},
    { courseId:'ccp',text:'BIOS meaning?',options:['Basic Input Output System','Binary Integrated OS','Basic Integrated Software','Boot Input Service'],correct:0},
    { courseId:'ccp',text:'Open source OS?',options:['Windows','macOS','Linux','iOS'],correct:2},
    { courseId:'ccp',text:'GUI stands for?',options:['Graphical User Interface','General Utility Interface','Graphical Unified Integration','Global User Input'],correct:0},
    { courseId:'ccp',text:'HTTP meaning?',options:['HyperText Transfer Protocol','High Tech Transfer','HyperText Transmission','Host Transfer Protocol'],correct:0},
    { courseId:'ccp',text:'Web dev language?',options:['C++','Java','JavaScript','Assembly'],correct:2},
    { courseId:'ccp',text:'What is a database?',options:['Organized data collection','Hardware component','Network protocol','Operating system'],correct:0},
    { courseId:'ccp',text:'SQL stands for?',options:['Structured Query Language','Simple Question Language','System Quality Logic','Standard Query Link'],correct:0},
    { courseId:'ccp',text:'Cloud computing?',options:['Satellite computing','Internet-based services','No electricity','Weather simulation'],correct:1},
    { courseId:'ccp',text:'IP address?',options:['Provider Address','Unique network identifier','Internal Processing','Protocol Application'],correct:1},
    { courseId:'ccp',text:'HTML meaning?',options:['HyperText Markup Language','High Tech Modern Language','HyperTransfer Markup','Host Technology Language'],correct:0},
    { courseId:'ccp',text:'Malware?',options:['Malicious software','Hardware fault','Network error','OS bug'],correct:0},
    { courseId:'ccp',text:'OS main function?',options:['Manage hardware/software','Only run apps','Only store files','Only connect internet'],correct:0},
    { courseId:'ccp',text:'USB meaning?',options:['Universal Serial Bus','United System Bridge','Universal Service Buffer','Unified Storage Base'],correct:0},
    { courseId:'ccp',text:'Firewall purpose?',options:['Network security','File storage','Print documents','Run applications'],correct:0},
    { courseId:'ccp',text:'CSS meaning?',options:['Cascading Style Sheets','Computer Style System','Creative Style Software','Cascading System Styles'],correct:0},
    { courseId:'ccp',text:'Phishing?',options:['Fishing online','Fraud for sensitive info','Network testing','Database query'],correct:1},
    { courseId:'ccp',text:'Antivirus purpose?',options:['Speed up PC','Detect/remove malware','Create documents','Manage emails'],correct:1},
    { courseId:'ccp',text:'SSD?',options:['Solid State Drive','Super Speed Disk','System Storage Device','Serial Storage Disk'],correct:0},
    { courseId:'ccp',text:'URL meaning?',options:['Uniform Resource Locator','Universal Reference Link','Unified Resource Language','User Reference Locator'],correct:0},
    { courseId:'ccp',text:'Encryption?',options:['Converting data to code','Deleting data','Copying data','Moving data'],correct:0},
    { courseId:'ccp',text:'Router function?',options:['Forward packets','Store files','Display pages','Run apps'],correct:0},
    { courseId:'oca',text:'CIA triad?',options:['Confidentiality, Integrity, Availability','Control, Integration, Authentication','Confidentiality, Integration, Authorization','Control, Integrity, Availability'],correct:0},
    { courseId:'oca',text:'What is a vulnerability?',options:['A threat actor','A weakness to exploit','An attack method','A security tool'],correct:1},
    { courseId:'oca',text:'Least privilege?',options:['Give admin to all','Minimum access needed','No passwords','Share all data'],correct:1},
    { courseId:'oca',text:'Social engineering?',options:['Building networks','Manipulating people','Engineering apps','Creating platforms'],correct:1},
    { courseId:'oca',text:'MFA?',options:['One password','Two+ verification methods','Single sign-on','No authentication'],correct:1},
    { courseId:'oca',text:'Ransomware?',options:['Free software','Malware demanding payment','Antivirus','Network tool'],correct:1},
    { courseId:'oca',text:'Zero-day?',options:['Known patch','Unknown vulnerability attack','Day one bug','Security update'],correct:1},
    { courseId:'oca',text:'HTTPS provides?',options:['Faster browsing','Encrypted communication','More ads','File storage'],correct:1},
    { courseId:'oca',text:'IDS?',options:['Door lock','Intrusion Detection System','File manager','Email client'],correct:1},
    { courseId:'oca',text:'Brute force?',options:['Physical attack','Trying all passwords','Network scan','Social engineering'],correct:1},
    { courseId:'clp',text:'IaaS?',options:['Infrastructure as a Service','Integration as a Service','Internet as a Service','Information as a Service'],correct:0},
    { courseId:'clp',text:'Cloud deployment model?',options:['Public cloud','Personal cloud','Desktop cloud','Mobile cloud'],correct:0},
    { courseId:'clp',text:'Containerization?',options:['Shipping','Packaging apps','Database','Network routing'],correct:1},
    { courseId:'clp',text:'AWS S3?',options:['Computing','Object storage','Database','Email'],correct:1},
    { courseId:'clp',text:'Kubernetes?',options:['Language','Container orchestration','Database','OS'],correct:1},
    { courseId:'clp',text:'Serverless?',options:['No servers','Cloud manages servers','Physical only','No cloud'],correct:1},
    { courseId:'clp',text:'Auto-scaling?',options:['Manual','Automatic adjustment','Fixed','No scaling'],correct:1},
    { courseId:'clp',text:'CDN?',options:['Content Delivery Network','Cloud Data Node','Central Database','Customer Data'],correct:0},
    { courseId:'clp',text:'PaaS?',options:['Platform as a Service','Product as a Service','Process as a Service','Payment as a Service'],correct:0},
    { courseId:'clp',text:'Hybrid cloud?',options:['Private only','Public + Private','Public only','No cloud'],correct:1},
    { courseId:'aip',text:'Machine learning?',options:['Hard-coded rules','Algorithms learning from data','Manual calculations','Database queries'],correct:1},
    { courseId:'aip',text:'Neural network?',options:['Brain scan','Brain-inspired system','Internet network','Phone network'],correct:1},
    { courseId:'aip',text:'Supervised learning?',options:['No data','Labeled data','No labels','Unsupervised'],correct:1},
    { courseId:'aip',text:'NLP?',options:['Natural Language Processing','Network Layer Protocol','New Learning Platform','National Language Program'],correct:0},
    { courseId:'aip',text:'Deep learning?',options:['Surface learning','Many neural layers','Basic algorithms','Manual learning'],correct:1}
  ];
}

// ==================== START ====================
async function startServer() {
  const dbConnection = await connectDB();
  if (dbConnection) {
    await seedDatabase();
  } else {
    console.warn('⚠️ Running without MongoDB\n');
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 obliXel Academy v10.0 running on http://localhost:${PORT}`);
    console.log(`📚 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`   DeepSeek AI: ${process.env.DEEPSEEK_API_KEY ? '✅ Connected' : '❌ Fallback'}\n`);
  });
}

startServer();
module.exports = app;
