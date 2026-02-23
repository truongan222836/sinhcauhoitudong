import React, { useState, useEffect } from 'react';

const Profile = () => {
  const [user, setUser] = useState({
    fullname: '',
    email: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/users/profile', {
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
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }

    try {
      const body = { fullname: user.fullname };
      if (password) {
        body.password = password;
      }

      const response = await fetch('http://localhost:3000/api/users/profile', {
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
    </div>
  );
};

export default Profile;