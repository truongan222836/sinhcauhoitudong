import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Kiểm tra xem user có trong localStorage không khi ứng dụng khởi chạy
        const token = localStorage.getItem('token');
        const userString = localStorage.getItem('user');

        if (token && userString) {
            setUser(JSON.parse(userString));
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        setUser(userData);
        
        // Điều hướng dựa trên role
        if (userData.roleId === 1) { // Admin
            navigate('/dashboard');
        } else if (userData.roleId === 2) { // Giảng viên
            navigate('/dashboard');
        } else { // Sinh viên
            navigate('/dashboard');
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    const value = {
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.roleId === 1,
        isLecturer: user?.roleId === 2,
        isStudent: user?.roleId === 3,
    };

    if (loading) {
        return <div>Loading...</div>; // Có thể làm màn hình loading đẹp hơn
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
