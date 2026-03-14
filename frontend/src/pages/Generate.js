import React, { useState } from 'react';
import './Generate.css';

const Generate = () => {
  const [text, setText] = useState('');
  const [questionType, setQuestionType] = useState('Trắc nghiệm');
  const [difficulty, setDifficulty] = useState('Trung bình');
  const [quantity, setQuantity] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRegenerateIndex, setPreviewRegenerateIndex] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setGeneratedQuestions([]);

    try {
      const response = await fetch('http://localhost:3000/api/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          type: questionType,
          quantity,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể sinh câu hỏi.');
      }

      if (data.warning) {
        setError(data.warning); 
      }

      setGeneratedQuestions(data.data);
      setShowPreview(true); 
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle) {
      setSaveMessage({ type: 'error', text: 'Vui lòng nhập tên cho bộ đề thi.' });
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch('http://localhost:3000/api/quizzes/create-from-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: quizTitle,
          questions: generatedQuestions,
          duration: duration
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể lưu đề thi.');
      }
      setSaveMessage({ type: 'success', text: `Lưu thành công! Mã đề thi của bạn là: ${data.quizCode}` });
      setShowPreview(false); 
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditQuestion = (index) => {
    setEditingQuestion(index);
  };

  const handleDeleteQuestion = (index) => {
    const newQuestions = generatedQuestions.filter((_, i) => i !== index);
    setGeneratedQuestions(newQuestions);
  };

  const handleRegenerateQuestion = async (index) => {
    setPreviewRegenerateIndex(index);
    try {
      const response = await fetch('http://localhost:3000/api/questions/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          type: questionType,
          difficulty
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo lại câu hỏi.');
      }
      const newQ = data.data;
      newQ.id = generatedQuestions[index].id;
      const copy = [...generatedQuestions];
      copy[index] = newQ;
      setGeneratedQuestions(copy);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewRegenerateIndex(null);
    }
  };

  const handleSaveQuestion = (index, updatedQuestion) => {
    const newQuestions = [...generatedQuestions];
    newQuestions[index] = updatedQuestion;
    setGeneratedQuestions(newQuestions);
    setEditingQuestion(null);
  };

  const handleShuffleQuestions = () => {
    const shuffled = [...generatedQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setGeneratedQuestions(shuffled);
  };

  const QuestionEditModal = ({ question, index, onSave, onClose }) => {
    const [editForm, setEditForm] = useState(question);

    const handleEditChange = (field, value) => {
      if (field === 'options') {
        setEditForm({ ...editForm, options: value });
      } else if (field === 'blanks') {
        setEditForm({ ...editForm, blanks: value });
      } else {
        setEditForm({ ...editForm, [field]: value });
      }
    };

    const handleOptionChange = (optionIndex, value) => {
      const newOptions = [...editForm.options];
      newOptions[optionIndex] = value;
      setEditForm({ ...editForm, options: newOptions });
    };

    const handleBlankChange = (blankIndex, value) => {
      const newBlanks = [...editForm.blanks];
      newBlanks[blankIndex] = value;
      setEditForm({ ...editForm, blanks: newBlanks });
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-header">Chỉnh sửa Câu hỏi {index + 1}</h3>

          <div className="input-group">
            <label className="input-label">Câu hỏi:</label>
            <textarea
              className="gen-textarea"
              style={{ minHeight: '80px', padding: '12px' }}
              value={editForm.question}
              onChange={(e) => handleEditChange('question', e.target.value)}
            />
          </div>

          {editForm.type === 'Trắc nghiệm' && editForm.options && (
            <div className="input-group">
              <label className="input-label">Đáp án:</label>
              {editForm.options.map((option, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="gen-input"
                    style={{ padding: '8px 12px' }}
                    value={option}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                  />
                </div>
              ))}
              <div style={{ marginTop: '16px' }}>
                <label className="input-label" style={{ color: '#10b981' }}>Đáp án đúng:</label>
                <input
                  type="text"
                  className="gen-input"
                  style={{ borderColor: '#10b981', padding: '8px 12px' }}
                  value={editForm.correctAnswer}
                  onChange={(e) => handleEditChange('correctAnswer', e.target.value)}
                  placeholder="VD: A. Đáp án A"
                />
              </div>
            </div>
          )}

          {editForm.type === 'Tự luận' && (
            <div className="input-group">
              <label className="input-label">Gợi ý trả lời:</label>
              <textarea
                className="gen-textarea"
                style={{ minHeight: '100px', padding: '12px' }}
                value={editForm.answer}
                onChange={(e) => handleEditChange('answer', e.target.value)}
              />
            </div>
          )}

          {editForm.type === 'Điền khuyết' && editForm.blanks && (
            <div className="input-group">
              <label className="input-label">Từ cần điền (danh sách):</label>
              {editForm.blanks.map((blank, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="gen-input"
                    style={{ padding: '8px 12px' }}
                    value={blank}
                    onChange={(e) => handleBlankChange(i, e.target.value)}
                    placeholder={`Từ ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button onClick={onClose} className="btn-secondary">Hủy</button>
            <button onClick={() => onSave(index, editForm)} className="gen-btn" style={{ width: 'auto', padding: '10px 24px' }}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PreviewModal = ({ questions, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '800px' }}>
          <h2 className="modal-header">Đã sinh thành công {questions.length} câu hỏi 🎉</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Xem lướt qua các câu hỏi vừa tạo, bạn có thể chỉnh sửa ngay bây giờ hoặc lưu thành đề.</p>
          
          <div style={{ paddingRight: '10px' }}>
            {questions.map((q, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                <p style={{ fontWeight: '600', margin: '0 0 12px 0', fontSize: '1.05rem', color: '#1f2937' }}>{`Câu ${index + 1}: ${q.question}`}</p>
                {q.type === 'Trắc nghiệm' && q.options && (
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, fontSize: '0.95rem' }}>
                    {q.options.map((opt, i) => (
                      <li key={i} style={{ padding: '6px 0', color: opt === q.correctAnswer ? '#10b981' : '#4b5563', fontWeight: opt === q.correctAnswer ? '600' : '400' }}>
                        {opt === q.correctAnswer ? '✓ ' : '• '}{opt}
                      </li>
                    ))}
                  </ul>
                )}
                {q.type === 'Tự luận' && (
                  <p style={{ fontStyle: 'italic', color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Gợi ý: {q.answer}</p>
                )}
                {q.type === 'Điền khuyết' && (
                  <p style={{ fontStyle: 'italic', color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Các từ: {q.blanks.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={onClose} className="btn-secondary">Tiếp tục chỉnh sửa</button>
            <button onClick={() => { onClose(); document.getElementById('saveSection').scrollIntoView({behavior: 'smooth'}) }} className="gen-btn" style={{ width: 'auto', padding: '12px 24px' }}>
              Xác nhận và Lưu
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    if (generatedQuestions.length === 0) {
      if (!isLoading && !error) {
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p style={{ fontSize: '1.1rem' }}>Chưa có câu hỏi nào. Hãy nhập văn bản và bấm "Sinh Câu Hỏi"!</p>
          </div>
        );
      }
      return null;
    }

    return (
      <div style={{ marginTop: '20px' }}>
        <div className="result-header">
          <h2>Kết Quả: {generatedQuestions.length} Câu Hỏi</h2>
          <button onClick={handleShuffleQuestions} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Trộn đảo câu
          </button>
        </div>

        {generatedQuestions.map((q, index) => (
          <div key={q.id} className="q-card">
            <h3 className="q-title">{`Câu ${index + 1}: ${q.question}`}</h3>
            
            {q.type === 'Trắc nghiệm' && q.options && (
              <ul className="q-options">
                {q.options.map((option, i) => {
                  const isCorrect = option === q.correctAnswer;
                  return (
                    <li key={i} className={`q-option ${isCorrect ? 'correct' : ''}`}>
                      <span style={{ fontWeight: '600', marginRight: '8px' }}>{String.fromCharCode(65 + i)}.</span> {option}
                      {isCorrect && <span style={{ float: 'right' }}>✓ Đáp án</span>}
                    </li>
                  )
                })}
              </ul>
            )}
            
            {q.type === 'Tự luận' && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Gợi ý trả lời:</p>
                <p style={{ margin: 0, color: '#334155' }}>{q.answer}</p>
              </div>
            )}
            
            {q.type === 'Điền khuyết' && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Các từ cần điền:</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {q.blanks.map((blank, i) => (
                    <span key={i} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '6px 14px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: '600' }}>
                      {blank}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="q-footer-actions">
              <button className="btn-sm btn-edit" onClick={() => handleEditQuestion(index)}>Tiểu chỉnh</button>
              <button className="btn-sm btn-regen" onClick={() => handleRegenerateQuestion(index)}>
                {previewRegenerateIndex === index ? 'Đang xoay...' : '🔄 Sinh lại câu này'}
              </button>
              <button className="btn-sm btn-del" onClick={() => handleDeleteQuestion(index)}>🗑 Xóa</button>
            </div>
          </div>
        ))}
        
        <div id="saveSection" className="save-module">
          <h3 style={{ marginBottom: '24px' }}>Lưu Thành Đề Thi</h3>
          <div className="input-group">
            <label className="input-label">Tên bộ đề mới:</label>
            <input
              type="text"
              className="gen-input"
              placeholder="VD: Kiểm tra 15 phút Lịch Sử..."
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
            />
          </div>
          
          <div className="input-group" style={{ maxWidth: '200px' }}>
            <label className="input-label">Thời gian làm bài (Phút):</label>
            <input
              type="number"
              className="gen-input"
              value={duration}
              min="1"
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            />
          </div>
          
          <button onClick={handleSaveQuiz} disabled={isSaving} className="gen-btn" style={{ marginTop: '16px' }}>
            {isSaving ? <><div className="spinner"></div> Đang xuất đề...</> : 'Lưu và Trích Xuất Đề Thi'}
          </button>
          
          {saveMessage && (
            <div className={`alert ${saveMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '24px', marginBottom: 0 }}>
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="gen-wrapper">
      <div className="gen-header">
        <h1>Khởi Tạo Ngân Hàng Câu Hỏi</h1>
        <p>Biến mọi đoạn văn bản thành bài kiểm tra chất lượng chỉ trong vài giây. Hỗ trợ tối đa 100 câu hỏi với độ khó tùy chỉnh.</p>
      </div>

      <div className="gen-card">
        <div className="input-group">
          <label className="input-label">1. Nhập văn bản tài liệu của bạn</label>
          <textarea
            className="gen-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán nội dung tài liệu lịch sử, khoa học, bài giảng... Hệ thống sẽ AI sẽ đọc hiểu và trích xuất câu hỏi từ đây."
          ></textarea>
        </div>

        <div className="controls-row">
          <div className="control-item">
            <label className="input-label">2. Kiểu câu hỏi</label>
            <select className="gen-select" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
              <option value="Trắc nghiệm">Trắc nghiệm (A, B, C, D)</option>
              <option value="Tự luận">Tự luận mở</option>
              <option value="Điền khuyết">Điền vào chỗ trống</option>
            </select>
          </div>
          
          <div className="control-item">
            <label className="input-label">3. Mức độ tư duy</label>
            <select className="gen-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Dễ">Dễ (Nhận biết)</option>
              <option value="Trung bình">Trung bình (Thông hiểu)</option>
              <option value="Khó">Khó (Vận dụng cao)</option>
            </select>
          </div>
          
          <div className="control-item">
            <label className="input-label">4. Số câu (1-100)</label>
            <input
              type="number"
              className="gen-input"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              min="1"
              max="100"
            />
          </div>
        </div>

        <button onClick={handleGenerate} disabled={isLoading || !text} className="gen-btn">
          {isLoading ? (
            <>
               <div className="spinner"></div> {quantity > 90 ? 'Hệ thống đang sinh số lượng lớn, có thể mất 1-2 phút...' : 'Hệ thống AI đang phân tích dữ liệu...'}
            </>
          ) : (
            '🚀 Bắt Đầu Sinh Câu Hỏi'
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '32px' }}>
          <strong>Lỗi xảy ra:</strong> {error}
        </div>
      )}

      {renderQuestions()}

      {editingQuestion !== null && (
        <QuestionEditModal
          question={generatedQuestions[editingQuestion]}
          index={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}
      
      {showPreview && (
        <PreviewModal
          questions={generatedQuestions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default Generate;