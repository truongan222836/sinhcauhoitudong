import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Manage = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editForm, setEditForm] = useState({ TieuDe: '', ThoiGianLamBai: '', MoTa: '' });
  const [extendModalData, setExtendModalData] = useState(null);
  const [extendForm, setExtendForm] = useState({ studentCode: '', newDeadline: '' });
  const [extendAll, setExtendAll] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/quizzes/my-quizzes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể tải danh sách đề thi.');
      }
      setQuizzes(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (quizId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xuất bản đề thi này? Sau khi xuất bản sinh viên có thể làm bài.")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      setQuizzes(quizzes.map(q => q.DeThiId === quizId ? { ...q, DaXuatBan: true } : q));
      alert("Xuất bản thành công!");
    } catch (err) {
      alert("Lỗi khi xuất bản: " + err.message);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Bạn có chắc muốn xóa đề thi này? Hành động này không thể hoàn tác.')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Không thể xóa đề thi.');
      }
      setQuizzes(quizzes.filter(q => q.DeThiId !== quizId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz.DeThiId);
    setEditForm({
      TieuDe: quiz.TieuDe,
      ThoiGianLamBai: quiz.ThoiGianLamBai || 60,
      MoTa: quiz.MoTa || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/${editingQuiz}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Không thể cập nhật đề thi.');
      }
      setQuizzes(quizzes.map(q =>
        q.DeThiId === editingQuiz ? { ...q, ...editForm } : q
      ));
      setEditingQuiz(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExtendSubmit = async () => {
    const code = extendAll ? 'ALL' : extendForm.studentCode;
    if (!code || !extendForm.newDeadline) {
      alert("Vui lòng nhập đầy đủ thông tin hoặc chọn Áp dụng tất cả.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/exam/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          examId: extendModalData,
          studentCode: code,
          newDeadline: extendForm.newDeadline
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      alert(data.message);
      setExtendModalData(null);
      setExtendForm({ studentCode: '', newDeadline: '' });
      setExtendAll(false);
    } catch (err) {
      alert("Lỗi nới hạn: " + err.message);
    }
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Đang tải danh sách đề thi...</div>;
  if (error) return <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '50px' }}>Lỗi: {error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Quản Lý Đề Thi</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Quản lý, chỉnh sửa, xuất bản hoặc chia sẻ đề thi của bạn.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '24px' }}>
        {quizzes.length > 0 ? (
          quizzes.map(quiz => (
            <div key={quiz.DeThiId} className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '24px' }}>
                {editingQuiz === quiz.DeThiId ? (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>Tiêu Đề</label>
                        <input
                          type="text"
                          value={editForm.TieuDe}
                          onChange={(e) => setEditForm({...editForm, TieuDe: e.target.value})}
                          placeholder="Nhập tiêu đề bộ đề..."
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>Thời Gian Cầu (Phút)</label>
                        <input
                          type="number"
                          value={editForm.ThoiGianLamBai}
                          onChange={(e) => setEditForm({...editForm, ThoiGianLamBai: parseInt(e.target.value, 10) || 0})}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>Mô tả ngắn</label>
                        <textarea
                          value={editForm.MoTa}
                          onChange={(e) => setEditForm({...editForm, MoTa: e.target.value})}
                          placeholder="Mô tả về đề thi của bạn..."
                          style={{ minHeight: '60px' }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn btn-success" onClick={handleSaveEdit}>Lưu cập nhật</button>
                      <button className="btn btn-secondary" onClick={() => setEditingQuiz(null)}>Hủy bỏ</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                         <h2 style={{ fontSize: '20px', margin: 0 }}>{quiz.TieuDe}</h2>
                         <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            background: quiz.DaXuatBan ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: quiz.DaXuatBan ? 'var(--secondary)' : 'var(--warning)'
                         }}>
                            {quiz.DaXuatBan ? 'Đã xuất bản' : 'Bản nháp'}
                         </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                          Mã truy cập: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)' }}>{quiz.MaDeThi}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Thời gian: {quiz.ThoiGianLamBai || 60} phút
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          Ngày tạo: {new Date(quiz.NgayTao).toLocaleDateString('vi-VN')}
                        </span>
                        {quiz.HanNop && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Hạn nộp: {new Date(quiz.HanNop).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                          Mô tả: {quiz.MoTa || 'Trống'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
                      {!quiz.DaXuatBan && (
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handlePublish(quiz.DeThiId)}>
                           Xuất Bản Ngay
                        </button>
                      )}
                      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleEdit(quiz)}>Chỉnh sửa</button>
                      {quiz.DaXuatBan && (
                          <button className="btn btn-warning" style={{ width: '100%', background: '#F59E0B', borderColor: '#F59E0B', color: 'white' }} onClick={() => setExtendModalData(quiz.DeThiId)}>Nới Hạn SV</button>
                      )}
                      <button className="btn btn-info" style={{ 
                        width: '100%', 
                        background: '#10B981', 
                        borderColor: '#10B981',
                        color: 'white'
                      }} onClick={() => navigate(`/quiz/${quiz.DeThiId}/analytics`)}>
                        Xem Phân Tích
                      </button>
                      <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => handleDelete(quiz.DeThiId)}>Xóa Đề Thi</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
             <svg style={{ margin: '0 auto 16px' }} width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
             <p>Danh sách đề thi của bạn đang trống. Hãy vào phần "Sinh Câu Hỏi" để tạo đề thi mới nhé.</p>
          </div>
        )}
      </div>

      {/* Modal Nới Hạn */}
      {extendModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ marginTop: 0 }}>Nới hạn nộp bài</h3>
            
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input type="checkbox" id="extendAll" checked={extendAll} onChange={(e) => setExtendAll(e.target.checked)} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
               <label htmlFor="extendAll" style={{ fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>Áp dụng cho tất cả sinh viên (Đổi hạn chót gốc)</label>
            </div>

            {!extendAll && (
              <div style={{ marginBottom: '16px' }}>
                 <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Mã số sinh viên cần nới</label>
                 <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} 
                    value={extendForm.studentCode} onChange={(e) => setExtendForm({...extendForm, studentCode: e.target.value})} 
                    placeholder="Nhập MSSV..." />
              </div>
            )}
            
            <div style={{ marginBottom: '24px' }}>
               <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Thời gian hạn chót mới</label>
               <input type="datetime-local" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} 
                  value={extendForm.newDeadline} onChange={(e) => setExtendForm({...extendForm, newDeadline: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
               <button className="btn btn-secondary" onClick={() => { setExtendModalData(null); setExtendAll(false); }}>Hủy bỏ</button>
               <button className="btn btn-primary" onClick={handleExtendSubmit}>Áp dụng nới hạn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manage;
