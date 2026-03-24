const OpenAI = require('openai');

// Khởi tạo OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

/**
 * Sinh câu hỏi từ văn bản sử dụng OpenAI
 * @param {string} text - Văn bản đầu vào
 * @param {string} type - Loại câu hỏi: 'Trắc nghiệm', 'Tự luận', 'Điền khuyết'
 * @param {number} quantity - Số lượng câu hỏi cần sinh
 * @returns {Array} Mảng các câu hỏi đã sinh
 */
async function generateQuestions(text, type, quantity) {
  try {
    let prompt = '';

    if (type === 'Trắc nghiệm') {
      prompt = `Từ văn bản sau: "${text}"

Hãy sinh ${quantity} câu hỏi trắc nghiệm (multiple choice) bằng tiếng Việt. Mỗi câu hỏi cần có:
- Câu hỏi
- 4 lựa chọn đáp án (A, B, C, D)
- Đáp án đúng

Trả về dưới dạng JSON array với format:
[
  {
    "question": "Câu hỏi ở đây?",
    "options": ["A. Lựa chọn A", "B. Lựa chọn B", "C. Lựa chọn C", "D. Lựa chọn D"],
    "correctAnswer": "A. Lựa chọn A"
  }
]

Đảm bảo câu hỏi liên quan trực tiếp đến nội dung văn bản và có độ khó phù hợp.`;
    } else if (type === 'Tự luận') {
      prompt = `Từ văn bản sau: "${text}"

Hãy sinh ${quantity} câu hỏi tự luận (essay questions) bằng tiếng Việt. Mỗi câu hỏi cần:
- Câu hỏi mở
- Gợi ý trả lời (tùy chọn)

Trả về dưới dạng JSON array với format:
[
  {
    "question": "Câu hỏi tự luận ở đây?",
    "answer": "Gợi ý trả lời (nếu có)"
  }
]

Đảm bảo câu hỏi khuyến khích suy nghĩ sâu sắc và liên quan đến nội dung văn bản.`;
    } else if (type === 'Điền khuyết') {
      prompt = `Từ văn bản sau: "${text}"

Hãy sinh ${quantity} câu hỏi điền khuyết (fill-in-the-blank) bằng tiếng Việt. Mỗi câu hỏi cần:
- Câu văn có chỗ trống (dùng ____ để đánh dấu)
- Danh sách từ/cụm từ điền vào chỗ trống

Trả về dưới dạng JSON array với format:
[
  {
    "question": "Câu văn có chỗ trống ____ như ____.",
    "blanks": ["từ 1", "từ 2"]
  }
]

Đảm bảo chỗ trống hợp lý và từ khóa quan trọng từ văn bản gốc.`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Bạn là một trợ lý AI chuyên sinh câu hỏi từ văn bản. Luôn trả về JSON hợp lệ.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content.trim();

    // Thử parse JSON
    let questions;
    try {
      // Loại bỏ markdown code blocks nếu có
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      questions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Lỗi parse JSON từ OpenAI:', parseError);
      console.log('Raw content:', content);
      throw new Error('Không thể parse phản hồi từ AI');
    }

    // Validate và format lại dữ liệu
    const formattedQuestions = questions.map((q, index) => ({
      id: index + 1,
      type: type,
      question: q.question,
      ...(type === 'Trắc nghiệm' && {
        options: q.options,
        correctAnswer: q.correctAnswer
      }),
      ...(type === 'Tự luận' && {
        answer: q.answer || ''
      }),
      ...(type === 'Điền khuyết' && {
        blanks: q.blanks
      })
    }));

    return formattedQuestions;

  } catch (error) {
    console.error('Lỗi khi gọi OpenAI API:', error);
    throw new Error('Không thể sinh câu hỏi từ AI: ' + error.message);
  }
}

module.exports = {
  generateQuestions
};