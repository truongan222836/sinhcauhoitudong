import API_BASE_URL from '../apiConfig';

const Navbar = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) setNotifications(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id, link) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setShowNotif(false);
      if (link) {
        navigate(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      padding: '20px 30px',
      background: 'transparent',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* Search Bar */}
      <div style={{
        background: 'white',
        borderRadius: '30px',
        width: '400px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          type="text" 
          placeholder="Tìm kiếm đề thi, chủ đề hoặc người tạo..." 
          style={{ border: 'none', padding: 0, background: 'transparent', width: '100%', fontSize: '14px' }}
        />
        <button style={{ background: 'var(--background)', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          Bộ lọc
        </button>
      </div>
      
      {/* Right Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/help" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </Link>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotif(!showNotif)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </button>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', fontSize: '10px', height: '16px', minWidth: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontWeight: 'bold' }}>{unreadCount}</span>
          )}
          
          {/* Notifications Dropdown */}
          {showNotif && (
            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', background: 'white', width: '320px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100 }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>Thông báo</span>
                {unreadCount > 0 && <span style={{ fontSize: '11px', color: 'var(--primary)' }}>{unreadCount} chưa đọc</span>}
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id, n.link)} style={{ padding: '15px', borderBottom: '1px solid var(--border)', background: n.isRead ? 'transparent' : 'rgba(49, 92, 255, 0.05)', cursor: 'pointer', transition: 'background 0.2s', borderLeft: n.isRead ? '4px solid transparent' : '4px solid var(--primary)' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: n.isRead ? '600' : '800' }}>{n.title}</p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(n.time).toLocaleString('vi-VN')}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Không có thông báo mới</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Link to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px', background: 'white', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden' }}>
              <img src={`https://ui-avatars.com/api/?name=${user.fullname || 'U'}&background=315CFF&color=fff`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: '600', fontSize: '13px', paddingRight: '10px' }}>{user.fullname?.split(' ')[0] || 'Bạn'}</span>
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
