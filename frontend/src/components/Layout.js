import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  return (
    <>
      <Navbar />
      <main style={{ padding: '20px', minHeight: '80vh' }}>
        <Outlet /> {/* Đây là nơi nội dung của các trang con sẽ được hiển thị */}
      </main>
      <Footer />
    </>
  );
};

export default Layout;