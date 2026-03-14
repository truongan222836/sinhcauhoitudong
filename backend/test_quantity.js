require('dotenv').config();
const { generateQuestions } = require('./ai-service/aiService');
(async () => {
    try {
        const text = 'Sự phát triển của trí tuệ nhân tạo đang thay đổi thế giới. Các mô hình ngôn ngữ lớn như GPT-4 hay Gemini có khả năng hiểu và xử lý ngôn ngữ tự nhiên tốt. Điều này mở ra nhiều ứng dụng trong giáo dục, y tế, lập trình và nhiều lĩnh vực khác. Tuy nhiên, nó cũng đặt ra nhiều thách thức về đạo đức, bảo mật thông tin và việc làm trong tương lai. Để tận dụng tốt AI, con người cần có kiến thức vững chắc và kỹ năng thích ứng nhanh nhạy.';
        
        console.log(`\nTesting quantity = 95...`);
        const q = await generateQuestions(text, 'Trắc nghiệm', 95);
        let hasMock = q.some(item => item.question && item.question.includes('[MOCK]'));
        console.log(`Has Mock: ${hasMock}`);
    } catch (e) {
        console.error('Test error:', e);
    }
})();
