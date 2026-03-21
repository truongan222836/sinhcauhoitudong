import API_BASE_URL from '../apiConfig';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setIsError(true);
                setMessage("Không tìm thấy token khôi phục.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify-token?token=${token}`);
                const data = await response.json();
                
                if (response.ok && data.valid) {
                    setIsValidToken(true);
                } else {
                    setIsError(true);
                    setMessage(data.message || "Token không hợp lệ hoặc đã hết hạn.");
                }
            } catch (error) {
                setIsError(true);
                setMessage("Lỗi kết nối máy chủ.");
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (formData.newPassword !== formData.confirmPassword) {
            setIsError(true);
            setMessage('Mật khẩu xác nhận không khớp.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: formData.newPassword }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Lỗi đặt lại mật khẩu.');
            }
            
            setMessage('Đặt lại mật khẩu thành công! Chuyển hướng về đăng nhập...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
            
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        }
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '5px', background: '#007BFF', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
            <div style={{
                width: '420px',
                padding: '40px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Đặt lại mật khẩu</h2>
                
                {isLoading ? (
                    <p style={{ textAlign: 'center' }}>Đang kiểm tra token...</p>
                ) : (
                    <>
                        {message && <p style={{ color: isError ? 'red' : 'green', textAlign: 'center', marginBottom: '15px' }}>{message}</p>}
                        
                        {isValidToken && !message.includes('thành công') && (
                            <form onSubmit={handleSubmit}>
                                <input
                                    type="password"
                                    name="newPassword"
                                    placeholder="Mật khẩu mới"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Xác nhận mật khẩu mới"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                                <button type="submit" style={buttonStyle}>Đổi mật khẩu</button>
                            </form>
                        )}

                        <p style={{ textAlign: 'center', marginTop: '20px' }}>
                            <a href="/login" style={{ color: '#007BFF', textDecoration: 'none', fontSize: '14px' }}>
                                Quay lại Đăng nhập
                            </a>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
