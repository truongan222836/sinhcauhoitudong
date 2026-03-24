import React, { useState, useEffect } from 'react';
import StartExamModal from '../components/StartExamModal';
import { useParams, Link } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';

const TopicDetails = () => {
  const { id } = useParams(); // actually this is topic name like "Toán Cao Cấp"
  const topicName = decodeURIComponent(id);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchQuizzesByTopic();
  }, [topicName]);

  const fetchQuizzesByTopic = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/topic/${encodeURIComponent(topicName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setQuizzes(data.data || []);
      } else {
        setError(data.message || 'Lỗi lấy đề thi');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user'));
  const isStudent = user?.roleId === 3;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', borderRadius: '24px', fontSize: '36px', boxShadow: '0px 10px 20px rgba(49, 92, 255, 0.2)' }}>
          📚
        </div>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 10px 0' }}>Chủ đề: {topicName}</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '16px' }}>Khám phá các đề thi nổi bật và kiểm tra kiến thức của mình.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-tertiary)' }}>Đang tìm kiếm bộ đề...</div>
      ) : error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {quizzes.length > 0 ? (
            quizzes.map((quiz, idx) => (
              <div key={quiz.DeThiId} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(224, 229, 242, 0.5)' }}>
                <div style={{ 
                  height: '140px', 
                  background: idx % 2 === 0 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #315CFF, #1E48E0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <span style={{ fontSize: '40px', opacity: 0.8 }}>{idx % 2 === 0 ? '📝' : '⚡'}</span>
                </div>
                
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '10px', height: '50px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {quiz.TieuDe}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
                      Mã: <strong>{quiz.MaDeThi}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
                      ⏱ {quiz.ThoiGianLamBai || 60}p
                    </div>
                  </div>
                  
                  {isStudent ? (
                    <button 
                      onClick={() => { setSelectedQuiz(quiz); setShowStartModal(true); }}
                      className="btn btn-primary" 
                      style={{ width: '100%', borderRadius: '14px', padding: '12px', border: 'none', cursor: 'pointer' }}
                    >
                      Làm bài
                    </button>
                  ) : (
                    <Link to="/manage" className="btn btn-primary" style={{ width: '100%', borderRadius: '14px', padding: '12px' }}>
                      Xem đề
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', borderRadius: '24px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>🕵️</span>
              <h3 style={{ margin: '0 0 10px 0' }}>Không tìm thấy đề thi nào</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Có thể chủ đề này chưa có ai đóng góp. Đừng ngại tạo một đề thi mới nha!</p>
            </div>
          )}
        </div>
      )}

      {showStartModal && (
        <StartExamModal 
          quiz={selectedQuiz} 
          onClose={() => setShowStartModal(false)} 
        />
      )}
    </div>
  );
};

export default TopicDetails;
