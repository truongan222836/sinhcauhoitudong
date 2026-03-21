import React, { useState } from 'react';

const Support = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, message })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: data.message });
        setTitle('');
        setMessage('');
      } else {
        setStatus({ type: 'error', message: data.message || 'Lỗi gửi yêu cầu' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', animation: 'fadeIn 0.5s ease' }}>
      <div className="card" style={{ padding: '40px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ background: 'var(--primary-soft)', padding: '15px', borderRadius: '16px', color: 'var(--primary)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Hỗ Trợ Hệ Thống</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Mô tả sự cố hoặc để lại câu hỏi của bạn. Đội ngũ AQG sẽ ghi nhận và phản hồi sớm nhất.</p>
          </div>
        </div>

        {status && (
          <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '12px', background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: status.type === 'success' ? 'var(--secondary)' : 'var(--danger)', fontWeight: '600' }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tiêu đề vấn đề</label>
            <input 
              type="text" 
              placeholder="VD: Không xuất bản được đề thi, Lỗi hình ảnh..."
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Mô tả chi tiết</label>
            <textarea 
              placeholder="Ghi rõ vấn đề bạn đang gặp phải, đính kèm link hoặc mã đề thi nếu có..."
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '150px', fontSize: '15px', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '14px 30px', borderRadius: '14px' }}>
            {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Support;
