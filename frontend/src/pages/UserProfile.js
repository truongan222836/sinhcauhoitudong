import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const UserProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}/public-profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data.data);
      } else {
        setError(data.message || 'Lỗi khi lấy thông tin người dùng.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-tertiary)' }}>Đang tải hồ sơ...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--danger)' }}>{error}</div>;
  if (!profile) return null;

  const { user, stats, quizzes } = profile;
  const isLecturer = user.roleId === 1 || user.roleId === 2;

  // Render role badge
  let roleBadge = 'Sinh viên';
  if (user.roleId === 1) roleBadge = 'Admin';
  if (user.roleId === 2) roleBadge = 'Giảng viên';

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px', animation: 'fadeIn 0.5s ease' }}>
      <div className="card" style={{ padding: '40px', borderRadius: '24px', marginBottom: '30px', display: 'flex', gap: '30px', alignItems: 'center' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <img 
            src={`https://ui-avatars.com/api/?name=${user.fullname}&background=315CFF&color=fff&size=200`} 
            alt="Avatar" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>{user.fullname}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user.email}</span>
            <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '5px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
              {roleBadge}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '30px', marginTop: '25px' }}>
            {isLecturer ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalQuizzesCreated}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Đề thi đã tạo</div>
              </div>
            ) : null}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.examsCount}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Lượt thi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--warning)' }}>{stats.totalPoints}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Điểm Ranking</div>
            </div>
          </div>
        </div>
      </div>

      {isLecturer && quizzes.length > 0 && (
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Đề thi đang chia sẻ của {user.fullname}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {quizzes.map((quiz, idx) => (
              <div key={quiz.DeThiId} className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quiz.TieuDe}</h3>
                  <div style={{ padding: '6px 10px', background: '#F4F7FE', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    {quiz.ThoiGianLamBai}p
                  </div>
                </div>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Đã tạo vào: {new Date(quiz.NgayTao).toLocaleDateString('vi-VN')}
                </p>
                <Link to={`/exam/${quiz.DeThiId}`} className="btn btn-primary" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: '12px' }}>
                  Làm Bài
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
