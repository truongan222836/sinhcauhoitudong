import React, { useState } from 'react';

const ForgotPasswordForm = ({ setActiveTab }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Lỗi gửi email.');
            }
            
            setMessage(data.message);
            
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        }
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '5px', background: '#ffc107', color: 'black', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 'normal' }}>Quên Mật Khẩu?</h3>
            {message && <p style={{ color: isError ? 'red' : 'green', textAlign: 'center', fontSize: '14px' }}>{message}</p>}
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>Đừng lo! Nhập email của bạn và chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.</p>
            <input
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
            />
            <button type="submit" style={buttonStyle}>Gửi</button>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                <span onClick={() => setActiveTab('login')} style={{ color: '#007BFF', cursor: 'pointer', fontSize: '14px' }}>
                    Quay lại Đăng nhập
                </span>
            </p>
        </form>
    );
};

export default ForgotPasswordForm;