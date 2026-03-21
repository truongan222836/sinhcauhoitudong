import React, { useState, useEffect } from 'react';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/leaderboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLeaderboard(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Đang tải bảng xếp hạng...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>Bảng Xếp Hạng AQG 🏆</h1>
      
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--primary)', color: 'white' }}>
            <tr>
              <th style={{ padding: '20px', textAlign: 'center', width: '80px' }}>Hạng</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>Thành viên</th>
              <th style={{ padding: '20px', textAlign: 'center' }}>Số bài thi</th>
              <th style={{ padding: '20px', textAlign: 'right' }}>Tổng điểm</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx < 3 ? 'rgba(49, 92, 255, 0.02)' : 'transparent' }}>
                <td style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'transparent',
                    color: idx < 3 ? 'white' : 'var(--text-primary)',
                    fontWeight: 'bold'
                  }}>
                    {idx + 1}
                  </div>
                </td>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden' }}>
                      <img src={`https://ui-avatars.com/api/?name=${user.fullname}&background=315CFF&color=fff`} alt="avatar" />
                    </div>
                    <span style={{ fontWeight: '600' }}>{user.fullname}</span>
                  </div>
                </td>
                <td style={{ padding: '20px', textAlign: 'center' }}>{user.examsCount}</td>
                <td style={{ padding: '20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', fontSize: '18px' }}>
                  {user.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardPage;
