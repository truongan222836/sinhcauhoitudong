import API_BASE_URL from '../apiConfig';

const LoginForm = ({ setActiveTab }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    // const navigate = useNavigate(); // Removed unused variable

    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            console.log("Response Status:", response.status);
            const text = await response.text();
            console.log("Response Body:", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse JSON:", e);
                throw new Error("Dữ liệu phản hồi từ server không hợp lệ.");
            }

            if (!response.ok) {
                throw new Error(data.message || 'Đăng nhập thất bại.');
            }
            
            setMessage('Đăng nhập thành công!');
            // Use AuthContext to login
            login(data.user, data.token);
            
        } catch (error) {
            setMessage(error.message);
        }
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '5px', background: '#007BFF', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <form onSubmit={handleSubmit}>
            {message && <p style={{ color: message.includes('thành công') ? 'green' : 'red', textAlign: 'center' }}>{message}</p>}
            <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                style={inputStyle}
            />
            <input
                type="password"
                name="password"
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
                style={inputStyle}
            />
            <button type="submit" style={buttonStyle}>Đăng Nhập</button>
            <p style={{ textAlign: 'right', marginTop: '15px' }}>
                <span onClick={() => setActiveTab('forgot')} style={{ color: '#007BFF', cursor: 'pointer', fontSize: '14px' }}>
                    Quên mật khẩu?
                </span>
            </p>
        </form>
    );
};

export default LoginForm;
