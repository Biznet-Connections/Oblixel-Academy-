const axios = require('axios');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function getAIResponse(message, userContext) {
  try {
    const systemPrompt = `You are OBliXel AI, a helpful study assistant for OBliXel Academy.
    
User context: ${userContext}

Guidelines:
- Be helpful, concise, and encouraging
- Help with exam preparation and study tips
- Explain technical concepts simply
- Never give direct exam answers
- Stay professional and friendly`;

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
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('DeepSeek API error:', error.message);
    return getFallbackResponse(message);
  }
}

function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('ccna') || lowerMessage.includes('cisco')) {
    return "CCNA certification requires understanding networking fundamentals, subnetting, routing protocols (OSPF, EIGRP), and switching concepts. I recommend starting with our CCNA course modules and practicing with Packet Tracer!";
  }
  
  if (lowerMessage.includes('security') || lowerMessage.includes('cyber')) {
    return "Cybersecurity certifications like Security+ and CISSP cover risk management, cryptography, network security, and incident response. Our Cybersecurity Expert course is a great starting point!";
  }
  
  if (lowerMessage.includes('cloud') || lowerMessage.includes('aws')) {
    return "Cloud certifications focus on AWS, Azure, or GCP services, architecture best practices, and deployment strategies. Our Cloud Engineering course covers the fundamentals you need!";
  }
  
  if (lowerMessage.includes('exam') || lowerMessage.includes('test')) {
    return "Our certification exams have 25 questions, 60 minutes time limit, and require 70% to pass. Each exam can be taken with Exam Only option or as part of the Learning Path. Failed exams have a 7-day cooldown period.";
  }
  
  return "Great question! I'd recommend checking out our course materials and practice exams. The best way to prepare is to combine theoretical study with hands-on practice. Would you like specific guidance on any certification?";
}

module.exports = { getAIResponse };
