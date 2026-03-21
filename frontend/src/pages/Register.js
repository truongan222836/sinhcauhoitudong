import React, { useState } from 'react';
import API_BASE_URL from '../apiConfig';

const Register = () => {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' // Default role
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages

    if (formData.password !== formData.confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: formData.fullname,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đã có lỗi xảy ra.');
      }

      setMessage('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '20px auto',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h1>Trang Đăng Ký</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Họ tên:</label>
          <input 
            type="text" 
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Mật khẩu:</label>
          <input 
            type="password" 
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Xác nhận mật khẩu:</label>
          <input 
            type="password" 
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Vai trò:</label>
            <select 
              name="role" 
              value={formData.role} 
              onChange={handleChange}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="lecturer">Giảng viên</option>
              <option value="student">Sinh viên</option>
            </select>
        </div>
        {message && <p style={{ color: message.includes('thành công') ? 'green' : 'red' }}>{message}</p>}
        <button type="submit" style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '10px 15px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}>Đăng ký</button>
      </form>
      <p>
        Đã có tài khoản? <Link to="/login"  style={{
          color: '#007BFF',
          textDecoration: 'none'
        }}>Đăng nhập</Link>
      </p>
    </div>
  );
};

export default Register;
