/**
 * ================================================================
 *  QUESTION PIPELINE
 * ================================================================
 *
 *  User nhập văn bản
 *        ↓
 *  Backend nhận request
 *        ↓
 *  Gửi prompt AI
 *        ↓
 *  AI trả JSON câu hỏi
 *        ↓
 *  [BƯỚC 1] Validate JSON        ← kiểm tra cấu trúc hợp lệ
 *        ↓
 *  [BƯỚC 2] Filter duplicate     ← loại câu trùng lặp / tương đồng
 *        ↓
 *  [BƯỚC 3] Filter template      ← loại câu dùng mẫu chung chung
 *        ↓
 *  [BƯỚC 4] Filter language      ← đảm bảo câu hỏi là tiếng Việt
 *        ↓
 *  Save database
 *        ↓
 *  Return frontend
 * ================================================================
 */

// ================================================================
// BƯỚC 1: VALIDATE JSON
// Kiểm tra mỗi câu hỏi có đúng cấu trúc JSON mong đợi không
// ================================================================

function _validateMCQ(q) {
    if (!q || typeof q !== 'object')
        return { valid: false, reason: 'Không phải object' };

    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0)
        return { valid: false, reason: 'Thiếu hoặc rỗng trường "question"' };

    if (!q.options || typeof q.options !== 'object')
        return { valid: false, reason: 'Thiếu trường "options"' };

    // Hỗ trợ 2 định dạng: { A, B, C, D } hoặc mảng ["...", "...", ...]
    const optVals = Array.isArray(q.options)
        ? q.options.map(String)
        : ['A', 'B', 'C', 'D'].map(k => q.options[k]).filter(Boolean);

    if (optVals.length < 4)
        return { valid: false, reason: 'Cần đủ 4 đáp án (A, B, C, D)' };

    let correctKey = String(q.correctAnswer || q.correct || '').trim().toUpperCase();
    // Nếu là "ĐÁP ÁN A" -> lấy "A"
    if (correctKey.includes('ĐÁP ÁN ')) {
        correctKey = correctKey.replace('ĐÁP ÁN ', '').trim();
    }
    // Lấy ký tự đầu tiên (A, B, C, D)
    const firstChar = correctKey.charAt(0);
    if (!['A', 'B', 'C', 'D'].includes(firstChar))
        return { valid: false, reason: `correctAnswer không hợp lệ: "${q.correctAnswer || q.correct}"` };

    return { valid: true };
}

function _validateEssay(q) {
    if (!q || typeof q !== 'object')
        return { valid: false, reason: 'Không phải object' };
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0)
        return { valid: false, reason: 'Thiếu hoặc rỗng trường "question"' };
    return { valid: true };
}

function _validateCloze(q) {
    if (!q || typeof q !== 'object')
        return { valid: false, reason: 'Không phải object' };
    if (!q.question || !q.question.includes('____'))
        return { valid: false, reason: 'Câu điền khuyết phải chứa "____"' };
    if (!q.blanks || !Array.isArray(q.blanks) || q.blanks.length === 0)
        return { valid: false, reason: 'Thiếu hoặc rỗng mảng "blanks"' };
    return { valid: true };
}

/**
 * [BƯỚC 1] Validate JSON - lọc câu có cấu trúc sai
 * @param {Array}  rawList - Mảng câu hỏi thô từ AI
 * @param {string} type    - 'Trắc nghiệm' | 'Tự luận' | 'Điền khuyết'
 * @returns {{ passed: Array, rejected: Array }}
 */
function validateJSON(rawList, type) {
    if (!Array.isArray(rawList)) {
        console.warn('[PIPELINE][STEP-1-VALIDATE] Response từ AI không phải mảng → bỏ qua batch.');
        return { passed: [], rejected: [{ reason: 'Response không phải Array', item: rawList }] };
    }

    const passed = [], rejected = [];

    for (const q of rawList) {
        let result;
        if      (type === 'Trắc nghiệm') result = _validateMCQ(q);
        else if (type === 'Tự luận')      result = _validateEssay(q);
        else                               result = _validateCloze(q);

        if (result.valid) {
            passed.push(q);
        } else {
            rejected.push({ reason: result.reason, item: q });
            console.warn(`[PIPELINE][STEP-1-VALIDATE] Loại: ${result.reason}`);
        }
    }

    console.log(`[PIPELINE][STEP-1-VALIDATE] ${passed.length} hợp lệ / ${rejected.length} bị loại`);
    return { passed, rejected };
}


// ================================================================
// BƯỚC 2: FILTER DUPLICATE
// Loại câu trùng tuyệt đối hoặc tương đồng ngữ nghĩa quá cao
// ================================================================

/**
 * Chuẩn hóa chuỗi để so sánh
 */
function normalizeText(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'"]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tính độ tương đồng Jaccard giữa 2 chuỗi (0 → 1)
 */
function _jaccard(s1, s2) {
    const w1 = new Set(s1.split(/\s+/));
    const w2 = new Set(s2.split(/\s+/));
    const inter = [...w1].filter(w => w2.has(w)).length;
    const union = new Set([...w1, ...w2]).size;
    return union === 0 ? 0 : inter / union;
}

/**
 * [BƯỚC 2] Filter duplicate
 * @param {Array}  questions        - Câu đã qua Validate JSON
 * @param {Array}  existingNorms    - Chuỗi chuẩn hoá của các câu từ batch trước (chống trùng xuyên batch)
 * @param {number} threshold        - Ngưỡng tương đồng (mặc định 0.72 = 72%)
 * @returns {{ passed: Array, rejected: Array, updatedNorms: Array }}
 */
function filterDuplicate(questions, existingNorms = [], threshold = 0.72) {
    const passed = [], rejected = [];
    const seen = [...existingNorms]; // gộp cả các câu từ batch trước

    for (const q of questions) {
        const text = (q.question || '').trim();
        const norm = normalizeText(text);

        // Trùng tuyệt đối
        if (seen.includes(norm)) {
            rejected.push({ reason: 'Trùng tuyệt đối với câu đã có', question: text });
            console.warn(`[PIPELINE][STEP-2-DUPLICATE] Trùng tuyệt đối: "${text.substring(0, 60)}..."`);
            continue;
        }

        // Tương đồng ngữ nghĩa quá cao
        let similar = false;
        for (const s of seen) {
            if (_jaccard(norm, s) > threshold) {
                similar = true;
                break;
            }
        }
        if (similar) {
            rejected.push({ reason: `Tương đồng > ${(threshold * 100).toFixed(0)}% với câu đã có`, question: text });
            console.warn(`[PIPELINE][STEP-2-DUPLICATE] Quá tương đồng: "${text.substring(0, 60)}..."`);
            continue;
        }

        seen.push(norm);
        passed.push(q);
    }

    console.log(`[PIPELINE][STEP-2-DUPLICATE] ${passed.length} giữ lại / ${rejected.length} bị loại`);
    return { passed, rejected, updatedNorms: seen };
}


// ================================================================
// BƯỚC 3: FILTER TEMPLATE
// Loại câu hỏi và đáp án dùng mẫu chung chung, không mang giá trị kiến thức
// ================================================================

const FORBIDDEN_QUESTION_TEMPLATES = [
    // 'phát biểu nào sau đây là đúng', // Cho phép lại vì quá phổ biến
    // 'phát biểu nào sau đây là sai',
    'câu hỏi này không có nội dung',
    'không tìm thấy thông tin',
];

const FORBIDDEN_ANSWER_TEMPLATES = [
    'thông tin này không chính xác',
    'vấn đề này đang được tranh luận',
    'chưa có kết luận cụ thể',
    'nội dung được đề cập trực tiếp',
    'nội dung trái thực tế',
    'tất cả các đáp án trên',
    'không có đáp án nào đúng',
    'không có đáp án nào',
    'cả a, b, c đều đúng',
    'cả a, b, c đều sai',
];

function _hasForbidden(str, list) {
    const low = (str || '').toLowerCase().trim();
    return list.some(t => low.includes(t));
}

/**
 * [BƯỚC 3] Filter template
 * @param {Array}  questions
 * @param {string} type
 * @returns {{ passed: Array, rejected: Array }}
 */
function filterTemplate(questions, type) {
    const passed = [], rejected = [];

    for (const q of questions) {
        const qText = (q.question || '').trim();

        // Câu hỏi dùng mẫu bị cấm
        if (_hasForbidden(qText, FORBIDDEN_QUESTION_TEMPLATES)) {
            rejected.push({ reason: 'Câu hỏi dùng mẫu chung chung bị cấm', question: qText });
            console.warn(`[PIPELINE][STEP-3-TEMPLATE] Mẫu câu hỏi bị cấm: "${qText.substring(0, 60)}"`);
            continue;
        }

        // Đáp án dùng mẫu bị cấm (chỉ Trắc nghiệm)
        if (type === 'Trắc nghiệm' && q.options) {
            const optVals = Array.isArray(q.options)
                ? q.options
                : Object.values(q.options);

            const hasBadAnswer = optVals.some(
                opt => typeof opt === 'string' && _hasForbidden(opt, FORBIDDEN_ANSWER_TEMPLATES)
            );

            if (hasBadAnswer) {
                rejected.push({ reason: 'Đáp án dùng mẫu chung chung bị cấm', question: qText });
                console.warn(`[PIPELINE][STEP-3-TEMPLATE] Mẫu đáp án bị cấm trong: "${qText.substring(0, 60)}"`);
                continue;
            }

            // Đáp án bị trùng nhau (AI sinh ra 4 đáp án giống nhau)
            const normOpts = optVals.map(o => normalizeText(String(o)));
            if (new Set(normOpts).size < normOpts.length) {
                rejected.push({ reason: 'Các đáp án bị trùng nhau', question: qText });
                console.warn(`[PIPELINE][STEP-3-TEMPLATE] Đáp án trùng nhau trong: "${qText.substring(0, 60)}"`);
                continue;
            }
        }

        passed.push(q);
    }

    console.log(`[PIPELINE][STEP-3-TEMPLATE] ${passed.length} hợp lệ / ${rejected.length} bị loại`);
    return { passed, rejected };
}


// ================================================================
// BƯỚC 4: FILTER LANGUAGE
// Đảm bảo câu hỏi và đáp án là tiếng Việt, đủ độ dài
// ================================================================

// Regex ký tự có dấu tiếng Việt
const VI_CHARS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/;
const MIN_Q_LENGTH = 15; // Độ dài tối thiểu câu hỏi
const MIN_A_LENGTH = 2;  // Độ dài tối thiểu đáp án

function _isVietnamese(str) {
    if (!str || str.trim().length === 0) return false;
    // Nếu có ký tự có dấu → chắc chắn tiếng Việt
    if (VI_CHARS.test(str)) return true;
    
    // Nới lỏng: Nếu chứa các từ phổ biến không dấu của tiếng Việt
    const commonViWords = [' la ', ' cua ', ' cho ', ' tai ', ' moi ', ' cac ', ' nhung ', ' duoc '];
    const low = ' ' + str.toLowerCase() + ' ';
    if (commonViWords.some(w => low.includes(w))) return true;

    // Nếu toàn Latin không dấu VÀ nhiều hơn 8 từ (tăng từ 5 lên 8) → nghi là tiếng Anh
    const isAllLatin = /^[a-zA-Z0-9\s.,?!;:\-'"()]+$/.test(str);
    if (isAllLatin && str.split(/\s+/).length > 8) return false;
    
    return true; 
}

/**
 * [BƯỚC 4] Filter language
 * @param {Array}  questions
 * @param {string} type
 * @returns {{ passed: Array, rejected: Array }}
 */
function filterLanguage(questions, type) {
    const passed = [], rejected = [];

    for (const q of questions) {
        const qText = (q.question || '').trim();

        // Quá ngắn
        if (qText.length < MIN_Q_LENGTH) {
            rejected.push({ reason: `Câu hỏi quá ngắn (${qText.length} ký tự, tối thiểu ${MIN_Q_LENGTH})`, question: qText });
            console.warn(`[PIPELINE][STEP-4-LANGUAGE] Câu hỏi quá ngắn: "${qText}"`);
            continue;
        }

        // Không phải tiếng Việt
        if (!_isVietnamese(qText)) {
            rejected.push({ reason: 'Câu hỏi không phải tiếng Việt', question: qText });
            console.warn(`[PIPELINE][STEP-4-LANGUAGE] Không phải tiếng Việt: "${qText.substring(0, 60)}"`);
            continue;
        }

        // Kiểm tra đáp án (chỉ Trắc nghiệm)
        if (type === 'Trắc nghiệm' && q.options) {
            const optVals = Array.isArray(q.options)
                ? q.options
                : Object.values(q.options);

            let badOpt = null;
            for (const opt of optVals) {
                const s = String(opt).trim();
                if (s.length < MIN_A_LENGTH) { badOpt = `Đáp án quá ngắn: "${s}"`; break; }
                if (!_isVietnamese(s) && s.split(/\s+/).length > 5) { badOpt = `Đáp án không phải tiếng Việt: "${s}"`; break; }
            }

            if (badOpt) {
                rejected.push({ reason: badOpt, question: qText });
                console.warn(`[PIPELINE][STEP-4-LANGUAGE] ${badOpt}`);
                continue;
            }
        }

        passed.push(q);
    }

    console.log(`[PIPELINE][STEP-4-LANGUAGE] ${passed.length} hợp lệ / ${rejected.length} bị loại`);
    return { passed, rejected };
}


// ================================================================
// HÀM CHÍNH: runPipeline
// Gọi tuần tự 4 bước lọc, trả về câu hỏi sạch + thống kê
// ================================================================

/**
 * Chạy toàn bộ pipeline lọc câu hỏi
 *
 * @param {Array}  rawQuestions  - Mảng câu hỏi thô từ AI response
 * @param {string} type          - 'Trắc nghiệm' | 'Tự luận' | 'Điền khuyết'
 * @param {Array}  existingNorms - Chuỗi chuẩn hoá của câu từ batch trước (chống trùng xuyên batch)
 * @returns {{ questions: Array, stats: Object, updatedNorms: Array }}
 */
function runPipeline(rawQuestions, type, existingNorms = []) {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  PIPELINE BẮT ĐẦU  |  ${rawQuestions.length} câu thô từ AI  ║`);
    console.log(`╚══════════════════════════════════════════╝`);

    // ── BƯỚC 1: Validate JSON ─────────────────────────────────────
    const step1 = validateJSON(rawQuestions, type);

    // ── BƯỚC 2: Filter Duplicate ──────────────────────────────────
    const step2 = filterDuplicate(step1.passed, existingNorms);

    // ── BƯỚC 3: Filter Template ───────────────────────────────────
    const step3 = filterTemplate(step2.passed, type);

    // ── BƯỚC 4: Filter Language ───────────────────────────────────
    const step4 = filterLanguage(step3.passed, type);

    const stats = {
        raw:              rawQuestions.length,
        afterValidate:    step1.passed.length,
        afterDuplicate:   step2.passed.length,
        afterTemplate:    step3.passed.length,
        afterLanguage:    step4.passed.length,
        totalRejected:    rawQuestions.length - step4.passed.length,
    };

    console.log(`╔══════════════════════════════════════════╗`);
    console.log(`║            KẾT QUẢ PIPELINE              ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Thô từ AI            : ${String(stats.raw).padStart(4)}             ║`);
    console.log(`║  Sau Validate JSON    : ${String(stats.afterValidate).padStart(4)}             ║`);
    console.log(`║  Sau Filter Duplicate : ${String(stats.afterDuplicate).padStart(4)}             ║`);
    console.log(`║  Sau Filter Template  : ${String(stats.afterTemplate).padStart(4)}             ║`);
    console.log(`║  Sau Filter Language  : ${String(stats.afterLanguage).padStart(4)}  ✅ PASS     ║`);
    console.log(`║  Tổng bị loại         : ${String(stats.totalRejected).padStart(4)}             ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);

    return {
        questions:    step4.passed,
        stats,
        updatedNorms: step2.updatedNorms,
    };
}


module.exports = {
    runPipeline,
    normalizeText,
    // Export riêng từng bước để có thể test độc lập
    validateJSON,
    filterDuplicate,
    filterTemplate,
    filterLanguage,
};
