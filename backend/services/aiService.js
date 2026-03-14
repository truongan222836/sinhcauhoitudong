const Groq = require("groq-sdk");
const axios = require("axios");

const GEMINI_MODEL = 'gemini-2.0-flash';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean AI response to ensure it's valid JSON
 */
function cleanJsonString(str) {
    try {
        // Remove markdown blocks if present
        let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
        // Sometimes AI adds text before or after JSON
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            cleaned = cleaned.substring(start, end + 1);
        }
        return cleaned;
    } catch (e) {
        return str;
    }
}

function getPrompt(text, type, quantity, difficulty) {
    const difficultyMap = {
        'Dễ': 'dễ, tập trung vào kiến thức cơ bản',
        'Khó': 'khó, yêu cầu tư duy phản biện và tổng hợp',
        'Trung bình': 'trung bình, yêu cầu hiểu và áp dụng'
    };
    const diff = difficultyMap[difficulty] || difficultyMap['Trung bình'];

    const commonTail = `
Yêu cầu QUAN TRỌNG:
- Ngôn ngữ: Tiếng Việt.
- Độ khó: ${diff}.
- Chỉ trả về DUY NHẤT một JSON array. Không kèm text giải thích.
- Format JSON phải chuẩn, không có lỗi syntax.`;

    if (type === 'Trắc nghiệm') {
        return `Từ nội dung: "${text}"
Hãy tạo ${quantity} câu hỏi trắc nghiệm. 
JSON Format: [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "Câu trả lời đúng trong 4 lựa chọn trên"}]
${commonTail}`;
    } else if (type === 'Tự luận') {
        return `Từ nội dung: "${text}"
Hãy tạo ${quantity} câu hỏi tự luận. 
JSON Format: [{"question": "...", "answer": "..."}]
${commonTail}`;
    } else {
        return `Từ nội dung: "${text}"
Hãy tạo ${quantity} câu hỏi điền vào chỗ trống. Dùng "____" cho chỗ trống.
JSON Format: [{"question": "Nội dung ____ chỗ trống.", "blanks": ["đáp án"]}]
${commonTail}`;
    }
}

async function callGemini(prompt, apiKey) {
    if (!apiKey) throw new Error("Missing Gemini Key");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                temperature: 0.8, // Slightly higher temp for more randomness
                maxOutputTokens: 4096,
                responseMimeType: "application/json" 
            }
        }, { timeout: 60000 }); 
        
        let resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) throw new Error("Gemini empty response");
        return JSON.parse(cleanJsonString(resultText));
    } catch (error) {
        if (error.response) {
            console.error("Gemini API Error Detail:", JSON.stringify(error.response.data));
        }
        throw error;
    }
}

async function callGroq(prompt, apiKey) {
    if (!apiKey) throw new Error("Missing Groq Key");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        response_format: { type: "json_object" }
    });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(cleanJsonString(raw));
    if (Array.isArray(parsed)) return parsed;
    return parsed.questions || parsed.data || Object.values(parsed).find(v => Array.isArray(v)) || [];
}

async function callOllama(prompt) {
    const response = await axios.post(OLLAMA_URL, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        format: "json"
    }, { timeout: 120000 });
    const parsed = JSON.parse(cleanJsonString(response.data.response));
    if (Array.isArray(parsed)) return parsed;
    return parsed.questions || parsed.data || [];
}

function localFallback(text, type, quantity) {
    const sentences = text.split(/[\.!\?]\s+/).filter(s => s.trim().length > 10);
    const results = [];
    const optionLabels = ["A", "B", "C", "D"];
    
    for (let i = 0; i < quantity; i++) {
        const s = sentences[i % sentences.length] || "Thông tin từ văn bản";
        if (type === 'Trắc nghiệm') {
            const correctIdx = Math.floor(Math.random() * 4);
            const options = [
                "Nội dung được đề cập trực tiếp",
                "Thông tin này không chính xác",
                "Vấn đề này đang được tranh luận",
                "Chưa có kết luận cụ thể"
            ];
            // Rotate options to randomize
            const rotatedOptions = options.map((opt, idx) => `${optionLabels[idx]}. ${opt}`);
            
            results.push({
                question: `Phát biểu nào sau đây là đúng về "${s.substring(0, 50)}..."?`,
                options: rotatedOptions,
                correctAnswer: rotatedOptions[correctIdx]
            });
        } else if (type === 'Tự luận') {
            results.push({
                question: `Phân tích ý nghĩa của đoạn sau: "${s}"`,
                answer: "Học sinh cần tóm tắt và nêu được ý chính của đoạn văn."
            });
        } else {
            const words = s.split(' ');
            const idx = Math.floor(words.length / 2);
            const word = words[idx];
            results.push({
                question: s.replace(word, "____"),
                blanks: [word]
            });
        }
    }
    return results;
}

exports.generateQuestions = async (text, type, quantity, difficulty = 'Trung bình') => {
    const BATCH_SIZE = 5; // Smaller batch for more stability (especially for long content)
    let allQuestions = [];
    const totalBatches = Math.ceil(quantity / BATCH_SIZE);

    console.log(`[AI-SERVICE] Generating ${quantity} questions in ${totalBatches} batches.`);

    for (let i = 0; i < totalBatches; i++) {
        const currentQty = Math.min(BATCH_SIZE, quantity - allQuestions.length);
        if (currentQty <= 0) break;

        const prompt = getPrompt(text, type, currentQty, difficulty);
        let batchData = null;
        let attempt = 0;
        const maxRetries = 2;

        while (attempt <= maxRetries && !batchData) {
            try {
                console.log(`[AI-SERVICE] Batch ${i + 1}/${totalBatches} (Attempt ${attempt + 1})`);
                
                // Try Providers sequentially
                try {
                    batchData = await callGemini(prompt, process.env.GEMINI_API_KEY);
                } catch (e) {
                    console.warn("Gemini failed, trying Groq...", e.message);
                    try {
                        batchData = await callGroq(prompt, process.env.GROQ_API_KEY);
                    } catch (e2) {
                        console.warn("Groq failed, trying Ollama...", e2.message);
                        batchData = await callOllama(prompt);
                    }
                }

                if (Array.isArray(batchData)) {
                    allQuestions = allQuestions.concat(batchData);
                } else {
                    batchData = null; // trigger retry or fallback
                }
            } catch (err) {
                console.error(`Error in batch ${i + 1}:`, err.message);
                attempt++;
                if (attempt <= maxRetries) await sleep(2000);
            }
        }

        // If batch still null after retries, use local fallback for this batch
        if (!batchData) {
            console.error(`Batch ${i + 1} failed all AI providers. Using local fallback.`);
            allQuestions = allQuestions.concat(localFallback(text, type, currentQty));
        }

        if (i < totalBatches - 1) await sleep(1000); // Cool down
    }

    // Final Mapping & ID assignment
    return allQuestions.slice(0, quantity).map((q, index) => ({
        id: index + 1,
        question: q.question || 'Không lấy được nội dung câu hỏi',
        type: type,
        ...(type === 'Trắc nghiệm' && {
            options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
            correctAnswer: q.correctAnswer || (q.options ? q.options[0] : "A")
        }),
        ...(type === 'Tự luận' && { answer: q.answer || 'Vui lòng xem lời giải trong bài' }),
        ...(type === 'Điền khuyết' && { blanks: Array.isArray(q.blanks) ? q.blanks : ["..."] })
    }));
};
