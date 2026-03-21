import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';

const History = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Không thể tải lịch sử.');
        }
        setHistory(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải lịch sử...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Lỗi: {error}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Lịch Sử Làm Bài</h1>

      {history.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', background: '#f2f2f2' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tên Đề Thi</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Điểm</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tổng Câu</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Ngày Làm</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px' }}>{item.quizTitle}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.score}</td>
                <td style={{ padding: '12px' }}>{item.totalQuestions}</td>
                <td style={{ padding: '12px' }}>{new Date(item.completedAt || item.NgayNop).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center' }}>Bạn chưa làm bài thi nào.</p>
      )}
    </div>
  );
};

export default History;
