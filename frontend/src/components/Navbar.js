import React from 'react';
import { Link } from 'react-router-dom';


const Navbar = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Giả sử đây là Navbar sau khi đã đăng nhập
  const navbarStyle = {
    display: 'flex',
    gap: '15px',
    padding: '10px',
    background: '#333',
    color: 'white',
    alignItems: 'center',
  };

  const linkStyle = {
    color: 'GrayText',
    textDecoration: 'none',
  };

  return (
    <nav style={navbarStyle}>
      <Link to="/dashboard" style={linkStyle}>Logo</Link>
      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      {/* Hiển thị cho Giảng viên & Admin */}
      {user.roleId !== 3 && (
        <>
          <Link to="/generate" style={linkStyle}>Sinh câu hỏi</Link>
          <Link to="/manage" style={linkStyle}>Quản lý</Link>
        </>
      )}
      <div style={{ marginLeft: 'auto' }}>
        <Link to="/profile" style={linkStyle}>Hồ sơ</Link>
        {/* Hiển thị cho Sinh viên */}
        {user.roleId === 3 && (
          <><Link to="/quiz-search" style={{ ...linkStyle, marginLeft: '15px' }}>Tìm kiếm Đề thi</Link>
          <Link to="/history" style={{ ...linkStyle, marginLeft: '15px' }}>Lịch sử</Link></>
        )}
        <Link to="/login" style={{ marginLeft: '15px', color: 'white',
    textDecoration: 'none' }}>Đăng xuất</Link>
      </div>
    </nav>
  );
};

export default Navbar;