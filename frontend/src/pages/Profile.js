import React, { useState, useEffect } from 'react';

const Profile = () => {
  const [user, setUser] = useState({
    fullname: '',
    email: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Không thể tải thông tin cá nhân.');
        }
        setUser({
          fullname: data.HoTen,
          email: data.Email,
        });
        setMessage({ type: '', text: '' });
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/users/history', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setHistory(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchProfile();
    fetchHistory();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }

    try {
      const body = { fullname: user.fullname };
      if (password) {
        body.password = password;
      }

      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật thất bại.');
      }
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      // Cập nhật lại tên trên localStorage nếu có
      const localUser = JSON.parse(localStorage.getItem('user'));
      localUser.fullname = user.fullname;
      localStorage.setItem('user', JSON.stringify(localUser));

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (isLoading) return <div>Đang tải...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Hồ Sơ Người Dùng</h1>
      <form onSubmit={handleUpdate}>
        <div style={{ marginBottom: '15px' }}>
          <label>Họ và tên:</label>
          <input type="text" value={user.fullname} onChange={(e) => setUser({ ...user, fullname: e.target.value })} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input type="email" value={user.email} disabled style={{ width: '100%', padding: '8px', background: '#eee' }} />
        </div>
        <hr style={{ margin: '20px 0' }} />
        <h3 style={{ textAlign: 'center' }}>Đổi mật khẩu (để trống nếu không đổi)</h3>
        <div style={{ marginBottom: '15px' }}>
          <label>Mật khẩu mới:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Xác nhận mật khẩu mới:</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        {message && <p style={{ color: message.type === 'success' ? 'green' : 'red' }}>{message.text}</p>}
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px' }}>Cập nhật</button>
      </form>

      <hr style={{ margin: '30px 0' }} />
      <h3>Lịch Sử Làm Bài</h3>
      {historyLoading ? (
        <p>Đang tải lịch sử...</p>
      ) : history.length > 0 ? (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {history.map((item, index) => (
            <div key={index} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
              <p><strong>Đề thi:</strong> {item.quizTitle}</p>
              <p><strong>Điểm:</strong> {item.score}/{item.totalQuestions}</p>
              <p><strong>Ngày làm:</strong> {new Date(item.completedAt).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Bạn chưa làm bài thi nào.</p>
      )}
    </div>
  );
};

export default Profile;
