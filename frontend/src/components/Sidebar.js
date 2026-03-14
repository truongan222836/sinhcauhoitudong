import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user, logout, isAdmin, isLecturer } = useAuth();
  const location = useLocation();
  // const navigate = useNavigate(); // Removed unused variable

  const handleLogout = () => {
    logout();
  };

  let menuItems = [];

  if (isAdmin) {
    menuItems = [
      { name: 'Bảng điều khiển', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { name: 'Quản lý Người dùng', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { name: 'Ngân hàng Câu hỏi', path: '/question-manager', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { name: 'Quản lý Đề thi', path: '/manage', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { name: 'Thống kê Hệ thống', path: '/admin/statistics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }
    ];
  } else if (isLecturer) {
    menuItems = [
      { name: 'Bảng điều khiển', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { name: 'Đề thi của tôi', path: '/manage', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { name: 'Ngân hàng Câu hỏi', path: '/question-manager', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { name: 'Thống kê & Analytics', path: '/teacher/analytics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { name: 'Hồ sơ', path: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
    ];
  } else {
    // Sinh viên mặc định
    menuItems = [
      { name: 'Bảng điều khiển', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { name: 'Tìm Đề Thi', path: '/quiz-search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
      { name: 'Bảng Xếp Hạng', path: '/leaderboard', icon: 'M13 7h8m0 0V5m0 2l-2 2M7 7H5m2 0V5m0 2L5 9m5 8h10m0 0v2m0-2l-2-2M14 17h-2m2 0v2m0-2l-2-2' },
      { name: 'Lịch sử', path: '/history', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { name: 'Hồ sơ', path: '/profile', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
      { name: 'Hỗ trợ', path: '/support', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
    ];
  }

  return (
    <aside style={{
      width: '280px',
      background: 'white',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid var(--border)',
      padding: '30px 20px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '10px' }}>
        <div style={{ background: 'var(--primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>
        <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>AQG</span>
      </Link>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.name} style={{ marginBottom: '8px' }}>
              <Link
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-soft)' : 'transparent',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '16px',
                  transition: 'var(--transition)'
                }}
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}></path>
                </svg>
                {item.name}
              </Link>
            </li>
          );
        })}
        
        {/* Create New Button */}
        {(isAdmin || isLecturer) && (
          <li style={{ marginTop: '20px' }}>
            <Link 
              to="/generate" 
              className="btn btn-primary" 
              style={{ width: '100%', borderRadius: '16px', padding: '16px', fontSize: '16px', boxShadow: '0px 10px 20px rgba(49, 92, 255, 0.2)' }}
            >
              <svg style={{ marginRight: '8px' }} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              Tạo mới đề bằng AI
            </Link>
          </li>
        )}
      </ul>

      {/* User Info Bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '12px', overflow: 'hidden', background: '#E0E5F2' }}>
            <img 
              src={`https://ui-avatars.com/api/?name=${user.fullname || 'User'}&background=315CFF&color=fff&bold=true`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullname || 'Guest'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isAdmin ? 'Quản trị viên' : isLecturer ? 'Giảng viên' : 'Sinh viên'}</div>
          </div>
          <button onClick={handleLogout} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;