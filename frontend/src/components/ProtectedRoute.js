import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        // Nếu không có token hoặc thông tin user, chuyển hướng về trang đăng nhập
        return <Navigate to="/login" replace />;
    }

    // Nếu route yêu cầu vai trò cụ thể và vai trò của user không nằm trong danh sách cho phép
    if (allowedRoles && !allowedRoles.includes(user.roleId)) {
        // Chuyển hướng về trang dashboard (hoặc trang "Không có quyền")
        return <Navigate to="/dashboard" replace />;
    }

    // Nếu hợp lệ, cho phép truy cập
    return <Outlet />;
};

export default ProtectedRoute;