import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';

const TeacherAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchExams();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/analytics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStats(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/my-quizzes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setExams(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !stats) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: 'var(--text-tertiary)' }}>Đang tải phân tích...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '30px' }}>Phân Tích Đề Thi Của Tôi</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng đề thi</p>
          <h3 style={{ fontSize: '24px' }}>{stats.totalExams}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng lượt làm</p>
          <h3 style={{ fontSize: '24px' }}>{stats.totalAttempts}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Điểm trung bình</p>
          <h3 style={{ fontSize: '24px' }}>{stats.averageScore?.toFixed(2)}</h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đề phổ biến nhất</p>
          <h3 style={{ fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.mostPopularExam.TieuDe}</h3>
          <p style={{ fontSize: '12px' }}>({stats.mostPopularExam.attemptCount} lượt làm)</p>
        </div>
      </div>

      <div className="card" style={{ padding: '30px', marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>Xu hướng làm bài (7 ngày qua)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '200px', paddingBottom: '20px', borderBottom: '2px solid #E2E8F0' }}>
          {stats.attemptsByDate.map((day, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '100%', 
                background: 'var(--primary)', 
                height: `${(day.count / Math.max(...stats.attemptsByDate.map(d => d.count), 1)) * 100}%`,
                borderRadius: '4px 4px 0 0'
              }}></div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(day.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Thống kê theo từng đề thi</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#64748b', textAlign: 'left', fontSize: '14px' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Tên Đề Thi</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Mã Đề</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Lượt Làm</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Điểm TB</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Thời Gian</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {exams.length > 0 ? (
                exams.map((exam, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{exam.TieuDe}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontFamily: 'monospace' }}>{exam.MaDeThi}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>{exam.usageCount || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: 'var(--warning)', fontWeight: 'bold' }}>{exam.averageRating ? exam.averageRating.toFixed(2) : '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>{exam.ThoiGianLamBai} phút</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: exam.DaXuatBan ? '#d1fae5' : '#fef3c7', color: exam.DaXuatBan ? '#059669' : '#d97706' }}>
                        {exam.DaXuatBan ? 'Công khai' : 'Nháp'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu đề thi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;
