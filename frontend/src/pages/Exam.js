import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';

const Exam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const attemptId = localStorage.getItem(`attempt_${id}`);
    if (!attemptId && !isSubmitted) {
      setError('Vui lòng nhập thông tin trước khi làm bài thi.');
      setIsLoading(false);
      // Wait a bit then redirect
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }
  }, [id, navigate, isSubmitted]);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    // Chỉ chạy timer nếu quiz đã load và timeLeft đã được khởi tạo (khác null)
    if (quiz && timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quiz && timeLeft === 0 && !isSubmitted && !isLoading) {
      // Chỉ nộp bài tự động nếu đã tải xong, timeLeft thực sự về 0 và đề có giới hạn thời gian
      if (quiz.ThoiGianLamBai > 0) {
        handleSubmit();
      }
    }
  }, [timeLeft, quiz, isSubmitted, isLoading]);

  const fetchQuiz = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const quizData = await resp.json();
      if (!resp.ok || !quizData.success) throw new Error(quizData.message || 'Lỗi tải đề');

      setQuiz(quizData.data);

      // Check if we already have an active attempt session to resume
      // (This fetches from backend because startExam was already called by Modal)
      // Actually, Modal already called startExam. Let's send another request or rely on localStorage?
      // Better yet: Modal saves student info. We can re-call startExam here to get resume data.
      
      const sessionInfo = {
          studentName: localStorage.getItem('last_name') || '',
          studentClass: localStorage.getItem('last_class') || '',
          studentId: localStorage.getItem('last_mssv') || ''
      };

      const resumeResp = await fetch(`${API_BASE_URL}/quizzes/start`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ examId: id, ...sessionInfo })
      });

      const resumeData = await resumeResp.json();
      if (resumeData.success) {
          localStorage.setItem(`attempt_${id}`, resumeData.attemptId);
          if (resumeData.resumed) {
              // Load saved answers
              const saved = {};
              resumeData.savedAnswers.forEach(a => {
                  let val = a.CauTraLoi;
                  if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                      try { val = JSON.parse(val); } catch(e) {}
                  }
                  saved[a.CauHoiId] = val;
              });
              setAnswers(saved);
              
              // Adjust timer
              const totalSecs = quizData.data.ThoiGianLamBai * 60;
              setTimeLeft(Math.max(0, totalSecs - resumeData.elapsedSeconds));
          } else {
              setTimeLeft(quizData.data.ThoiGianLamBai * 60);
          }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = async (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    
    // Save to server immediately or debounced
    try {
        const attemptId = localStorage.getItem(`attempt_${id}`);
        await fetch(`${API_BASE_URL}/quizzes/save-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ attemptId, questionId, selectedAnswer: answer })
        });
    } catch (e) {
        console.error("Lỗi tự động lưu:", e);
    }
  };

  const handleSubmit = async () => {
    try {
      const attemptId = localStorage.getItem(`attempt_${id}`);
      const response = await fetch(`${API_BASE_URL}/quizzes/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ answers, attemptId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể nộp bài.');
      }
      setScore(data.score);
      setIsSubmitted(true);
      
      // Clear attempt session
      localStorage.removeItem(`attempt_${id}`);
      
      // Trigger refresh Dashboard stats
      localStorage.setItem('dashboardRefresh', Date.now().toString());
      console.log('[Exam] Submitted successfully, triggering dashboard refresh');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải đề thi...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Lỗi: {error}</div>;
  if (!quiz) return <div style={{ textAlign: 'center' }}>Không tìm thấy đề thi.</div>;

  if (isSubmitted) {
    const passScore = (score / quiz.questions.length) >= 0.5;
    
    const handleBackToDashboard = () => {
      console.log('[Exam] Navigating to dashboard from exam result');
      // Trigger refresh one more time
      localStorage.setItem('dashboardRefresh', Date.now().toString());
      navigate('/dashboard');
    };

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '10px',
          background: passScore ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          marginBottom: '20px'
        }}>
          <h1 style={{ 
            color: passScore ? '#10b981' : '#ef4444',
            margin: '0 0 10px 0'
          }}>
            {passScore ? '✓ Bạn đạt bài thi!' : '✗ Bạn chưa đạt bài thi'}
          </h1>
        </div>
        
        <h2>Điểm của bạn: {score}/{quiz.questions.length}</h2>
        <h3 style={{ fontSize: '32px', color: '#007bff', margin: '20px 0' }}>
          {((score / quiz.questions.length) * 100).toFixed(1)}%
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>Tiêu chí đạt: ≥50%</p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '30px' }}>
          <button onClick={handleBackToDashboard} style={{
            background: '#007bff',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            Quay lại Bảng điều khiển
          </button>
          <button onClick={() => navigate('/history')} style={{
            background: '#6c757d',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Xem Lịch Sử
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>{quiz.TieuDe}</h1>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: timeLeft < 300 ? 'red' : 'black' }}>
          Thời gian còn lại: {formatTime(timeLeft)}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Mô tả:</strong> {quiz.MoTa}</p>
        <p><strong>Thời gian làm bài:</strong> {quiz.ThoiGianLamBai} phút</p>
        <p><strong>Số câu hỏi:</strong> {quiz.questions.length}</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {quiz.questions.map((q, index) => (
          <div key={q.id} style={{ marginBottom: '32px', padding: '32px', borderRadius: '16px', background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #edf2f7' }}>
            <h3 style={{ fontSize: '18px', color: '#1e293b', lineHeight: '1.6', marginBottom: '24px', fontWeight: '600' }}>
               <span style={{ color: '#315CFF', marginRight: '8px' }}>Câu {index + 1}:</span>
               {q.question}
            </h3>

            {q.type === 'Trắc nghiệm' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {q.options.map((option, i) => {
                  const isChecked = answers[q.id] === option;
                  return (
                    <label 
                      key={i} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '16px 20px', 
                        borderRadius: '12px', 
                        border: isChecked ? '2px solid #315CFF' : '2px solid #e2e8f0', 
                        background: isChecked ? '#f0f4ff' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={option}
                        checked={isChecked}
                        onChange={() => handleAnswerChange(q.id, option)}
                        required
                        style={{ display: 'none' }}
                      />
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        border: isChecked ? '6px solid #315CFF' : '2px solid #cbd5e1', 
                        marginRight: '16px',
                        background: 'white',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}></div>
                      <div style={{ fontSize: '15px', color: isChecked ? '#1e293b' : '#475569', lineHeight: '1.5' }}>
                         <strong style={{ marginRight: '8px', color: isChecked ? '#315CFF' : '#64748b' }}>
                           {String.fromCharCode(65 + i)}.
                         </strong>
                         {option.replace(/^[A-D]\. /, '')}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'Tự luận' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                style={{ width: '100%', height: '100px', padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }}
                required
              />
            )}

            {q.type === 'Điền khuyết' && q.blanks && (
              <div>
                {q.blanks.map((blank, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Điền từ ${i + 1}`}
                    value={answers[q.id]?.[i] || ''}
                    onChange={(e) => {
                      const currentAnswers = answers[q.id] || [];
                      currentAnswers[i] = e.target.value;
                      handleAnswerChange(q.id, currentAnswers);
                    }}
                    style={{ marginRight: '10px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                    required
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="submit" style={{
          background: '#28a745',
          color: 'white',
          padding: '15px 30px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '18px',
          width: '100%'
        }}>
          Nộp Bài
        </button>
      </form>
    </div>
  );
};

export default Exam;
