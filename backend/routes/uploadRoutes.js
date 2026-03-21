const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const jwt = require('jsonwebtoken');

// Setup multer to store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware (if needed, but optional for text extraction, I'll protect it)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.post('/extract-text', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một file.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    let text = '';

    if (originalname.endsWith('.txt')) {
      // Decode utf-8 text file
      text = buffer.toString('utf8');
    } else if (originalname.endsWith('.pdf')) {
      const data = await pdf(buffer);
      text = data.text;
    } else if (originalname.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return res.status(400).json({ success: false, message: 'Định dạng file không được hỗ trợ. Chỉ hỗ trợ .txt, .pdf, .docx.' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Không thể trích xuất văn bản hoặc file rỗng.' });
    }

    res.json({ success: true, data: text });

  } catch (error) {
    console.error('Lỗi khi trích xuất file:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi xử lý file.', error: error.message });
  }
});

module.exports = router;
