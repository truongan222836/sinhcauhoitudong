/**
 * AI Service sử dụng Google Gemini API
 * Model: gemini-2.0-flash (hỗ trợ tốt tiếng Việt, miễn phí)
 */

const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Xây dựng prompt dựa vào loại câu hỏi và độ khó
 * @param {string} text - Văn bản đầu vào
 * @param {string} type - Loại câu hỏi
 * @param {number} quantity - Số lượng câu
 * @param {string} difficulty - Độ khó: 'Dễ', 'Trung bình', 'Khó'
 * @returns {string} Prompt cho Gemini
 */
function getPrompt(text, type, quantity, difficulty) {
  let difficultyInstruction = '';
  
  if (difficulty === 'Dễ') {
    difficultyInstruction = 'Câu hỏi ở MỨC ĐỘ DỄ, chỉ hỏi những khái niệm cơ bản, từ ngữ trực tiếp trong văn bản, dễ hiểu và dễ trả lời.';
  } else if (difficulty === 'Khó') {
    difficultyInstruction = 'Câu hỏi ở MỨC ĐỘ KHÓ, hỏi về những khái niệm phức tạp, yêu cầu suy luận sâu, suy diễn, so sánh, đánh giá, tổng hợp ý tưởng, không phải chỉ nhớ lại.';
  } else {
    difficultyInstruction = 'Câu hỏi ở MỨC ĐỘ TRUNG BÌNH, bao gồp hiểu biết, phân tích, ứng dụng các ý tưởng từ văn bản.';
  }

  let prompt = '';

  if (type === 'Trắc nghiệm') {
    prompt = `Từ văn bản sau đây, hãy sinh ĐÚNG ${quantity} câu hỏi trắc nghiệm bằng tiếng Việt.

Văn bản: "${text}"

Yêu cầu:
- Mỗi câu hỏi phải có 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Câu hỏi phải ngắn gọn, dễ hiểu
- Câu hỏi phải liên quan trực tiếp đến nội dung văn bản
- ${difficultyInstruction}
- QUAN TRỌNG: Các câu hỏi phải KHÁC NHAU hoàn toàn, không trùng lặp
- Bao quát các phần KHÁC NHAU của văn bản, hỏi từ nhiều góc độ khác nhau
- Các đáp án phải ngắn (tối đa 20 từ), cụ thể
- PHẢI trả về ĐÚNG ${quantity} câu hỏi trong JSON array

Trả về ĐÚNG định dạng JSON array với ${quantity} phần tử, KHÔNG có markdown, KHÔNG có text thừa:
[
  {"question": "Câu hỏi 1?", "options": ["A. Đáp án A", "B. Đáp án B", "C. Đáp án C", "D. Đáp án D"], "correctAnswer": "A. Đáp án A"},
  {"question": "Câu hỏi 2?", "options": ["A. Đáp án A", "B. Đáp án B", "C. Đáp án C", "D. Đáp án D"], "correctAnswer": "B. Đáp án B"}
]`;
  } else if (type === 'Tự luận') {
    prompt = `Từ văn bản sau đây, hãy sinh ĐÚNG ${quantity} câu hỏi tự luận bằng tiếng Việt.

Văn bản: "${text}"

Yêu cầu:
- Câu hỏi phải mở, khuyến khích suy nghĩ, ngắn gọn
- Có gợi ý trả lời ngắn (tối đa 30 từ)
- ${difficultyInstruction}
- QUAN TRỌNG: Các câu hỏi phải KHÁC NHAU hoàn toàn, không trùng lặp
- Bao quát các phần KHÁC NHAU của văn bản
- Hỏi từ nhiều góc độ khác nhau
- PHẢI trả về ĐÚNG ${quantity} câu hỏi trong JSON array

Trả về ĐÚNG định dạng JSON array với ${quantity} phần tử, KHÔNG có markdown:
[
  {"question": "Câu hỏi 1?", "answer": "Gợi ý ngắn"},
  {"question": "Câu hỏi 2?", "answer": "Gợi ý ngắn"}
]`;
  } else if (type === 'Điền khuyết') {
    prompt = `Từ văn bản sau đây, hãy sinh ĐÚNG ${quantity} câu hỏi điền khuyết bằng tiếng Việt.

Văn bản: "${text}"

Yêu cầu:
- Lấy câu trực tiếp từ văn bản, thay các từ khóa quan trọng bằng ____
- Mỗi câu có 1-2 chỗ trống
- ${difficultyInstruction}
- QUAN TRỌNG: Các câu hỏi phải KHÁC NHAU hoàn toàn, không trùng lặp
- Sử dụng các từ/đoạn KHÁC NHAU từ văn bản
- PHẢI trả về ĐÚNG ${quantity} câu hỏi trong JSON array

Trả về ĐÚNG định dạng JSON array với ${quantity} phần tử, KHÔNG có markdown:
[
  {"question": "Câu văn có chỗ trống ____.", "blanks": ["từ 1"]},
  {"question": "Câu khác có chỗ trống ____ và ____.", "blanks": ["từ 2", "từ 3"]}
]`;
  }

  return prompt;
}


async function generateQuestionsBatch(text, type, quantity, difficulty, apiKey, batchIndex = 0, retryCount = 0) {
  let prompt = getPrompt(text, type, quantity, difficulty);
  
  if (batchIndex > 0) {
      // Thêm chỉ định randomize để tránh AI trả về câu hỏi giống đợt trước
      prompt += `\n\n[LƯU Ý QUAN TRỌNG CHO LÔ SỐ ${batchIndex}]: Hãy bóc tách các khía cạnh nhỏ hơn, ẩn sâu hơn hoặc các ví dụ khác ở nửa sau/giữa của văn bản để đảm bảo các CÂU HỎI MỚI NÀY HOÀN TOÀN KHÁC BIỆT so với những câu hỏi hiển nhiên ban đầu.`;
  }

  try {
    console.log(`[AI Service] Gọi Gemini API (Batch ${batchIndex}) với model: ${GEMINI_MODEL}, type: ${type}, quantity: ${quantity}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.95,
        topP: 0.98,
        maxOutputTokens: Math.min(8192, Math.max(2048, quantity * 250)),
        responseMimeType: "application/json"
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data.error ? JSON.stringify(data.error) : `HTTP ${response.status}`;
      throw new Error('Gemini API lỗi: ' + errMsg);
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini trả về kết quả trống');

    let questions;
    try {
      const startIdx = rawText.indexOf('[');
      const endIdx = rawText.lastIndexOf(']');
      let jsonString = rawText;
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonString = rawText.substring(startIdx, endIdx + 1);
      } else {
        jsonString = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      }
      questions = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error('Không thể parse JSON từ Gemini: ' + parseError.message);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Gemini không trả về mảng câu hỏi hợp lệ');
    }

    return questions.map((q, index) => ({
      id: index + 1,
      type: type,
      question: q.question || '',
      ...(type === 'Trắc nghiệm' && {
        options: q.options || [],
        correctAnswer: q.correctAnswer || ''
      }),
      ...(type === 'Tự luận' && {
        answer: q.answer || ''
      }),
      ...(type === 'Điền khuyết' && {
        blanks: q.blanks || []
      })
    }));

  } catch (error) {
    if ((error.message.includes('429') || error.message.includes('quota')) && retryCount < 3) {
        // Đọc thời gian chờ do Google trả về (vd: "retryDelay":"16s")
        let waitTime = 10000;
        const matchDelaySec = error.message.match(/Please retry in ([\d.]+)s/);
        const matchDelayJson = error.message.match(/"retryDelay":"([\d.]+)s"/);
        if (matchDelaySec && matchDelaySec[1]) {
            waitTime = (parseFloat(matchDelaySec[1]) * 1000) + 2000;
        } else if (matchDelayJson && matchDelayJson[1]) {
            waitTime = (parseFloat(matchDelayJson[1]) * 1000) + 2000;
        }
        console.log(`[AI Service] Batch ${batchIndex} bị Rate Limit. Chờ ${(waitTime/1000).toFixed(1)}s rồi thử lại (Lần ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateQuestionsBatch(text, type, quantity, difficulty, apiKey, batchIndex, retryCount + 1);
    }
    
    console.error(`[AI Service] Lỗi khi gọi Gemini (Batch ${batchIndex}):`, error.message);
    throw error;
  }
}

async function generateQuestions(text, type, quantity, difficulty = 'Trung bình') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    console.warn('[AI Service] Không có GEMINI_API_KEY hợp lệ, sử dụng dữ liệu giả lập.');
    return generateMockQuestions(text, type, quantity, difficulty);
  }

  try {
    let allQuestions = [];
    const batchSizes = [];
    
    // Gemini 2.0 Flash rất mạnh, ta có thể yêu cầu tới 50 câu 1 lúc để tối ưu tốc độ
    const SAFE_BATCH_SIZE = 50;
    
    if (quantity <= SAFE_BATCH_SIZE) {
        // Chỉ cần 1 đợt duy nhất, thêm buffer nhẹ 2 câu để lọc trùng
        batchSizes.push(quantity + 2); 
    } else {
        // Nếu trên 50 câu, chia thành các đợt 50 câu
        let remainingToFetch = Math.ceil(quantity * 1.05);
        while (remainingToFetch > 0) {
            batchSizes.push(Math.min(SAFE_BATCH_SIZE, remainingToFetch));
            remainingToFetch -= SAFE_BATCH_SIZE;
        }
    }

    console.log(`[AI Service] Bắt đầu sinh ${quantity} câu hỏi (Lô: ${batchSizes.join(', ')})`);

    for (let i = 0; i < batchSizes.length; i++) {
        const size = batchSizes[i];
        try {
            console.log(`[AI Service] Đợt ${i + 1}/${batchSizes.length}: ${size} câu...`);
            const batch = await generateQuestionsBatch(text, type, size, difficulty, apiKey, i);
            allQuestions = allQuestions.concat(batch);
            
            // Nếu có đợt 2, nghỉ 2 giây để Google API không ghi nhận là spam
            if (i < batchSizes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (batchErr) {
            console.warn(`[AI Service] Lỗi đợt ${i + 1}:`, batchErr.message);
            // Nếu đợt 1 thành công mà đợt 2 lỗi, ta vẫn có thể dùng đợt 1
            if (allQuestions.length === 0 && i === batchSizes.length - 1) {
                throw batchErr;
            }
        }
    }

    if (allQuestions.length === 0) {
        throw new Error('AI không phản hồi dữ liệu câu hỏi');
    }

    let uniqueQuestions = removeDuplicateQuestions(allQuestions);
    let finalQuestions = uniqueQuestions.slice(0, quantity);
    finalQuestions = finalQuestions.map((q, i) => ({ ...q, id: i + 1 }));

    console.log(`[AI Service] Hoàn tất thành công: ${finalQuestions.length}/${quantity} câu.`);
    return finalQuestions;

  } catch (error) {
    console.error('[AI Service] Lỗi quá trình sinh câu:', error.message);
    // Nếu là lỗi Rate Limit thực sự (hết quota), throw để frontend hiển thị thông báo rõ ràng
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('API_RATE_LIMIT: API Gemini đã đạt giới hạn. Vui lòng thử lại sau vài phút.');
    }
    console.log('[AI Service] Fallback sang dữ liệu giả lập.');
    return generateMockQuestions(text, type, quantity, difficulty);
  }
}

/**
 * Sinh câu hỏi giả lập khi không có API key hoặc lỗi AI
 */
function generateMockQuestions(text, type, quantity, difficulty = 'Trung bình') {
  console.log(`[AI Service] Đang sinh dữ liệu MOCK (giả lập) với độ khó: ${difficulty}...`);
  const mockQuestions = [];
  const shortText = text.substring(0, 80);
  
  // Thêm đa dạng cho mock data
  const topicKeywords = ['khái niệm', 'định nghĩa', 'tác dụng', 'phân loại', 'nguyên nhân', 'hệ quả', 'ứng dụng', 'thực hành', 'so sánh', 'đặc điểm'];
  const verbs = ['nêu', 'trình bày', 'phân tích', 'giải thích', 'so sánh', 'đánh giá', 'mô tả', 'chứng minh'];

  for (let i = 1; i <= quantity; i++) {
    const topicIdx = (i - 1) % topicKeywords.length;
    const verbIdx = (i - 1) % verbs.length;
    const topic = topicKeywords[topicIdx];
    const verb = verbs[verbIdx];

    let questionData = {
      id: i,
      type: type,
      question: `[MOCK] ${verb.charAt(0).toUpperCase() + verb.slice(1)} ${topic} về "${shortText}..." (câu ${i})?`
    };

    if (type === 'Trắc nghiệm') {
      questionData.options = [
        `A. ${topic} thứ nhất của "${shortText}"`,
        `B. ${topic} thứ hai liên quan đến đoạn văn`,
        `C. Định nghĩa chính xác của ${topic}`,
        `D. Tất cả các câu trên đều đúng`
      ];
      questionData.correctAnswer = `${String.fromCharCode(65 + (i % 4))}. ${questionData.options[i % 4].substring(3)}`;
    } else if (type === 'Tự luận') {
      questionData.answer = `Gợi ý mẫu: ${verb} ${topic} dựa trên nội dung "${shortText}..." (câu ${i}).`;
    } else if (type === 'Điền khuyết') {
      questionData.question = `[MOCK] Câu văn về ${topic} có chỗ trống ____ và ____ (câu ${i}).`;
      questionData.blanks = [`${topic}-${i}a`, `${topic}-${i}b`];
    }

    mockQuestions.push(questionData);
  }
  return mockQuestions;
}

/**
 * Tính độ tương đồng giữa hai chuỗi bằng cách tính Levenshtein distance
 * Trả về số từ 0-1 (1 = giống hệt, 0 = hoàn toàn khác)
 */
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - (distance / maxLen);
}

/**
 * Loại bỏ câu hỏi trùng lặp dựa trên độ tương đồng
 * Nếu hai câu hỏi giống nhau > 70%, xem như trùng lặp
 */
function removeDuplicateQuestions(questions) {
  const unique = [];
  const SIMILARITY_THRESHOLD = 0.85; // Tăng ngưỡng từ 0.7 lên 0.85 để không cắt bớt câu hỏi của người dùng

  for (const question of questions) {
    let isDuplicate = false;

    for (const existing of unique) {
      // So sánh nội dung câu hỏi
      const similarity = calculateSimilarity(
        question.question.toLowerCase().replace(/[^\w\s]/g, ''),
        existing.question.toLowerCase().replace(/[^\w\s]/g, '')
      );

      if (similarity > SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        console.log(`[AI Service] Phát hiện câu trùng lặp: "${question.question.substring(0, 50)}..." (similarity: ${(similarity * 100).toFixed(1)}%)`);
        break;
      }
    }

    if (!isDuplicate) {
      unique.push({
        ...question,
        id: unique.length + 1 // Re-index IDs
      });
    }
  }

  return unique;
}

module.exports = { generateQuestions };