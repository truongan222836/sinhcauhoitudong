import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
// import Footer from './Footer';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ padding: '0 30px 40px 30px', flex: 1, animation: 'fadeIn 0.5s ease' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;