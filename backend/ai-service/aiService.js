const Groq = require("groq-sdk");
const axios = require("axios");

const GEMINI_MODEL = 'gemini-2.0-flash';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Utility to sleep/delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Prompt Template Generator
 */
function getPrompt(text, type, quantity, difficulty) {
  const difficultyMap = {
    'Dễ': 'dễ, tập trung vào các sự kiện trực tiếp và thông tin rõ ràng',
    'Khó': 'khó, yêu cầu phân tích sâu, so sánh và đánh giá thông tin',
    'Trung bình': 'trung bình, yêu cầu hiểu bản chất và áp dụng kiến thức'
  };
  const diff = difficultyMap[difficulty] || difficultyMap['Trung bình'];

  const commonTail = `
Yêu cầu:
- Ngôn ngữ: Tiếng Việt.
- Độ khó: ${diff}.
- Chỉ trả về duy nhất một JSON array chứa các object câu hỏi. 
- TUYỆT ĐỐI KHÔNG giải thích, không thêm text thừa ngoài JSON.`;

  if (type === 'Trắc nghiệm') {
    return `Từ nội dung văn bản sau: "${text}"
Hãy tạo ĐÚNG ${quantity} câu hỏi trắc nghiệm khách quan. Mỗi câu có 4 lựa chọn (A, B, C, D) và chỉ 1 đáp án đúng duy nhất. 
JSON Format: [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A. ..."}]
${commonTail}`;
  } else if (type === 'Tự luận') {
    return `Từ nội dung văn bản sau: "${text}"
Hãy tạo ĐÚNG ${quantity} câu hỏi tự luận mở. Có kèm theo gợi ý trả lời chi tiết.
JSON Format: [{"question": "...", "answer": "..."}]
${commonTail}`;
  } else {
    return `Từ nội dung văn bản sau: "${text}"
Hãy tạo ĐÚNG ${quantity} câu hỏi điền vào chỗ trống (cloze test). 
JSON Format: [{"question": "Đây là ____ chỗ trống.", "blanks": ["đáp án"]}]
${commonTail}`;
  }
}

/**
 * Provider Callers
 */

async function callGemini(prompt, apiKey) {
    if (!apiKey) throw new Error("Missing Gemini Key");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            temperature: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json" 
        }
    }, { timeout: 45000 });
    
    let resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Gemini returned empty content");
    return JSON.parse(resultText);
}

async function callGroq(prompt, apiKey) {
    if (!apiKey) throw new Error("Missing Groq Key");
    try {
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });
        const raw = completion.choices[0].message.content;
        const parsed = JSON.parse(raw);
        // Groq llama might wrap array in an object
        if (Array.isArray(parsed)) return parsed;
        return parsed.questions || parsed.data || parsed.items || Object.values(parsed).find(v => Array.isArray(v)) || [];
    } catch (e) {
        throw new Error(`Groq error: ${e.message}`);
    }
}

async function callOllama(prompt) {
    try {
        const response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            format: "json"
        }, { timeout: 90000 });
        const parsed = JSON.parse(response.data.response);
        if (Array.isArray(parsed)) return parsed;
        return parsed.questions || parsed.data || [];
    } catch (e) {
        throw new Error(`Ollama local error: ${e.message}. Is Ollama running?`);
    }
}

/**
 * Intelligent Local Engine (Absolute Fallback)
 * This doesn't use AI, it uses text processing to ensure success even if world ends.
 */
function intelligentLocalEngine(text, type, quantity) {
    console.log(`[AI Service] System Fallback: Generating ${quantity} ${type} questions via Local Processing.`);
    
    // Clean text and split by sentences
    const sentences = text.split(/[\.!\?]\s+/).filter(s => s.trim().length > 20);
    const results = [];
    
    for (let i = 0; i < quantity; i++) {
        const target = sentences[i % sentences.length] || text.substring(0, 100);
        const words = target.split(/\s+/);
        
        if (type === 'Trắc nghiệm') {
            const keyword = words[Math.floor(words.length / 2)] || "thông tin";
            results.push({
                question: `Theo nội dung văn bản, nhận định nào sau đây là chính xác nhất về "${target.substring(0, 60)}..."?`,
                options: [
                    `A. Nội dung liên quan trực tiếp đến ${keyword}`,
                    `B. Đây là một khái niệm bổ trợ hoàn toàn mới`,
                    `C. Thông tin này mang tính chất giả định`,
                    `D. Không thể xác định được từ văn bản`
                ],
                correctAnswer: `A. Nội dung liên quan trực tiếp đến ${keyword}`
            });
        } else if (type === 'Tự luận') {
            results.push({
                question: `Dựa trên đoạn văn sau, hãy giải thích ý nghĩa và tầm quan trọng của: "${target}"?`,
                answer: `Yêu cầu người học tóm tắt nội dung: "${target.substring(0, 50)}..." và liên hệ thực tế.`
            });
        } else {
            // Fill in the blanks
            const mid = Math.floor(words.length / 2);
            const blankWord = words[mid];
            const qText = target.replace(blankWord, "____");
            results.push({
                question: qText,
                blanks: [blankWord]
            });
        }
    }
    return results;
}

/**
 * EXPORTED ORCHESTRATOR
 */
async function generateQuestions(text, type, quantity, difficulty = 'Trung bình') {
    const SAFE_BATCH_SIZE = 10; // Smaller batches = higher stability across models
    let finalQuestions = [];
    const totalBatches = Math.ceil(quantity / SAFE_BATCH_SIZE);

    console.log(`[AI Service] Starting generation for ${quantity} questions (${totalBatches} batches)`);

    for (let b = 0; b < totalBatches; b++) {
        const batchQty = Math.min(SAFE_BATCH_SIZE, quantity - finalQuestions.length);
        if (batchQty <= 0) break;

        const prompt = getPrompt(text, type, batchQty, difficulty);
        let batchData = null;

        // Provider chain
        const providers = [
            { name: 'Gemini', call: () => callGemini(prompt, process.env.GEMINI_API_KEY) },
            { name: 'Groq', call: () => callGroq(prompt, process.env.GROQ_API_KEY) },
            { name: 'Ollama', call: () => callOllama(prompt) }
        ];

        for (const provider of providers) {
            try {
                console.log(`[AI Service] Batch ${b+1}/${totalBatches}: Attempting ${provider.name}...`);
                const data = await provider.call();
                if (Array.isArray(data) && data.length > 0) {
                    batchData = data;
                    console.log(`[AI Service] Batch ${b+1} DONE using ${provider.name}`);
                    break;
                }
            } catch (err) {
                console.warn(`[AI Service] ${provider.name} failed for batch ${b+1}: ${err.message}`);
                // Move to next provider immediately
            }
        }

        // If all AI failed, use local engine
        if (!batchData) {
            batchData = intelligentLocalEngine(text, type, batchQty);
        }

        finalQuestions = finalQuestions.concat(batchData);
        
        // Anti-spam delay between batches
        if (b < totalBatches - 1) await sleep(1500);
    }

    // Post-processing: Normalize structure and ID
    return finalQuestions.slice(0, quantity).map((q, idx) => ({
        id: idx + 1,
        type: type,
        question: q.question || 'Câu hỏi chưa được sinh đúng định dạng',
        ...(type === 'Trắc nghiệm' && {
            options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
            correctAnswer: q.correctAnswer || (Array.isArray(q.options) ? q.options[0] : "A")
        }),
        ...(type === 'Tự luận' && {
            answer: q.answer || 'Vui lòng tham khảo văn bản gốc.'
        }),
        ...(type === 'Điền khuyết' && {
            blanks: Array.isArray(q.blanks) ? q.blanks : ["..."]
        })
    }));
}

module.exports = { generateQuestions };