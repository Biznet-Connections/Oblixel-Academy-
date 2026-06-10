const express = require('express');
const router = express.Router();
const axios = require('axios');
const { readJSON } = require('../utils/jsonDB');

// API Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || '+263714587259';

// AI Teacher profiles for each course
const AI_TEACHERS = {
  cyber: {
    name: 'Dr. Sarah Chen',
    title: 'Senior SOC Analyst, 15 years experience',
    avatar: '👩‍🏫',
    personality: 'strict but caring cybersecurity expert',
    systemPrompt: `You are Dr. Sarah Chen, a strict but caring cybersecurity expert teaching the Cybersecurity Expert course. You have 15 years of SOC experience. You're direct and don't sugarcoat security risks. You say things like "Security is serious. Every mistake can be breach." You use real-world examples from your career. You're proud when students succeed but push them hard. Keep responses under 150 words unless explaining complex topics.`
  },
  cloud: {
    name: 'Professor Mike Ross',
    title: 'Cloud Architect, AWS Certified',
    avatar: '👨‍🏫',
    personality: 'fun, energetic, uses memes',
    systemPrompt: `You are Professor Mike Ross, a fun and energetic cloud engineering teacher. You love dad jokes about the cloud. You say things like "The cloud is just someone else's computer!" You use memes and analogies to explain complex topics. You're very encouraging and believe anyone can learn cloud. Keep responses under 150 words.`
  },
  ai: {
    name: 'Dr. Nova Turing',
    title: 'AI Research Scientist',
    avatar: '🤖',
    personality: 'curious, futuristic, loves deep dives',
    systemPrompt: `You are Dr. Nova Turing, an AI research scientist teaching AI Engineering. You're fascinated by neural networks and always curious. You say things like "Neural networks are like brains — let me explain how they learn." You love deep dives but also simplify complex topics. Keep responses under 150 words.`
  },
  zte: {
    name: 'Eng. David Kim',
    title: '5G Network Engineer, ZTE Certified',
    avatar: '👨‍🔧',
    personality: 'patient, detailed, uses diagrams',
    systemPrompt: `You are Eng. David Kim, a patient and detailed 5G engineering teacher. You love diagrams and visual explanations. You say things like "5G is fast — but understanding the protocol stack is faster." You're very thorough and never skip steps. Keep responses under 150 words.`
  },
  ccna: {
    name: 'Coach Carlos',
    title: 'Cisco Certified Instructor',
    avatar: '🏈',
    personality: 'motivational, sports-like energy',
    systemPrompt: `You are Coach Carlos, a motivational networking teacher with sports energy. You say things like "Subnetting is like learning a sport. Practice daily, and you'll master it!" You're encouraging and push students to practice. Keep responses under 150 words.`
  },
  devops: {
    name: 'Captain Clara',
    title: 'DevOps Engineer',
    avatar: '👩‍✈️',
    personality: 'systematic, automation lover',
    systemPrompt: `You are Captain Clara, a DevOps engineer who loves automation. You say things like "Infrastructure as code is the way!" You're systematic and methodical. Keep responses under 150 words.`
  },
  aws: {
    name: 'Architect Alan',
    title: 'AWS Solutions Architect',
    avatar: '🏗️',
    personality: 'big-picture thinker',
    systemPrompt: `You are Architect Alan, an AWS Solutions Architect. You think about the big picture and design patterns. You say things like "Design for failure, nothing fails." Keep responses under 150 words.`
  },
  python: {
    name: 'Pyra',
    title: 'Python Developer',
    avatar: '🐍',
    personality: 'friendly, beginner-focused',
    systemPrompt: `You are Pyra, a friendly Python teacher. You love helping beginners and say things like "Python is simple — let me show you how!" Keep responses under 150 words.`
  },
  linux: {
    name: 'Linus',
    title: 'Linux System Admin',
    avatar: '🐧',
    personality: 'old-school, precise, loves terminal',
    systemPrompt: `You are Linus, a Linux system administrator. You love the terminal and precise commands. You say things like "Everything is a file in Linux." Keep responses under 150 words.`
  }
};

const DEFAULT_TEACHER = {
  name: 'Dr. Sarah Chen',
  title: 'Course Instructor',
  avatar: '👩‍🏫',
  personality: 'helpful, knowledgeable',
  systemPrompt: `You are Dr. Sarah Chen, a helpful and knowledgeable course instructor. You're passionate about teaching and helping students succeed. You explain concepts clearly and use real-world examples. Keep responses under 150 words.`
};

// ==================== PUBLIC AI CHAT (NO AUTH REQUIRED) ====================
router.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  console.log(`[AI Assistant] Public chat: "${message.substring(0, 50)}..."`);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const systemPrompt = `You are OBliXel AI, a helpful study assistant for OBliXel Academy, a professional certification platform with 21+ courses in Cybersecurity, Cloud, AI, CCNA, DevOps, and more.

IMPORTANT: If a user asks for human support or help with payments/account issues, give them this WhatsApp number: ${SUPPORT_WHATSAPP}. Say "You can reach our support team on WhatsApp at ${SUPPORT_WHATSAPP}"

Your role:
- Help students prepare for certification exams
- Provide study tips and exam strategies
- Explain technical concepts in simple terms
- Be encouraging and supportive
- Keep responses concise but helpful
- Never give direct exam answers (cheating), but guide learning
- Recommend courses based on user's interests

If asked about specific exam answers, explain the concept instead.
If asked about pricing or enrollment, direct them to browse courses.
Be friendly and professional.`;

    let aiResponse = null;
    let usedApi = null;

    // Try DeepSeek first
    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      aiResponse = response.data.choices[0].message.content;
      usedApi = 'DeepSeek';
    } catch (deepseekError) {
      console.log('[AI] DeepSeek failed, using fallback');
      aiResponse = getFallbackResponse(message, []);
      usedApi = 'Fallback';
    }

    console.log(`[AI Assistant] Response from ${usedApi}: "${aiResponse.substring(0, 100)}..."`);

    res.json({
      success: true,
      response: aiResponse,
      usedApi,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Assistant] Error:', error.message);
    const fallback = getFallbackResponse(message, []);
    res.json({
      success: true,
      response: fallback,
      usedApi: 'Fallback',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== AI TEACHER (WITH AUTH - NEEDS ENROLLMENT) ====================
router.post('/teacher/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { message, moduleContext } = req.body;

  console.log(`[AI Teacher] ${courseId} teacher asked: "${message.substring(0, 50)}..."`);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const teacher = AI_TEACHERS[courseId] || DEFAULT_TEACHER;

  try {
    const systemPrompt = `${teacher.systemPrompt}

Course: ${courseId}
Current module context: ${moduleContext || 'General course help'}

Teaching guidelines:
- Be encouraging but don't give direct exam answers
- Explain concepts thoroughly
- Use your unique personality (${teacher.personality})
- If student asks about enrollment, direct them to the courses page
- Keep responses helpful and concise`;

    let aiResponse = null;
    let usedApi = null;

    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 600
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      aiResponse = response.data.choices[0].message.content;
      usedApi = 'DeepSeek';
    } catch (error) {
      console.log(`[AI Teacher] DeepSeek failed, using fallback`);
      aiResponse = getTeacherFallbackResponse(message, teacher);
      usedApi = 'Fallback';
    }

    res.json({
      success: true,
      response: aiResponse,
      teacher: {
        name: teacher.name,
        title: teacher.title,
        avatar: teacher.avatar
      },
      usedApi,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Teacher] Error:', error.message);
    res.json({
      success: true,
      response: `I'm ${teacher.name}, your ${teacher.title}. I'm here to help you learn! What would you like to know about ${courseId}?`,
      teacher: {
        name: teacher.name,
        title: teacher.title,
        avatar: teacher.avatar
      },
      usedApi: 'Fallback',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== GENERATE QUIZ QUESTIONS (AI) ====================
router.post('/generate-quiz', async (req, res) => {
  const { courseId, moduleName, topic, numberOfQuestions = 5 } = req.body;

  console.log(`[AI Quiz] Generating ${numberOfQuestions} questions for ${moduleName || topic}`);

  const teacher = AI_TEACHERS[courseId] || DEFAULT_TEACHER;

  const systemPrompt = `You are ${teacher.name}, a ${teacher.personality} teacher. Generate ${numberOfQuestions} multiple-choice quiz questions about "${topic || moduleName}".

IMPORTANT: Return ONLY valid JSON in this exact format:
[
  {
    "question": "What is the question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Where correctAnswer is the index (0-3) of the correct option.
Make questions challenging but fair. Cover key concepts.`;

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${numberOfQuestions} quiz questions about ${topic || moduleName} for the ${courseId} course.` }
      ],
      temperature: 0.7,
      max_tokens: 1500
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    let quizData = response.data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = quizData.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      quizData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Invalid JSON response');
    }

    res.json({
      success: true,
      quiz: quizData,
      teacher: teacher.name
    });
  } catch (error) {
    console.error('[AI Quiz] Error:', error.message);
    // Return fallback quiz
    const fallbackQuiz = generateFallbackQuiz(moduleName || topic, numberOfQuestions);
    res.json({
      success: true,
      quiz: fallbackQuiz,
      teacher: teacher.name,
      note: 'Using fallback quiz - AI service temporarily unavailable'
    });
  }
});

// ==================== GENERATE STUDY NOTES (AI) ====================
router.post('/generate-notes', async (req, res) => {
  const { courseId, moduleName, content } = req.body;

  console.log(`[AI Notes] Generating notes for ${moduleName}`);

  const teacher = AI_TEACHERS[courseId] || DEFAULT_TEACHER;

  const systemPrompt = `You are ${teacher.name}, a ${teacher.personality} teacher. Generate comprehensive study notes for "${moduleName}".

Format the notes as markdown with:
- Clear headings
- Bullet points for key concepts
- Important terms in **bold**
- Summary at the end

Keep notes concise but thorough (200-400 words).`;

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate study notes for ${moduleName}. ${content ? `Content context: ${content.substring(0, 300)}` : ''}` }
      ],
      temperature: 0.5,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.json({
      success: true,
      notes: response.data.choices[0].message.content,
      teacher: teacher.name
    });
  } catch (error) {
    console.error('[AI Notes] Error:', error.message);
    res.json({
      success: true,
      notes: generateFallbackNotes(moduleName),
      teacher: teacher.name,
      note: 'Using fallback notes - AI service temporarily unavailable'
    });
  }
});

// ==================== FALLBACK FUNCTIONS ====================
function getFallbackResponse(message, enrollments) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('whatsapp') || lowerMsg.includes('support') || lowerMsg.includes('help')) {
    return `You can reach our human support team on WhatsApp at ${SUPPORT_WHATSAPP}. They're available Monday-Friday, 9 AM - 5 PM.`;
  }

  if (lowerMsg.includes('ccna') || lowerMsg.includes('cisco')) {
    return "CCNA certification requires understanding networking fundamentals, subnetting, routing protocols (OSPF, EIGRP), and switching concepts. I recommend starting with our CCNA course and practicing with Packet Tracer! Need help with a specific topic?";
  }

  if (lowerMsg.includes('security') || lowerMsg.includes('cyber')) {
    return "Cybersecurity certifications cover risk management, cryptography, network security, and incident response. Our Cybersecurity Expert course is a great starting point! What specific area interests you?";
  }

  if (lowerMsg.includes('cloud') || lowerMsg.includes('aws')) {
    return "Cloud certifications focus on AWS, Azure, or GCP services, architecture best practices, and deployment strategies. Our Cloud Engineering course covers the fundamentals! Which cloud provider are you most interested in?";
  }

  if (lowerMsg.includes('exam') || lowerMsg.includes('test')) {
    return "Our certification exams have 25 questions, 60 minutes time limit, and require 70% to pass. Failed exams have a 7-day cooldown period. Would you like tips for exam preparation?";
  }

  return `Great question! I'm here to help you succeed with your certification journey. Check out our 21+ courses on the Courses page. What specific topic would you like to learn about?`;
}

function getTeacherFallbackResponse(message, teacher) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('help') || lowerMsg.includes('explain')) {
    return `I'd be happy to explain that! What specific concept are you struggling with? Let me know and I'll break it down for you.`;
  }

  if (lowerMsg.includes('exam') || lowerMsg.includes('test')) {
    return `Preparing for the certification exam? Focus on understanding core concepts first, then practice with our sample questions. Would you like me to create a custom study plan for you?`;
  }

  if (lowerMsg.includes('practice') || lowerMsg.includes('quiz')) {
    return `Practice is key to mastering this material! I can generate some practice questions for you. What topic would you like to focus on?`;
  }

  return `Thanks for your question! I'm here to help you master this course. Could you tell me more about what you'd like to learn?`;
}

function generateFallbackQuiz(topic, count) {
  const fallbackQuestions = [
    {
      question: `What is the most important concept to understand in ${topic}?`,
      options: ['Theory and fundamentals', 'Practical application', 'Both theory and practice', 'Memorization'],
      correctAnswer: 2
    },
    {
      question: `Which skill is most valuable for mastering ${topic}?`,
      options: ['Critical thinking', 'Memorization', 'Speed reading', 'Copy-pasting'],
      correctAnswer: 0
    },
    {
      question: `How should you approach learning ${topic}?`,
      options: ['Study once and done', 'Practice regularly', 'Only watch videos', 'Only read books'],
      correctAnswer: 1
    },
    {
      question: `What is key to passing certification exams for ${topic}?`,
      options: ['Understanding concepts', 'Memorizing answers', 'Last minute cramming', 'Skipping difficult topics'],
      correctAnswer: 0
    },
    {
      question: `Which resource is most helpful for ${topic}?`,
      options: ['Official documentation', 'Practice exams', 'Hands-on labs', 'All of the above'],
      correctAnswer: 3
    }
  ];
  
  return fallbackQuestions.slice(0, Math.min(count, 5));
}

function generateFallbackNotes(moduleName) {
  return `# 📚 Study Notes: ${moduleName}

## Key Concepts
- **Understanding fundamentals** is crucial for mastering this topic
- **Regular practice** helps reinforce learning
- **Real-world applications** connect theory to practice

## Important Points
• Focus on core principles first
• Use multiple learning resources
• Test your knowledge with practice questions
• Review difficult concepts regularly

## Summary
${moduleName} requires consistent effort and practical application. Combine theoretical study with hands-on practice for best results.

---
*Notes generated by OBliXel AI Assistant*`;
}

module.exports = router;
