const express = require('express');
const router = express.Router();
const axios = require('axios');
const Course = require('../models/Course');

// ==================== AI CONFIGURATION ====================
function getAIConfig() {
  return {
    // OpenAI
    openai: {
      key: process.env.OPENAI_API_KEY || null,
      url: process.env.OPENAI_API_URL
        ? `${process.env.OPENAI_API_URL}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo'
    },
    // DeepSeek
    deepseek: {
      key: process.env.DEEPSEEK_API_KEY || null,
      url: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    },
    supportWhatsApp: process.env.SUPPORT_WHATSAPP || '+263714587259'
  };
}

// ==================== FORMAT RESPONSE HELPER ====================
function formatAIResponse(text) {
  if (!text) return text;

  let formatted = text;

  // Ensure double newlines before headings (lines that look like titles)
  formatted = formatted.replace(/\n([A-Z][A-Za-z\s]{2,40})\n/g, '\n\n$1\n');

  // Convert markdown bullets to • if not already
  formatted = formatted.replace(/^[-*]\s/gm, '• ');
  formatted = formatted.replace(/^(\d+)\.\s/gm, '$1. ');

  // Ensure line breaks between sections
  formatted = formatted.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');

  // Remove any markdown symbols
  formatted = formatted.replace(/\*\*/g, '');
  formatted = formatted.replace(/^###\s/gm, '');
  formatted = formatted.replace(/^##\s/gm, '');
  formatted = formatted.replace(/^#\s/gm, '');

  // Ensure bullets have proper spacing
  formatted = formatted.replace(/•/g, '\n•');
  formatted = formatted.replace(/^\n•/, '•'); // Remove leading newline before first bullet

  // Clean up excessive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

// ==================== CALL AI WITH DUAL PROVIDER ====================
async function callAI(systemPrompt, userMessage, history = []) {
  const config = getAIConfig();

  const messages = [{ role: 'system', content: systemPrompt }];

  if (history && Array.isArray(history)) {
    history.slice(-20).forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    });
  }

  messages.push({ role: 'user', content: userMessage });

  let aiResponse = null;
  let usedApi = null;

  // TRY OPENAI FIRST
  if (config.openai.key) {
    try {
      console.log('[AI] Trying OpenAI...');
      const response = await axios.post(
        config.openai.url,
        {
          model: config.openai.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${config.openai.key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      aiResponse = response.data.choices[0].message.content;
      usedApi = 'OpenAI';
      console.log('[AI] OpenAI responded successfully');
    } catch (openaiError) {
      console.log('[AI] OpenAI failed:', openaiError.message);
      aiResponse = null;
    }
  }

  // FALLBACK TO DEEPSEEK
  if (!aiResponse && config.deepseek.key) {
    try {
      console.log('[AI] Trying DeepSeek...');
      const response = await axios.post(
        config.deepseek.url,
        {
          model: config.deepseek.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${config.deepseek.key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      aiResponse = response.data.choices[0].message.content;
      usedApi = 'DeepSeek';
      console.log('[AI] DeepSeek responded successfully');
    } catch (deepseekError) {
      console.log('[AI] DeepSeek failed:', deepseekError.message);
      aiResponse = null;
    }
  }

  // If both failed and no API keys configured
  if (!aiResponse) {
    console.log('[AI] No AI provider available, using fallback');
    usedApi = 'Fallback';
  }

  return { response: aiResponse ? formatAIResponse(aiResponse) : null, usedApi };
}

// ==================== FORMATTING SYSTEM PROMPT ADDITION ====================
const FORMATTING_INSTRUCTION = `
FORMAT YOUR RESPONSES LIKE THIS:
• Use • bullet points for lists
• Use clear line breaks between sections
• Keep paragraphs short (2-3 sentences max)
• Never output a single large block of text
• Use spacing to make information easy to scan
• Separate different topics with blank lines
• Be friendly and conversational
`;

// ==================== PUBLIC AI CHAT (WIDGET) ====================
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  console.log(`[AI Widget] Chat: "${message?.substring(0, 80)}..."`);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const config = getAIConfig();

  try {
    const courses = await Course.find({ isActive: true }).select('courseId name examPrice pathPrice totalModules description');
    const coursesList = courses.map(c =>
      `• ${c.name} - $${c.examPrice} Exam / $${c.pathPrice} Path - ${c.totalModules} modules`
    ).join('\n');

    const systemPrompt = `You are OBliXel AI for OBliXel Academy (${courses.length} certifications).

📚 COURSES:
${coursesList}

📋 RULES:
• 25 questions, 60 min, 70% pass
• Failed = 7-day cooldown
• Complete all modules before final exam
• Vouchers = INSTANT enrollment, each code works ONCE
• Credit Card/PayPal/EcoCash = COMING SOON

📞 Support: ${config.supportWhatsApp}

${FORMATTING_INSTRUCTION}

Be friendly, helpful, and concise. Use the student's name if provided.`;

    const { response: aiResponse, usedApi } = await callAI(systemPrompt, message, history);

    if (aiResponse) {
      return res.json({
        success: true,
        response: aiResponse,
        usedApi,
        timestamp: new Date().toISOString()
      });
    }

    // Fallback response
    const fallbackResponse = formatAIResponse(getFallbackResponse(message, config));
    res.json({
      success: true,
      response: fallbackResponse,
      usedApi: 'Fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AI Widget] Error:', error.message);
    const fallbackResponse = formatAIResponse(getFallbackResponse(message, config));
    res.json({
      success: true,
      response: fallbackResponse,
      usedApi: 'Fallback'
    });
  }
});

// ==================== AI TEACHER (COURSE-SPECIFIC) ====================
router.post('/teacher/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { message, moduleContext } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  const config = getAIConfig();
  const teachers = {
    ncp: { name: 'Professor Carlos', title: 'Network Certified Instructor • 12 Years', avatar: '📡' },
    ccp: { name: 'Professor Sarah Chen', title: 'Computer Science Professor • 15 Years', avatar: '📚' },
    clp: { name: 'Professor Mike Ross', title: 'Cloud Architect • AWS Certified', avatar: '☁️' },
    aip: { name: 'Professor Nova Turing', title: 'AI Research Scientist', avatar: '🧠' },
    default: { name: 'Professor Sarah Chen', title: 'Senior Instructor', avatar: '📚' }
  };
  const teacher = teachers[courseId] || teachers.default;
  const course = await Course.findOne({ courseId }).select('name');

  try {
    const systemPrompt = `You are ${teacher.name}, ${teacher.title}, teaching at OBliXel Academy.

COURSE: ${course ? course.name : courseId}
CONTEXT: ${moduleContext || 'General course help'}

YOUR TEACHING STYLE:
• Be encouraging and patient
• Explain concepts clearly with examples
• Ask questions to check understanding
• Provide practical real-world applications
• Break complex topics into simple steps

${FORMATTING_INSTRUCTION}

Keep responses under 200 words unless the student asks for more detail. Use the student's name if you know it.`;

    const { response: aiResponse, usedApi } = await callAI(systemPrompt, message);

    if (aiResponse) {
      return res.json({
        success: true,
        response: aiResponse,
        teacher,
        usedApi,
        timestamp: new Date().toISOString()
      });
    }

    // Fallback
    const fallbackMsg = formatAIResponse(
      `I'm ${teacher.name}, your instructor for ${course ? course.name : 'this course'}.\n\n` +
      `Here's how I can help:\n` +
      `• Explain difficult concepts\n` +
      `• Provide study tips\n` +
      `• Share real-world examples\n` +
      `• Answer your questions\n\n` +
      `What would you like to learn about today?`
    );
    res.json({
      success: true,
      response: fallbackMsg,
      teacher,
      usedApi: 'Fallback'
    });
  } catch (error) {
    console.error('[AI Teacher] Error:', error.message);
    const fallbackMsg = formatAIResponse(
      `I'm ${teacher.name}, your instructor.\n\n` +
      `• Ask me anything about ${course ? course.name : 'your course'}\n` +
      `• I'm here to help you succeed\n\n` +
      `What would you like to know?`
    );
    res.json({
      success: true,
      response: fallbackMsg,
      teacher,
      usedApi: 'Fallback'
    });
  }
});

// ==================== GENERATE QUIZ ====================
router.post('/generate-quiz', async (req, res) => {
  const { courseId, moduleName, topic, numberOfQuestions = 10 } = req.body;

  const systemPrompt = `Generate ${numberOfQuestions} multiple-choice quiz questions about "${topic || moduleName}" for ${courseId}.

Return ONLY a JSON array in this exact format:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Make questions:
• Clear and concise
• At appropriate difficulty level
• With plausible wrong answers
• Covering key concepts`;

  try {
    const { response: aiResponse, usedApi } = await callAI(systemPrompt, `Generate ${numberOfQuestions} specific quiz questions about ${topic || moduleName}.`);

    if (aiResponse) {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const quizData = JSON.parse(jsonMatch[0]);
          return res.json({ success: true, quiz: quizData, usedApi });
        } catch (parseError) {
          console.log('[AI Quiz] JSON parse failed, using fallback');
        }
      }
    }

    res.json({ success: true, quiz: generateFallbackQuiz(topic || moduleName, numberOfQuestions), usedApi: 'Fallback' });
  } catch (error) {
    console.error('[AI Quiz] Error:', error.message);
    res.json({ success: true, quiz: generateFallbackQuiz(topic || moduleName, numberOfQuestions), usedApi: 'Fallback' });
  }
});

// ==================== GENERATE NOTES ====================
router.post('/generate-notes', async (req, res) => {
  const { courseId, moduleName, content } = req.body;

  const systemPrompt = `Generate comprehensive study notes for "${moduleName}".

FORMAT YOUR RESPONSE:
• Use • bullet points for key concepts
• Create clear section headings in UPPERCASE
• Keep each bullet point concise (1-2 sentences)
• Add practical examples where helpful
• Include study tips and memory aids
• 200-400 words total
• No markdown symbols like ** or #

Structure:
1. KEY CONCEPTS (4-6 bullets)
2. IMPORTANT DETAILS (4-6 bullets)
3. REAL-WORLD APPLICATIONS (2-3 bullets)
4. STUDY TIPS (2-3 bullets)
5. QUICK SUMMARY (2-3 sentences)`;

  try {
    const { response: aiResponse, usedApi } = await callAI(systemPrompt, `Generate study notes for ${moduleName}.`);

    if (aiResponse) {
      return res.json({ success: true, notes: aiResponse, usedApi });
    }

    res.json({ success: true, notes: formatAIResponse(generateFallbackNotes(moduleName)), usedApi: 'Fallback' });
  } catch (error) {
    console.error('[AI Notes] Error:', error.message);
    res.json({ success: true, notes: formatAIResponse(generateFallbackNotes(moduleName)), usedApi: 'Fallback' });
  }
});

// ==================== FALLBACK FUNCTIONS ====================
function getFallbackResponse(message, config) {
  const lowerMsg = message.toLowerCase();

  let response = '';

  if (lowerMsg.includes('support') || lowerMsg.includes('whatsapp')) {
    response = `You can reach our support team through:\n\n• WhatsApp: ${config.supportWhatsApp}\n• Email: support@oblixel.com\n\nWe typically respond within a few hours.`;
  } else if (lowerMsg.includes('ncp')) {
    response = `Network Certified Professional (NCP):\n\n• 8 comprehensive modules\n• Networking certification\n• $379 Exam Only / $599 Learning Path\n• Covers OSI model, routing, switching, security\n• Final exam: 25 questions, 60 min, 70% to pass`;
  } else if (lowerMsg.includes('ccp')) {
    response = `Computer Certified Professional (CCP):\n\n• 8 comprehensive modules\n• Computing certification\n• $429 Exam Only / $679 Learning Path\n• Covers hardware, OS, programming, databases\n• Final exam: 25 questions, 60 min, 70% to pass`;
  } else if (lowerMsg.includes('voucher')) {
    response = `About Vouchers:\n\n• Vouchers provide instant enrollment\n• Each voucher code works ONCE\n• Enter your code at checkout\n• Discounts can be percentage (%) or fixed amount ($)\n• Some vouchers give FREE enrollment\n\nContact support if your voucher isn't working.`;
  } else if (lowerMsg.includes('exam')) {
    response = `Certification Exam Details:\n\n• 25 multiple-choice questions\n• 60 minutes time limit\n• 70% required to pass\n• Failed exams have a 7-day cooldown\n• Complete all modules before taking the final exam\n• Certificate code issued upon passing`;
  } else if (lowerMsg.includes('certificate') || lowerMsg.includes('code')) {
    response = `Certificate Codes:\n\n• Generated upon passing the final exam (70%+)\n• Format: OBX-{COURSE}-{CODE} (e.g., OBX-NCP-A7X92K)\n• Show this code to the academics team\n• Contact: ${config.supportWhatsApp}\n• Codes can be verified on our platform`;
  } else if (lowerMsg.includes('module') || lowerMsg.includes('progress')) {
    response = `Module Structure:\n\n• Each course has 8 modules\n• Modules unlock one at a time\n• Each module has a 10-question exam (70% to pass)\n• Complete all 8 modules to unlock the final exam\n• Track your progress on the course dashboard`;
  } else {
    response = `Welcome to OBliXel Academy! Here's what I can help with:\n\n• Course information (NCP, CCP, and more)\n• Exam preparation and requirements\n• Voucher codes and enrollment\n• Certificate codes and claiming\n• Technical support\n\nWhat would you like to know about?`;
  }

  return response;
}

function generateFallbackQuiz(topic, count) {
  const questions = [
    {
      question: `What is the most important first step when learning ${topic}?`,
      options: [
        'Understanding core fundamentals',
        'Memorizing everything immediately',
        'Skipping to advanced topics',
        'Only watching videos without practice'
      ],
      correctAnswer: 0
    },
    {
      question: `Which approach is best for mastering ${topic}?`,
      options: [
        'Passive reading only',
        'Active practice and hands-on learning',
        'Listening to lectures once',
        'Cramming before the exam'
      ],
      correctAnswer: 1
    },
    {
      question: `What is essential for retaining knowledge in ${topic}?`,
      options: [
        'Natural talent only',
        'Consistent practice and review',
        'Expensive equipment',
        'Studying only when motivated'
      ],
      correctAnswer: 1
    },
    {
      question: `How should you prepare for a ${topic} assessment?`,
      options: [
        'Review notes and practice quizzes',
        'Skip preparation entirely',
        'Only memorize definitions',
        'Ask others for answers'
      ],
      correctAnswer: 0
    },
    {
      question: `What is the most valuable resource for learning ${topic}?`,
      options: [
        'Social media opinions',
        'Official documentation and hands-on labs',
        'Rumors and hearsay',
        'Outdated textbooks only'
      ],
      correctAnswer: 1
    },
    {
      question: `What is a common mistake beginners make in ${topic}?`,
      options: [
        'Taking detailed notes',
        'Skipping fundamental concepts',
        'Practicing regularly',
        'Asking questions when confused'
      ],
      correctAnswer: 1
    },
    {
      question: `Why is ${topic} important in today's world?`,
      options: [
        'It has no real importance',
        'It provides foundational skills for many careers',
        'It is only useful for passing tests',
        'Employers do not value it'
      ],
      correctAnswer: 1
    },
    {
      question: `How often should you review ${topic} material?`,
      options: [
        'Once and never again',
        'Regular spaced repetition for best retention',
        'Only right before the exam',
        'Whenever you feel like it'
      ],
      correctAnswer: 1
    },
    {
      question: `What is the best way to test your ${topic} knowledge?`,
      options: [
        'Avoid testing to not feel bad',
        'Practice quizzes and hands-on exercises',
        'Only re-read your notes',
        'Wait for the final exam only'
      ],
      correctAnswer: 1
    },
    {
      question: `What mindset leads to success in ${topic}?`,
      options: [
        'Fixed mindset - talent is everything',
        'Growth mindset - skills develop with effort',
        'Competitive mindset - beat everyone else',
        'Passive mindset - just attend and listen'
      ],
      correctAnswer: 1
    }
  ];

  // Shuffle and return requested count
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, 10));
}

function generateFallbackNotes(moduleName) {
  return `
${moduleName.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY CONCEPTS

• Understanding core fundamentals builds the foundation for advanced knowledge
• Each concept connects to real-world applications and practical scenarios
• Regular practice and consistent review strengthens long-term retention
• Applying concepts through hands-on exercises deepens understanding
• Connecting new information to existing knowledge improves learning speed

IMPORTANT DETAILS

• Start with basic principles and progress systematically through each topic
• Apply concepts through practical exercises and hands-on practice labs
• Test your knowledge regularly with self-assessment and practice quizzes
• Review challenging material using spaced repetition techniques
• Connect new information to concepts you already understand well

REAL-WORLD APPLICATIONS

• These concepts are used daily in professional IT environments
• Understanding these fundamentals prepares you for advanced certifications
• Practical application in lab environments simulates real workplace scenarios

STUDY TIPS

• Set aside dedicated study time each day for consistent progress
• Take detailed notes organized by topic and subtopic for easy review
• Explain concepts aloud to reinforce understanding and identify gaps
• Join study groups to discuss difficult topics and share perspectives
• Use multiple learning resources for comprehensive topic coverage

QUICK SUMMARY

${moduleName} requires dedication and consistent effort to master. Focus on understanding concepts deeply rather than memorizing. Combine theoretical study with practical application for the best results in your certification journey.

---
OBliXel Academy • ${new Date().toLocaleDateString()}`;
}

module.exports = router;
