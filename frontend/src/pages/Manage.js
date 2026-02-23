import React, { useState, useEffect } from 'react';

const Manage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/quizzes/my-quizzes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Không thể tải danh sách đề thi.');
        }
        setQuizzes(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (isLoading) {
    return <div>Đang tải danh sách đề thi...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Lỗi: {error}</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Quản Lý Đề Thi</h1>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', background: '#f2f2f2' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Tiêu Đề</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Mã Đề</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Ngày Tạo</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Trạng Thái</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {quizzes.length > 0 ? (
            quizzes.map(quiz => (
              <tr key={quiz.DeThiId} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px' }}>{quiz.TieuDe}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>{quiz.MaDeThi}</td>
                <td style={{ padding: '12px' }}>{new Date(quiz.NgayTao).toLocaleDateString('vi-VN')}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ color: quiz.DaXuatBan ? 'green' : 'orange', fontWeight: 'bold' }}>
                    {quiz.DaXuatBan ? 'Đã Xuất Bản' : 'Bản Nháp'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button style={{ marginRight: '5px' }}>Sửa</button>
                  <button style={{ backgroundColor: 'red', color: 'white' }}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Bạn chưa tạo đề thi nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Manage;