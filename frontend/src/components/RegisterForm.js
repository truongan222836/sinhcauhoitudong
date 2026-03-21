import React, { useState } from 'react';
import API_BASE_URL from '../apiConfig';

const RegisterForm = ({ setActiveTab }) => {
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    });
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (formData.password !== formData.confirmPassword) {
            setMessage('Mật khẩu xác nhận không khớp!');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            setMessage('Đăng ký thành công! Vui lòng chuyển qua tab Đăng nhập.');
            setTimeout(() => {
                setActiveTab('login');
            }, 2000);
        } catch (error) {
            setMessage(error.message);
        }
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '5px', background: '#28a745', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <form onSubmit={handleSubmit}>
            {message && <p style={{ color: message.includes('thành công') ? 'green' : 'red', textAlign: 'center' }}>{message}</p>}
            <input type="text" name="fullname" placeholder="Họ và tên" value={formData.fullname} onChange={handleChange} required style={inputStyle} />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required style={inputStyle} />
            <input type="password" name="password" placeholder="Mật khẩu" value={formData.password} onChange={handleChange} required style={inputStyle} />
            <input type="password" name="confirmPassword" placeholder="Xác nhận mật khẩu" value={formData.confirmPassword} onChange={handleChange} required style={inputStyle} />
            <select name="role" value={formData.role} onChange={handleChange} style={inputStyle}>
                <option value="student">Tôi là Sinh viên</option>
                <option value="lecturer">Tôi là Giảng viên</option>
            </select>
            <button type="submit" style={buttonStyle}>Đăng Ký</button>
        </form>
    );
};

export default RegisterForm;
