import React from 'react';
import { Link } from 'react-router-dom';

const HelpCenter = () => {
  const faqs = [
    { question: 'Làm thế nào để tạo đề thi?', answer: 'Truy cập "Tạo mới" trên thanh menu trái, sau đó nhập/dán đoạn văn bản (như trang sách, tài liệu lịch sử) và bấm Sinh câu hỏi.' },
    { question: 'Chức năng AQG hỗ trợ những loại câu hỏi nào?', answer: 'Hiện tại hệ thống AI của chúng tôi sinh được Câu Trắc Nghiệm, Câu Tự Luận và Câu Điền Khuyết.' },
    { question: 'Sinh viên sẽ làm bài thi như thế nào?', answer: 'Sau khi tạo đề làm xong, bạn chọn "Xuất bản". Sau đó chia sẻ "Mã Đề Thi" để sinh viên có thể gõ vào thanh tìm kiếm hoặc trang chủ để làm bài.' },
    { question: 'Làm sao để biết ai có điểm cao nhất?', answer: 'Truy cập vào Bảng điều khiển (Dashboard) của bạn, nhìn sang cột Bảng Xếp Hạng để xem Top 5.' }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', color: 'var(--text-primary)', marginBottom: '16px' }}>Trung Tâm Trợ Giúp</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Mọi thứ bạn cần biết về AQG đều nằm ở đây. Chọn chủ đề bạn quan tâm.</p>
      </div>

      <div className="card" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '22px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>Hướng dẫn sử dụng cơ bản</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {['Tạo Đề Nhanh', 'Chấm Điểm', 'Theo Dõi Học Viên', 'Quản Lý Không Gian'].map((item, idx) => (
            <div key={idx} style={{ background: 'var(--background)', padding: '20px', borderRadius: '16px', textAlign: 'center', fontWeight: '700', cursor: 'pointer', transition: 'var(--transition)' }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>💡</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>Câu Hỏi Thường Gặp (FAQ)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--text-primary)' }}>{i + 1}. {faq.question}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6' }}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--primary-soft)', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '22px', margin: '0 0 10px 0' }}>Bạn không tìm thấy thứ mình cần?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Đội ngũ AQG luôn sẵn sàng giúp đỡ.</p>
        <Link to="/support" className="btn btn-primary" style={{ padding: '14px 30px', borderRadius: '14px' }}>Liên hệ Bộ Phận Hỗ Trợ</Link>
      </div>
    </div>
  );
};

export default HelpCenter;
