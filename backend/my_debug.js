require('dotenv').config();
const { generateQuestions } = require('./ai-service/aiService');
(async () => {
    try {
        const start = Date.now();
        console.log('Starting my_debug.js...');
        const q = await generateQuestions('Việt Nam là một quốc gia Đông Nam Á.', 'Trắc nghiệm', 35);
        console.log('Generated:', q.length, 'Elapsed (ms):', Date.now() - start);
    } catch (e) {
        console.error('Error:', e);
    }
})();
