import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../apiConfig';

const QuestionManager = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterQuizCode, setFilterQuizCode] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({ question: '', type: '', options: [], answer: '', blanks: [] });

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    let filtered = questions;
    
    // Tìm kiếm theo nội dung câu hỏi HOẶC mã đề
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(term) || 
        (q.maDeThi && q.maDeThi.toLowerCase().includes(term))
      );
    }
    
    // Lọc theo loại câu hỏi
    if (filterType) {
      filtered = filtered.filter(q => q.type === filterType);
    }

    // Lọc theo mã đề thi cụ thể
    if (filterQuizCode) {
      filtered = filtered.filter(q => 
        q.maDeThi && q.maDeThi.split(', ').includes(filterQuizCode)
      );
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, filterType, filterQuizCode]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/my-questions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể tải danh sách câu hỏi.');
      }
      setQuestions(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Không thể xóa câu hỏi.');
      }
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question.id);
    setEditForm({
      question: question.question,
      type: question.type,
      options: question.options || [],
      answer: question.answer || '',
      blanks: question.blanks || []
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${editingQuestion}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      if (!response.ok) {
        throw new Error('Không thể cập nhật câu hỏi.');
      }
      setQuestions(questions.map(q =>
        q.id === editingQuestion ? { ...q, ...editForm } : q
      ));
      setEditingQuestion(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
  };

  // Lấy danh sách mã đề duy nhất từ dữ liệu câu hỏi
  const uniqueQuizCodes = [...new Set(questions.flatMap(q => q.maDeThi ? q.maDeThi.split(', ') : []))].sort();

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Đang tải...</div>;
  if (error) return <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '50px' }}>Lỗi: {error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Ngân Hàng Câu Hỏi</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Quản lý và chỉnh sửa tất cả các câu hỏi của bạn</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }}>
             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            placeholder="Tìm theo nội dung hoặc mã đề (vd: TEST01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '42px', height: '100%' }}
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">Tất cả phân loại</option>
          <option value="Trắc nghiệm">Trắc nghiệm</option>
          <option value="Tự luận">Tự luận</option>
          <option value="Điền khuyết">Điền khuyết</option>
        </select>

        <select
          value={filterQuizCode}
          onChange={(e) => setFilterQuizCode(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">Tất cả mã đề</option>
          {uniqueQuizCodes.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q, index) => (
            <div key={q.id} className="card" style={{ padding: '0', overflow: 'hidden', borderLeft: q.type === 'Trắc nghiệm' ? '4px solid var(--primary)' : q.type === 'Tự luận' ? '4px solid var(--secondary)' : '4px solid var(--warning)' }}>
              {editingQuestion === q.id ? (
                /* ... (phần sửa câu hỏi giữ nguyên) */
              /* )} */
                <div style={{ padding: '24px', background: 'var(--surface)' }}>
                  <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
                     <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Chỉnh sửa câu hỏi</h3>
                  </div>
                  <textarea
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                    style={{ minHeight: '100px', marginBottom: '16px', fontSize: '16px', fontWeight: '500', padding: '16px' }}
                    placeholder="Nhập nội dung câu hỏi..."
                  />
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Loại câu hỏi</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      >
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Tự luận">Tự luận</option>
                        <option value="Điền khuyết">Điền khuyết</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                    {editForm.type === 'Trắc nghiệm' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Các lựa chọn</label>
                        {editForm.options.map((opt, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-tertiary)', width: '24px', fontSize: '16px' }}>{String.fromCharCode(65 + i)}.</span>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...editForm.options];
                                    newOptions[i] = e.target.value;
                                    setEditForm({ ...editForm, options: newOptions });
                                  }}
                                  placeholder={`Nhập đáp án ${String.fromCharCode(65 + i)}`}
                                  style={{ border: editForm.answer === opt ? '2px solid var(--secondary)' : '1px solid var(--border)' }}
                                />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', padding: '8px 12px', background: editForm.answer === opt ? 'rgba(16, 185, 129, 0.1)' : 'transparent', borderRadius: '8px', border: editForm.answer === opt ? '1px solid var(--secondary)' : '1px solid transparent' }}>
                              <input 
                                type="radio" 
                                name={`correct-${q.id}`} 
                                checked={editForm.answer === opt}
                                onChange={() => setEditForm({ ...editForm, answer: opt })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                              />
                               <span style={{ fontWeight: editForm.answer === opt ? '600' : '400', color: editForm.answer === opt ? 'var(--secondary)' : 'var(--text-secondary)' }}>Đáp án đúng</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                    {editForm.type === 'Tự luận' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>Gợi ý trả lời & Từ khóa chấm điểm</label>
                        <textarea
                          value={editForm.answer}
                          onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                          placeholder="Ví dụ: AI là bộ não thông minh tự học..."
                          style={{ minHeight: '120px', padding: '16px' }}
                        />
                      </div>
                    )}
                    {editForm.type === 'Điền khuyết' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>Các từ/cụm từ cần điền (cách nhau bởi dấu phẩy)</label>
                        <input
                          type="text"
                          value={editForm.blanks.join(', ')}
                          onChange={(e) => setEditForm({ ...editForm, blanks: e.target.value.split(',').map(s => s.trim()) })}
                          placeholder="vd: cách mạng, công nghiệp 4.0, tự động hoá"
                          style={{ padding: '14px' }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-secondary" onClick={handleCancelEdit}>
                      Hủy bỏ
                    </button>
                    <button className="btn btn-success" onClick={handleSaveEdit}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Lưu Thay Đổi
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ flex: 1, paddingRight: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            background: q.type === 'Trắc nghiệm' ? 'rgba(79, 70, 229, 0.1)' : q.type === 'Tự luận' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: q.type === 'Trắc nghiệm' ? 'var(--primary)' : q.type === 'Tự luận' ? 'var(--secondary)' : 'var(--warning)',
                          }}>
                            {q.type}
                          </span>
                          
                          {q.maDeThi && q.maDeThi.split(', ').map(code => (
                            <span key={code} style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center',
                              padding: '2px 10px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              background: 'var(--surface-hover)',
                              color: 'var(--text-tertiary)',
                              border: '1px solid var(--border)',
                              textTransform: 'uppercase'
                            }}>
                              {code}
                            </span>
                          ))}
                      </div>
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        <span style={{ color: 'var(--text-tertiary)', marginRight: '8px' }}>#{index + 1}</span>
                        {q.question}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-secondary" style={{ padding: '10px 14px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(q)} title="Sửa">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Sửa</span>
                      </button>
                      <button className="btn btn-danger" style={{ padding: '10px 14px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(q.id)} title="Xóa">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Xóa</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid var(--border)' }}>
                    {q.type === 'Trắc nghiệm' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {q.options.map((opt, i) => {
                          const isCorrect = opt === q.correctAnswer;
                          return (
                            <div key={i} style={{ 
                              display: 'flex', 
                              gap: '12px', 
                              padding: '12px 16px', 
                              background: isCorrect ? 'var(--surface)' : 'transparent',
                              border: isCorrect ? '2px solid var(--secondary)' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              alignItems: 'center',
                              boxShadow: isCorrect ? '0 2px 8px rgba(16,185,129,0.1)' : 'none'
                            }}>
                              <span style={{ fontWeight: '700', fontSize: '15px', color: isCorrect ? 'var(--secondary)' : 'var(--text-tertiary)' }}>
                                {String.fromCharCode(65 + i)}.
                              </span>
                              <span style={{ color: isCorrect ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isCorrect ? '600' : '400', fontSize: '15px' }}>
                                {opt}
                              </span>
                              {isCorrect && (
                                <svg style={{ marginLeft: 'auto', color: 'var(--secondary)' }} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'Tự luận' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <svg style={{ color: 'var(--secondary)' }} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Gợi ý & Từ khóa:</h4>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', paddingLeft: '26px', lineHeight: '1.6', fontSize: '15px' }}>{q.answer || 'Chưa cung cấp gợi ý.'}</p>
                      </div>
                    )}

                    {q.type === 'Điền khuyết' && q.blanks && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg style={{ color: 'var(--warning)' }} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Từ khóa cần điền:</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {q.blanks.map((blank, i) => (
                               <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--warning)', padding: '6px 14px', borderRadius: '6px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                 {blank}
                               </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)', width: '100%', boxSizing: 'border-box' }}>
            <svg style={{ margin: '0 auto 20px', color: 'var(--border)' }} width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '20px' }}>Không tìm thấy câu hỏi</h3>
            <p style={{ margin: 0, fontSize: '16px' }}>Hiện tại không có câu hỏi nào khớp với bộ lọc của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionManager;
