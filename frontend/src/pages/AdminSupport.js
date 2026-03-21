import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';

const AdminSupport = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSupportRequests();
    }, []);

    const fetchSupportRequests = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/support`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (res.ok) setRequests(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await fetch(`${API_BASE_URL}/admin/support/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status })
            });
            fetchSupportRequests();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải yêu cầu hỗ trợ...</div>;

    return (
        <div style={{ padding: '30px', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0' }}>Quản Lý Hỗ Trợ</h1>
                <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Danh sách các yêu cầu hỗ trợ từ người dùng hệ thống.</p>
            </div>

            <div className="card" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(49, 92, 255, 0.02)' }}>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Người dùng</th>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Tiêu đề</th>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Nội dung</th>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Trạng thái</th>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Ngày gửi</th>
                            <th style={{ padding: '20px 25px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length > 0 ? requests.map(req => (
                            <tr key={req.support_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ fontWeight: '700' }}>{req.fullname}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{req.email}</div>
                                </td>
                                <td style={{ padding: '20px 25px', fontWeight: '700' }}>{req.title}</td>
                                <td style={{ padding: '20px 25px', maxWidth: '300px' }}>
                                    <div style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.message}>
                                        {req.message}
                                    </div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <span style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: '10px', 
                                        fontSize: '12px', 
                                        fontWeight: '700',
                                        background: req.status === 'Đã giải quyết' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Đang xử lý' ? 'rgba(255, 181, 71, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: req.status === 'Đã giải quyết' ? 'var(--secondary)' : req.status === 'Đang xử lý' ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                        {req.status}
                                    </span>
                                </td>
                                <td style={{ padding: '20px 25px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                    {new Date(req.created_at).toLocaleString('vi-VN')}
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <select 
                                        value={req.status} 
                                        onChange={(e) => updateStatus(req.support_id, e.target.value)}
                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                                    >
                                        <option value="Chờ xử lý">Chờ xử lý</option>
                                        <option value="Đang xử lý">Đang xử lý</option>
                                        <option value="Đã giải quyết">Đã giải quyết</option>
                                    </select>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Chưa có yêu cầu hỗ trợ nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminSupport;
