const axios = require("axios");
const Bottleneck = require("bottleneck");
const { runPipeline } = require('./questionPipeline');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Giới hạn call API
const geminiLimiter = new Bottleneck({ minTime: 6000, maxConcurrent: 1 });
const openaiLimiter = new Bottleneck({ minTime: 1000, maxConcurrent: 1 });
const groqLimiter = new Bottleneck({ minTime: 2000, maxConcurrent: 1 });

const GEMINI_MODEL = 'gemini-1.5-flash'; 
const GEMINI_API_VERSION = 'v1beta';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const PRIMARY_AI_ORDER = process.env.PRIMARY_AI || 'openai,gemini,groq,ollama';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJsonString(str) {
    try {
        let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
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
    const difficultyMap = { 'Dễ': 'dễ', 'Khó': 'khó', 'Trung bình': 'trung bình' };
    const diff = difficultyMap[difficulty] || 'trung bình';
    return `Task: Generate ${quantity} educational questions in Vietnamese from text.
Text: """${text}"""
Type: ${type}, Difficulty: ${diff}
Output ONLY JSON array format: [{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correctAnswer": "A"}]
Vietnamese language only. No generic content.`;
}

// ── GEMINI CALLER ──────────────────────────────────────────────
async function callGeminiRaw(prompt, apiKey) {
    if (!apiKey || apiKey.includes('xxx')) {
        console.warn('[AI-SERVICE][GEMINI] Invalid or missing API Key');
        return null;
    }
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = GEMINI_MODEL || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });
        
        console.log(`[AI-SERVICE][GEMINI] Requesting model: ${modelName}`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const resultText = response.text();
        
        console.log(`[AI-SERVICE] Gemini Success! Length: ${resultText ? resultText.length : 0}`);
        const parsed = JSON.parse(cleanJsonString(resultText));
        return Array.isArray(parsed) ? parsed : (parsed.questions || [parsed]);
    } catch (error) {
        console.error(`[AI-SERVICE] Gemini Error: ${error.message}`);
        return null;
    }
}
const callGemini = geminiLimiter.wrap(callGeminiRaw);

// ── OPENAI CALLER ──────────────────────────────────────────────
async function callOpenAIRaw(prompt, apiKey) {
    if (!apiKey || apiKey.includes('xxx')) {
        console.warn('[AI-SERVICE][OPENAI] Invalid or placeholder API Key');
        return null;
    }
    try {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        console.log(`[AI-SERVICE][OPENAI] Requesting model: ${model}`);
        const response = await axios.post(OPENAI_URL, {
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        }, { headers: { "Authorization": `Bearer ${apiKey}` }, timeout: 45000 });

        const parsed = response.data.choices[0].message.content;
        console.log(`[AI-SERVICE][OPENAI] Raw Response (first 100 char): ${parsed.substring(0, 100)}...`);
        const json = JSON.parse(cleanJsonString(parsed));
        return Array.isArray(json) ? json : (json.questions || json.data || [json]);
    } catch (e) {
        console.error(`[AI-SERVICE] OpenAI Error: ${e.message}`, e.response?.data || 'No extra data');
        return null;
    }
}
const callOpenAI = openaiLimiter.wrap(callOpenAIRaw);

// ── GROQ CALLER ────────────────────────────────────────────────
async function callGroqRaw(prompt, apiKey) {
    if (!apiKey || apiKey.includes('xxx')) return null;
    try {
        const response = await axios.post(GROQ_URL, {
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        }, { headers: { "Authorization": `Bearer ${apiKey}` }, timeout: 45000 });

        const parsed = response.data.choices[0].message.content;
        const json = JSON.parse(cleanJsonString(parsed));
        return Array.isArray(json) ? json : (json.questions || json.data || [json]);
    } catch (e) {
        return null;
    }
}
const callGroq = groqLimiter.wrap(callGroqRaw);

// ── OLLAMA CALLER ──────────────────────────────────────────────
async function callOllama(prompt) {
    try {
        const response = await axios.post(OLLAMA_URL, {
            model: process.env.OLLAMA_MODEL || 'llama3',
            prompt: prompt, stream: false, format: "json"
        }, { timeout: 60000 });
        const json = JSON.parse(cleanJsonString(response.data.response));
        return Array.isArray(json) ? json : (json.questions || [json]);
    } catch (e) {
        return null;
    }
}

// ── MAIN PIPELINE ──────────────────────────────────────────────
exports.generateQuestions = async (text, type, quantity, difficulty = 'Trung bình', onProgress = null) => {
    const BATCH_SIZE = 5;
    let allPassedQuestions = [];
    let existingNorms = [];
    const totalBatches = Math.ceil(quantity / BATCH_SIZE);
    const providersInOrder = PRIMARY_AI_ORDER.split(',').map(s => s.trim().toLowerCase());

    for (let i = 0; i < totalBatches; i++) {
        if (onProgress) onProgress(Math.round((i / totalBatches) * 100));
        const currentQty = Math.min(BATCH_SIZE, quantity - allPassedQuestions.length);
        if (currentQty <= 0) break;

        const prompt = getPrompt(text, type, currentQty, difficulty);
        let batchRaw = null;
        let attempt = 0;

        while (attempt < 2 && !batchRaw) {
            console.log(`[AI-SERVICE] Batch ${i + 1}/${totalBatches} (lần thử ${attempt + 1})`);
            
            for (const provider of providersInOrder) {
                console.log(`[AI-SERVICE] Attempting Provider: ${provider.toUpperCase()}`);
                try {
                    let result = null;
                    if (provider === 'gemini') {
                        if (!process.env.GEMINI_API_KEY) {
                            console.warn('[AI-SERVICE] GEMINI_API_KEY is missing');
                        }
                        result = await callGemini(prompt, process.env.GEMINI_API_KEY);
                    }
                    else if (provider === 'openai') {
                        if (!process.env.OPENAI_API_KEY) {
                            console.warn('[AI-SERVICE] OPENAI_API_KEY is missing');
                        }
                        result = await callOpenAI(prompt, process.env.OPENAI_API_KEY);
                    }
                    else if (provider === 'groq') result = await callGroq(prompt, process.env.GROQ_API_KEY);
                    else if (provider === 'ollama') result = await callOllama(prompt);

                    if (result && Array.isArray(result) && result.length > 0) {
                        batchRaw = result;
                        console.log(`[AI-SERVICE] Dùng ${provider.toUpperCase()} thành công.`);
                        break;
                    }
                } catch (e) {
                    if (e.message === "GEMINI_429") {
                        console.warn(`[AI-SERVICE] Gemini 429. Chờ ${e.retryAfter}s...`);
                        await sleep(e.retryAfter * 1000);
                    }
                }
            }
            if (batchRaw) break;
            attempt++;
            if (!batchRaw) await sleep(2000 * attempt);
        }

        if (batchRaw) {
            const { questions: batchPassed, updatedNorms } = runPipeline(batchRaw, type, existingNorms);
            existingNorms = updatedNorms;
            allPassedQuestions = allPassedQuestions.concat(batchPassed);
        }
        await sleep(1000);
    }

    return allPassedQuestions.slice(0, quantity).map((q, index) => {
        const normalized = { id: index + 1, question: q.question || 'N/A', type: type };
        if (type === 'Trắc nghiệm') {
            const opts = q.options || {};
            const optVals = Array.isArray(opts) ? opts : ['A', 'B', 'C', 'D'].map(k => opts[k]).filter(Boolean);
            const correctKey = String(q.correctAnswer || q.correct || 'A').toUpperCase().charAt(0);
            normalized.options = optVals.map(o => String(o).replace(/^[A-H]\.\s*/, ''));
            normalized.correctAnswer = (Array.isArray(opts) ? String(q.correctAnswer || optVals[0]) : (opts[correctKey] || optVals[0])).replace(/^[A-H]\.\s*/, '');
        } else if (type === 'Tự luận') normalized.answer = q.answer || 'Vui lòng xem lời giải.';
        else if (type === 'Điền khuyết') normalized.blanks = Array.isArray(q.blanks) ? q.blanks : ["..."];
        return normalized;
    });
};
