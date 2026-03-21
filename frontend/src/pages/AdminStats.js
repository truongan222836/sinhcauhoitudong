import API_BASE_URL from '../apiConfig';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStats(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Đang tải thống kê...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '30px' }}>Thống Kê Hệ Thống</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '40px' }}>
        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Tổng Người Dùng</h4>
          <h2 style={{ fontSize: '36px', color: 'var(--primary)' }}>{stats.totalUsers}</h2>
        </div>
        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Tổng Đề Thi</h4>
          <h2 style={{ fontSize: '36px', color: 'var(--secondary)' }}>{stats.totalExams}</h2>
        </div>
        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Tổng Lượt Thi</h4>
          <h2 style={{ fontSize: '36px', color: '#8B5CF6' }}>{stats.totalAttempts}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Top Giảng Viên (Nhiều Đề Nhất)</h3>
          {stats.topTeachers.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #E2E8F0' }}>
              <span>{t.name}</span>
              <span style={{ fontWeight: 'bold' }}>{t.examCount} đề</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Top Sinh Viên (Điểm Cao Nhất)</h3>
          {stats.topStudents.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #E2E8F0' }}>
              <span>{s.name}</span>
              <span style={{ fontWeight: 'bold' }}>{s.totalPoints} đ</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
