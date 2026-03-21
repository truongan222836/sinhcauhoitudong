import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleId: 3 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setUsers(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const url = editingUser ? `${API_BASE_URL}/admin/users/${editingUser.id}` : `${API_BASE_URL}/admin/users`;
    const method = editingUser ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert(editingUser ? 'Cập nhật thành công!' : 'Tạo thành công!');
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', roleId: 3 });
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '30px' }}>Quản Lý Người Dùng</h1>
      
      <div className="card" style={{ padding: '30px', marginBottom: '30px' }}>
        <h3>{editingUser ? 'Sửa Người Dùng' : 'Thêm Người Dùng Mới'}</h3>
        <form onSubmit={handleCreateOrUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label>Họ tên</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>
          {!editingUser && (
            <div>
              <label>Mật khẩu</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            </div>
          )}
          <div>
            <label>Vai trò</label>
            <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: parseInt(e.target.value)})}>
              <option value={1}>Admin</option>
              <option value={2}>Giảng viên</option>
              <option value={3}>Sinh viên</option>
            </select>
          </div>
          <button className="btn btn-primary">{editingUser ? 'Cập nhật' : 'Thêm'}</button>
          {editingUser && <button type="button" onClick={() => { setEditingUser(null); setFormData({name:'', email:'', password:'', roleId:3}) }}>Hủy</button>}
        </form>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F8FAFC' }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Họ tên</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Vai trò</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                <td style={{ padding: '15px' }}>{u.id}</td>
                <td style={{ padding: '15px' }}>{u.name}</td>
                <td style={{ padding: '15px' }}>{u.email}</td>
                <td style={{ padding: '15px' }}>
                  {u.roleId === 1 ? 'Admin' : u.roleId === 2 ? 'Giảng viên' : 'Sinh viên'}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <button onClick={() => { setEditingUser(u); setFormData({name: u.name, email: u.email, roleId: u.roleId}) }} style={{ marginRight: '10px' }}>Sửa</button>
                  <button onClick={() => handleDelete(u.id)} style={{ color: 'var(--danger)' }}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
