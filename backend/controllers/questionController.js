const { sql, config } = require("../config/db");

exports.generateQuestions = async (req, res) => {
    try {
        const { text, type, quantity } = req.body;

        // TODO: Tích hợp AI để sinh câu hỏi từ 'text'
        // Hiện tại trả về dữ liệu giả lập để test Frontend
        
        const mockQuestions = [];
        for (let i = 1; i <= quantity; i++) {
            let questionData = {
                id: i, // Unique ID for each question
                type: type, // Add type to each question object
                question: `Đây là câu hỏi ${type} số ${i} được sinh ra từ văn bản?`
            };

            if (type === 'Trắc nghiệm') {
                questionData.options = ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"];
                questionData.correctAnswer = "Đáp án A";
            } else if (type === 'Tự luận') {
                // Tự luận không cần options
                questionData.answer = `Đây là câu trả lời gợi ý cho câu hỏi tự luận số ${i}.`;
            } else if (type === 'Điền khuyết') {
                // Điền khuyết có thể có nhiều chỗ trống
                questionData.question = `Mặt trời mọc ở hướng ____ và lặn ở hướng ____.`;
                questionData.blanks = ["Đông", "Tây"];
            }

            mockQuestions.push(questionData);
        }

        res.json({ success: true, data: mockQuestions });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi sinh câu hỏi", error: err.message });
    }
};

exports.saveQuestions = async (req, res) => {
    try {
        const { userId, questions } = req.body;
        // Logic lưu vào database (Bảng Questions)
        // await sql.connect(config);
        // ... Insert logic here
        
        res.json({ success: true, message: "Đã lưu bộ câu hỏi thành công!" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi lưu", error: err.message });
    }
};

exports.getAllQuestions = async (req, res) => {
    res.json({ message: "Danh sách câu hỏi (Chưa implement)" });
};