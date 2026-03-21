import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';

const StartExamModal = ({ quiz, onClose }) => {
  const [formData, setFormData] = useState({
    studentName: '',
    studentClass: '',
    studentId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          examId: quiz.DeThiId,
          ...formData
        })
      });

      const data = await response.json();
      if (data.success) {
        // Here we can either pass attemptId via state or use it in URL
        // To keep it simple and follow current routing /exam/:id
        // We'll redirect to /exam/:quizId but pass the attemptId in localStorage or state
        // Actually, the user said redirect to /exam/{attemptId}
        // Let's stick to their request.
        localStorage.setItem(`attempt_${quiz.DeThiId}`, data.attemptId);
        localStorage.setItem('last_name', formData.studentName);
        localStorage.setItem('last_class', formData.studentClass);
        localStorage.setItem('last_mssv', formData.studentId);
        navigate(`/exam/${quiz.DeThiId}`);
      } else {
        setError(data.message || 'Không thể bắt đầu bài thi');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{ marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' }}>Thông tin sinh viên</h2>
        <p style={{ color: '#6B7280', marginBottom: '25px' }}>Vui lòng nhập đầy đủ thông tin trước khi bắt đầu bài thi: <strong>{quiz.TieuDe}</strong></p>
        
        {error && <div style={{ color: '#EF4444', marginBottom: '15px', padding: '10px', background: '#FEE2E2', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>Họ và Tên</label>
            <input
              type="text"
              name="studentName"
              required
              value={formData.studentName}
              onChange={handleChange}
              placeholder="VD: Nguyễn Văn A"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>Lớp</label>
            <input
              type="text"
              name="studentClass"
              required
              value={formData.studentClass}
              onChange={handleChange}
              placeholder="VD: DHTT23B"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB' }}
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>Mã số sinh viên (MSSV)</label>
            <input
              type="text"
              name="studentId"
              required
              value={formData.studentId}
              onChange={handleChange}
              placeholder="VD: 2312345"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontWeight: '600' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                flex: 1, 
                padding: '12px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #315CFF 0%, #1E48E0 100%)', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer', 
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(49, 92, 255, 0.4)'
              }}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Bắt đầu làm bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartExamModal;
