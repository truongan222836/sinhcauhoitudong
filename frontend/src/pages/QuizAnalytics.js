import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';

const QuizAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      const [statsRes, rankingRes, questionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quizzes/${id}/stats`, { headers }),
        fetch(`${API_BASE_URL}/quizzes/${id}/ranking`, { headers }),
        fetch(`${API_BASE_URL}/quizzes/${id}/question-stats`, { headers })
      ]);

      const statsData = await statsRes.json();
      const rankingData = await rankingRes.json();
      const questionsData = await questionsRes.json();

      if (statsData.success) setStats(statsData.data);
      if (rankingData.success) setRanking(rankingData.data);
      if (questionsData.success) setQuestions(questionsData.data);
      
    } catch (err) {
      setError('Lỗi khi tải dữ liệu phân tích');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải phân tích...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <button 
        onClick={() => navigate('/manage')} 
        style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        ← Quay lại quản lý
      </button>

      <h1 style={{ marginBottom: '30px' }}>Phân Tích Chi Tiết Đề Thi</h1>

      {/* Tóm tắt */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Tổng lượt làm</p>
          <h3 style={{ fontSize: '24px' }}>{stats?.totalAttempts || 0}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Điểm trung bình</p>
          <h3 style={{ fontSize: '24px' }}>{stats?.averageScore?.toFixed(2) || 0}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Điểm cao nhất</p>
          <h3 style={{ fontSize: '24px', color: '#10b981' }}>{stats?.highestScore || 0}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Điểm thấp nhất</p>
          <h3 style={{ fontSize: '24px', color: '#ef4444' }}>{stats?.lowestScore || 0}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        {/* Bảng xếp hạng */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Bảng Xếp Hạng (Top 20)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F3F4F6', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Hạng</th>
                  <th style={{ padding: '12px' }}>Họ Tên</th>
                  <th style={{ padding: '12px' }}>Lớp</th>
                  <th style={{ padding: '12px' }}>Điểm</th>
                  <th style={{ padding: '12px' }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong>{row.studentName}</strong>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>MSSV: {row.studentId}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{row.studentClass}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563EB' }}>{row.score}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#6B7280' }}>
                      {new Date(row.completedAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Chưa có lượt làm bài nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Câu hỏi khó */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Câu Hỏi Thường Sai</h3>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '20px' }}>
            Tổng hợp các câu hỏi sinh viên thường trả lời sai hoặc không đạt điểm tối đa.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ 
                padding: '15px', 
                borderRadius: '12px', 
                background: '#FFF1F2', 
                borderLeft: '4px solid #F43F5E' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>{q.text}</p>
                  <span style={{ 
                    background: '#F43F5E', 
                    color: 'white', 
                    padding: '2px 8px', 
                    borderRadius: '20px', 
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    height: '20px'
                  }}>
                    {q.wrongCount} lượt sai
                  </span>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>Chưa có dữ liệu thống kê câu hỏi.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAnalytics;
