const express = require('express');
const router = express.Router();
const axios = require('axios');
const Course = require('../models/Course');

function getDeepSeekConfig() {
  return {
    url: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
    key: process.env.DEEPSEEK_API_KEY || null,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    supportWhatsApp: process.env.SUPPORT_WHATSAPP || '+263714587259'
  };
}

// ==================== PUBLIC AI CHAT ====================
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  console.log(`[AI Widget] Chat: "${message?.substring(0, 80)}..."`);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const config = getDeepSeekConfig();

  try {
    // Get courses from MongoDB
    const courses = await Course.find({ isActive: true }).select('courseId name examPrice pathPrice totalModules description');
    const coursesList = courses.map(c =>
      `• ${c.name} - $${c.examPrice} Exam / $${c.pathPrice} Path - ${c.totalModules} modules`
    ).join('\n');

    const systemPrompt = `You are OBliXel AI for OBliXel Academy (${courses.length} certifications).

📚 COURSES:
${coursesList}

📋 RULES: 25 questions, 60 min, 70% pass. Failed = 7-day cooldown. Complete all modules before final exam.
🎟️ Vouchers = INSTANT enrollment. Each code works ONCE.
💳 Credit Card/PayPal/EcoCash = COMING SOON.
📞 Support: ${config.supportWhatsApp}

Be friendly, helpful, and concise.`;

    const messages = [{ role: 'system', content: systemPrompt }];
    if (history && Array.isArray(history)) {
      history.slice(-20).forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    messages.push({ role: 'user', content: message });

    let aiResponse = null;
    let usedApi = null;

    if (config.key) {
      try {
        const response = await axios.post(config.url, {
          model: config.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 600
        }, {
          headers: { 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
          timeout: 30000
        });
        aiResponse = response.data.choices[0].message.content;
        usedApi = 'DeepSeek';
      } catch (apiError) {
        console.log('[AI Widget] DeepSeek error:', apiError.message);
        aiResponse = getFallbackResponse(message, config);
        usedApi = 'Fallback';
      }
    } else {
      console.log('[AI Widget] No API key');
      aiResponse = getFallbackResponse(message, config);
      usedApi = 'Fallback';
    }

    res.json({ success: true, response: aiResponse, usedApi, timestamp: new Date().toISOString() });
  } catch (error) {
    res.json({ success: true, response: getFallbackResponse(message, config), usedApi: 'Fallback' });
  }
});

// ==================== AI TEACHER ====================
router.post('/teacher/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { message, moduleContext } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  const config = getDeepSeekConfig();
  const teachers = {
    ncp: { name: 'Coach Carlos', title: 'Cisco Certified Instructor • 12 Years', avatar: '🏈' },
    ccp: { name: 'Dr. Sarah Chen', title: 'Computer Science Professor • 15 Years', avatar: '👩‍🏫' },
    default: { name: 'Dr. Sarah Chen', title: 'Senior Instructor', avatar: '👩‍🏫' }
  };
  const teacher = teachers[courseId] || teachers.default;
  const course = await Course.findOne({ courseId }).select('name');

  try {
    const systemPrompt = `You are ${teacher.name}, ${teacher.title}, teaching ${course ? course.name : courseId}. Context: ${moduleContext || 'General help'}. Keep responses under 150 words. Be encouraging and thorough.`;

    let aiResponse = null;
    let usedApi = null;

    if (config.key) {
      try {
        const response = await axios.post(config.url, {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.8,
          max_tokens: 600
        }, {
          headers: { 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
          timeout: 30000
        });
        aiResponse = response.data.choices[0].message.content;
        usedApi = 'DeepSeek';
      } catch (e) {
        aiResponse = `I'm ${teacher.name}, your instructor. ${course ? `Let me help you with ${course.name}!` : 'How can I help you learn?'}`;
        usedApi = 'Fallback';
      }
    } else {
      aiResponse = `I'm ${teacher.name}, your instructor. ${course ? `Let me help you with ${course.name}!` : 'How can I help you learn?'}`;
      usedApi = 'Fallback';
    }

    res.json({ success: true, response: aiResponse, teacher, usedApi });
  } catch (error) {
    res.json({ success: true, response: `I'm ${teacher.name}. How can I help?`, teacher, usedApi: 'Fallback' });
  }
});

// ==================== GENERATE QUIZ ====================
router.post('/generate-quiz', async (req, res) => {
  const { courseId, moduleName, topic, numberOfQuestions = 10 } = req.body;
  const config = getDeepSeekConfig();

  const systemPrompt = `Generate ${numberOfQuestions} multiple-choice quiz questions about "${topic || moduleName}" for ${courseId}. Return ONLY JSON array: [{"question":"...","options":["A","B","C","D"],"correctAnswer":0}]`;

  try {
    if (config.key) {
      const response = await axios.post(config.url, {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${numberOfQuestions} specific quiz questions about ${topic || moduleName}.` }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }, {
        headers: { 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const quizData = response.data.choices[0].message.content;
      const jsonMatch = quizData.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return res.json({ success: true, quiz: JSON.parse(jsonMatch[0]) });
      }
    }

    res.json({ success: true, quiz: generateFallbackQuiz(topic || moduleName, numberOfQuestions) });
  } catch (error) {
    res.json({ success: true, quiz: generateFallbackQuiz(topic || moduleName, numberOfQuestions) });
  }
});

// ==================== GENERATE NOTES ====================
router.post('/generate-notes', async (req, res) => {
  const { courseId, moduleName, content } = req.body;
  const config = getDeepSeekConfig();

  const systemPrompt = `Generate study notes for "${moduleName}". Use • bullets, clear headings, NO markdown symbols like ** or #. 200-400 words.`;

  try {
    if (config.key) {
      const response = await axios.post(config.url, {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate study notes for ${moduleName}.` }
        ],
        temperature: 0.5,
        max_tokens: 1000
      }, {
        headers: { 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return res.json({ success: true, notes: response.data.choices[0].message.content });
    }

    res.json({ success: true, notes: generateFallbackNotes(moduleName) });
  } catch (error) {
    res.json({ success: true, notes: generateFallbackNotes(moduleName) });
  }
});

// ==================== FALLBACK FUNCTIONS ====================
function getFallbackResponse(message, config) {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('support') || lowerMsg.includes('whatsapp')) return `📞 WhatsApp: ${config.supportWhatsApp}`;
  if (lowerMsg.includes('ncp')) return '🌐 NCP: 8 modules, networking cert. $379 Exam / $599 Path.';
  if (lowerMsg.includes('ccp')) return '💻 CCP: 8 modules, computing cert. $429 Exam / $679 Path.';
  if (lowerMsg.includes('voucher')) return '🎟️ Vouchers = instant enrollment! Enter code at checkout. Each code works ONCE.';
  if (lowerMsg.includes('exam')) return '📝 25 questions, 60 min, 70% to pass. Failed = 7-day cooldown.';
  return "I'm ObliXel AI! Ask me about our 25+ certifications, courses, exam prep, or vouchers!";
}

function generateFallbackQuiz(topic, count) {
  const questions = [
    { question: `Key concept in ${topic}?`, options: ['Understanding fundamentals', 'Memorization only', 'Skipping basics', 'Ignoring practice'], correctAnswer: 0 },
    { question: `Best approach for ${topic}?`, options: ['Passive reading', 'Active practice', 'Listening only', 'Cramming'], correctAnswer: 1 },
    { question: `Essential for mastering ${topic}?`, options: ['Talent only', 'Consistent practice', 'Luck', 'Expensive tools'], correctAnswer: 1 },
    { question: `How to prepare for ${topic} assessment?`, options: ['Review and practice', 'Skip prep', 'Memorize only', 'Ask for answers'], correctAnswer: 0 },
    { question: `Most valuable resource for ${topic}?`, options: ['Social media', 'Documentation and hands-on', 'Rumors', 'Outdated books'], correctAnswer: 1 },
    { question: `Common mistake in ${topic}?`, options: ['Taking notes', 'Skipping fundamentals', 'Regular practice', 'Asking questions'], correctAnswer: 1 },
    { question: `Why is ${topic} important?`, options: ['Not important', 'Foundation for career growth', 'Only for tests', 'No employer cares'], correctAnswer: 1 },
    { question: `How often to review ${topic}?`, options: ['Once and done', 'Regular spaced repetition', 'Never', 'Only before exam'], correctAnswer: 1 },
    { question: `Best way to test ${topic} knowledge?`, options: ['Avoid testing', 'Practice quizzes and labs', 'Only read notes', 'Wait for final exam'], correctAnswer: 1 },
    { question: `Effective mindset for ${topic}?`, options: ['Fixed mindset', 'Growth mindset', 'Competitive only', 'Passive acceptance'], correctAnswer: 1 }
  ];
  return questions.slice(0, Math.min(count, 10));
}

function generateFallbackNotes(moduleName) {
  return `${moduleName.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY CONCEPTS

• Understanding core fundamentals is essential for building advanced knowledge
• Each concept connects to real-world applications and scenarios
• Regular practice and review strengthens retention

IMPORTANT PRINCIPLES

• Start with basics and progress systematically through each topic
• Apply concepts through practical exercises and hands-on practice
• Test your knowledge regularly with quizzes and self-assessment
• Review challenging material using spaced repetition
• Connect new information to concepts you already understand

STUDY RECOMMENDATIONS

• Set aside dedicated study time each day for consistent progress
• Take detailed notes organized by topic and subtopic
• Explain concepts aloud to reinforce understanding
• Join study groups to discuss and clarify difficult topics
• Use multiple learning resources for comprehensive coverage

SUMMARY

${moduleName} requires dedication and consistent effort. Focus on understanding concepts deeply. Combine theoretical study with practical application for best results.

---
OBliXel Academy • ${new Date().toLocaleDateString()}`;
}

module.exports = router;
