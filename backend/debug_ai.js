console.log('Starting debug_ai');
require('dotenv').config();
const { generateQuestions } = require('./ai-service/aiService');

console.log('Starting debug_ai');
(async () => {
  try {
    const questions = await generateQuestions('Đây là văn bản thử nghiệm', 'Trắc nghiệm', 2);
    console.log('Generated questions:', questions);
  } catch (err) {
    console.error('Error during AI generation:', err);
  }
})();