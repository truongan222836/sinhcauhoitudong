import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../apiConfig';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch user stats
      const statsResponse = await fetch(`${API_BASE_URL}/users/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const statsData = await statsResponse.json();
      if (statsResponse.ok) {
        setStats(statsData);
      }

      // Fetch recent quizzes
      let quizzesUrl = '';
      if (user.roleId === 3) { // Student
        quizzesUrl = `${API_BASE_URL}/quizzes/available`;
      } else { // Lecturer/Admin
        quizzesUrl = `${API_BASE_URL}/quizzes/my-quizzes?limit=8`;
      }

      const quizzesResponse = await fetch(quizzesUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const quizzesData = await quizzesResponse.json();
      if (quizzesResponse.ok) {
        setRecentQuizzes(quizzesData.data || []);
      }

      // Fetch leaderboard
      const lbResponse = await fetch(`${API_BASE_URL}/users/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (lbResponse.ok) {
        const lbData = await lbResponse.json();
        setLeaderboard(lbData.data || []);
      }

      // Fetch recent activity
      const activityRes = await fetch(`${API_BASE_URL}/users/recent-activity`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const activityData = await activityRes.json();
      setRecentActivity(activityData.data || []);

      // Fetch trending topics
      const trendingRes = await fetch(`${API_BASE_URL}/topics/trending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const trendingData = await trendingRes.json();
      setTrendingTopics(trendingData.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for storage events (from Exam.js)
    const handleStorageChange = (e) => {
      if (e.key === 'dashboardRefresh') {
         fetchDashboardData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user.roleId]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: 'var(--text-tertiary)' }}>Đang tải không gian làm việc của bạn...</div>;
  }

  const isStudent = user.roleId === 3;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', animation: 'fadeIn 0.6s ease-out' }}>
      {/* Main Content (Left) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
        
        {/* Hero Banner (Only for Teachers/Admins) */}
        {!isStudent && (
          <div style={{ 
            background: 'linear-gradient(135deg, #315CFF 0%, #1E48E0 100%)',
            borderRadius: '30px',
            padding: '45px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0px 25px 50px -12px rgba(49, 92, 255, 0.35)'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '18px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '10px', borderRadius: '14px', backdropFilter: 'blur(5px)' }}>
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                </div>
                <h1 style={{ color: 'white', margin: 0, fontSize: '32px', fontWeight: '800' }}>Tạo Đề Thi Bằng AI</h1>
              </div>
              <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '30px', maxWidth: '450px', lineHeight: '1.6' }}>
                Biến tài liệu của bạn thành các câu hỏi tương tác trong vài giây. Hiện đại, nhanh chóng và hỗ trợ bởi AI (AQG).
              </p>
              <Link to="/generate" className="btn" style={{ 
                background: 'white', 
                color: 'var(--primary)', 
                padding: '14px 35px', 
                borderRadius: '16px',
                fontSize: '16px',
                boxShadow: '0px 10px 20px rgba(0,0,0,0.1)'
              }}>
                Tạo ngay
              </Link>
            </div>
            {/* Decorative elements */}
            <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '200px', height: '200px', borderRadius: '100px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
            <div style={{ position: 'absolute', right: '120px', bottom: '-80px', width: '250px', height: '250px', borderRadius: '125px', background: 'rgba(255, 255, 255, 0.05)' }}></div>
            <div style={{ position: 'absolute', right: '60px', top: '40px', color: 'rgba(255, 255, 255, 0.15)', transform: 'rotate(15deg)' }}>
              <svg width="180" height="180" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </div>
          </div>
        )}

        {/* Featured Quizzes section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Đề thi nổi bật</h2>
            <Link to={isStudent ? "/quiz-search" : "/manage"} style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Xem tất cả
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
            {recentQuizzes.length > 0 ? (
              recentQuizzes.map((quiz, idx) => (
                <div key={quiz.DeThiId} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(224, 229, 242, 0.5)' }}>
                  {/* Card Header (Image Area) */}
                  <div style={{ 
                    height: '180px', 
                    background: idx % 4 === 0 ? '#315CFF' : idx % 4 === 1 ? '#01B574' : idx % 4 === 2 ? '#EE5D50' : '#FFB547',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    position: 'relative'
                  }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '20px', borderRadius: '24px', backdropFilter: 'blur(10px)' }}>
                       <svg width="48" height="48" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    </div>
                    {/* Badge */}
                    <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', color: 'white', fontSize: '11px', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>
                      Nổi bật
                    </div>
                  </div>
                  
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', height: '50px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{quiz.TieuDe}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-tertiary)', fontWeight: '500' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {quiz.usageCount || 0} lượt thi
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '800', color: 'var(--warning)' }}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        {quiz.averageRating !== undefined ? quiz.averageRating.toFixed(1) : '0.0'}
                      </div>
                    </div>
                    {quiz.HanNop && (
                      <div style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Hạn chót: {new Date(quiz.HanNop).toLocaleString('vi-VN')}
                      </div>
                    )}
                    
                    {isStudent ? (
                      <button 
                        onClick={() => { setSelectedQuiz(quiz); setShowStartModal(true); }}
                        className="btn btn-primary" 
                        style={{ width: '100%', borderRadius: '14px', padding: '14px', border: 'none', cursor: 'pointer' }}
                      >
                        Làm bài ngay
                      </button>
                    ) : (
                      <Link to="/manage" className="btn btn-primary" style={{ width: '100%', borderRadius: '14px', padding: '14px' }}>
                        Chỉnh sửa ngay
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', borderRadius: '30px' }}>
                <div style={{ background: 'var(--background)', width: '70px', height: '70px', borderRadius: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                  <svg width="32" height="32" fill="none" stroke="var(--text-tertiary)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '20px' }}>Chưa có đề thi nào</h3>
                <p style={{ color: 'var(--text-tertiary)' }}>Hãy là người đầu tiên tạo đề thi bằng AI của chúng tôi!</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Sidebar Content (Right) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
        
        {/* Leaderboard Section */}
        <div className="card" style={{ padding: '28px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Bảng Xếp Hạng</h3>
            <div style={{ background: 'var(--primary-soft)', padding: '8px', borderRadius: '10px' }}>
              <svg width="22" height="22" fill="#FFB547" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.022 5.022 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.022 5.022 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {leaderboard.length > 0 ? leaderboard.map((player, idx) => {
              const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#315CFF', '#315CFF'];
              const color = colors[idx] || '#315CFF';
              return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: color, fontSize: '18px', border: `2px solid ${color}33` }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <Link to={`/user/${player.userId || ''}`} style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', textDecoration: 'none' }}>{player.fullname}</Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{player.totalPoints || 0} đ • {player.examsCount} bài</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--secondary)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                  Top {idx + 1}
                </div>
              </div>
            )}) : (
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px' }}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="card" style={{ padding: '28px', borderRadius: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '25px' }}>Hoạt Động Gần Đây</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {recentActivity.length > 0 ? recentActivity.map((activity, i) => {
              const date = new Date(activity.time);
              const timeStr = !isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : 'gần đây';
              const nameInitial = activity.fullname ? activity.fullname.charAt(0) : 'U';
              return (
              <div key={i} style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '10px', overflow: 'hidden' }}>
                  <img src={`https://ui-avatars.com/api/?name=${nameInitial}&background=F4F7FE&color=315CFF&bold=true`} alt="user" style={{ width: '100%', height: '100%' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                    <Link to={`/user/${activity.userId || ''}`} style={{ fontWeight: '800', color: 'var(--text-primary)', textDecoration: 'none' }}>{activity.fullname}</Link> vừa thi {activity.quizTitle} ({activity.score || 0}đ)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600', marginTop: '4px' }}>{timeStr}</div>
                </div>
              </div>
            )}) : (
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center' }}>Chưa có hoạt động nào</div>
            )}
          </div>
        </div>

        {/* Trending Tags */}
        <div className="card" style={{ padding: '28px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Chủ Đề Thịnh Hành</h3>
            <span style={{ fontSize: '20px' }}>🚀</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {trendingTopics.length > 0 ? trendingTopics.map(topic => (
              <Link key={topic.id} to={`/topics/${encodeURIComponent(topic.name)}`} style={{ 
                padding: '10px 18px', 
                background: '#F4F7FE', 
                borderRadius: '14px', 
                fontSize: '13px', 
                fontWeight: '700',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                transition: 'var(--transition)'
              }} onMouseOver={(e) => e.target.style.background = '#E0E5F2'} onMouseOut={(e) => e.target.style.background = '#F4F7FE'}>
                {topic.name} ({topic.questionCount || 0})
              </Link>
            )) : (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Đang tải...</div>
            )}
          </div>
        </div>
      </div>
      
      {showStartModal && (
        <StartExamModal 
          quiz={selectedQuiz} 
          onClose={() => setShowStartModal(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
