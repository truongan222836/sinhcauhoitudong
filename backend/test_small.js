const { generateQuestions } = require('./ai-service/aiService');
require('dotenv').config();

(async () => {
  try {
    console.log('Testing with 5 questions...');
    const result = await generateQuestions('Học máy là một lĩnh vực của trí tuệ nhân tạo.', 'Trắc nghiệm', 5);
    console.log('Questions generated:', result.length);
    console.log('Sample:', JSON.stringify(result[0], null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
})();
