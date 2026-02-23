import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

const HomePage = () => {
    const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', 'forgot'

    const renderForm = () => {
        switch (activeTab) {
            case 'register':
                return <RegisterForm setActiveTab={setActiveTab} />;
            case 'forgot':
                return <ForgotPasswordForm setActiveTab={setActiveTab} />;
            case 'login':
            default:
                return <LoginForm setActiveTab={setActiveTab} />;
        }
    };

    const tabStyle = (tabName) => ({
        padding: '10px 20px',
        cursor: 'pointer',
        borderBottom: activeTab === tabName ? '3px solid #007BFF' : '3px solid transparent',
        color: activeTab === tabName ? '#007BFF' : '#6c757d',
        fontWeight: '600',
        fontSize: '18px',
        transition: 'all 0.2s ease-in-out',
    });

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
            <div style={{
                width: '420px',
                padding: '40px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
            }}>
                <h1 style={{color: '#333', marginBottom: '10px'}}>Hệ Thống AQG</h1>
                <p style={{color: '#666', marginBottom: '30px'}}>Sinh câu hỏi tự động thông minh</p>

                <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid #dee2e6', marginBottom: '30px' }}>
                    <div style={tabStyle('login')} onClick={() => setActiveTab('login')}>
                        Đăng Nhập
                    </div>
                    <div style={tabStyle('register')} onClick={() => setActiveTab('register')}>
                        Đăng Ký
                    </div>
                </div>
                {renderForm()}
            </div>
        </div>
    );
};

export default HomePage;