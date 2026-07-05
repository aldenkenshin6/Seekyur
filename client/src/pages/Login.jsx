import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const [lockoutTime, setLockoutTime] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const lockoutUntilStr = localStorage.getItem('lockoutUntil');
        if (lockoutUntilStr) {
            const lockoutUntil = new Date(lockoutUntilStr);
            const now = new Date();
            if (lockoutUntil > now) {
                const remaining = Math.ceil((lockoutUntil - now) / 1000);
                setLockoutTime(remaining);
                setIsLocked(true);
            } else {
                localStorage.removeItem('lockoutUntil');
            }
        }
    }, []);

    useEffect(() => {
        if (lockoutTime <= 0) {
            if (isLocked) {
                setIsLocked(false);
                localStorage.removeItem('lockoutUntil');
            }
            return;
        }

        const interval = setInterval(() => {
            setLockoutTime((prev) => {
                const nextVal = prev - 1;
                if (nextVal <= 0) {
                    setIsLocked(false);
                    localStorage.removeItem('lockoutUntil');
                }
                return nextVal;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [lockoutTime, isLocked]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLocked) return;

        try {
            const { data } = await loginUser(form);
            login(data);
            navigate('/dashboard');
        } catch (err) {
            const responseData = err?.response?.data;
            if (err?.response?.status === 429 && responseData?.lockoutUntil) {
                const until = new Date(responseData.lockoutUntil);
                localStorage.setItem('lockoutUntil', until.toISOString());
                const remaining = Math.ceil((until - new Date()) / 1000);
                setLockoutTime(remaining);
                setIsLocked(true);
                setError(responseData.message || `Account locked. Try again in ${remaining} seconds.`);
            } else {
                setError(responseData?.message || 'Invalid username or password');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="glow-orb-1"></div>
            <div className="glow-orb-2"></div>

            <div className="login-content">
                <div className="logo-header">
                    <div className="logo-icon">
                        <img src="seekyur.png" alt="SeekYur Logo" width="50" height="50" />
                    </div>
                    <div className="logo-text-container">
                        <h1 className="logo-title">SeekYur</h1>
                        <p className="logo-subtitle">SECURITY OPERATIONS CENTER</p>
                    </div>
                </div>

                <div className="status-indicator">
                    <div className="status-dot"></div>
                    <span>All Systems Operational</span>
                </div>

                <div className="login-card">
                    <h2 className="card-title">Authenticate</h2>
                    <p className="card-subtitle">SOC Portal - Authorized access only</p>

                    {error && <div className="error-message">{error}</div>}

                    {isLocked && (
                        <div className="lockout-banner" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            textAlign: 'center',
                            marginBottom: '16px',
                            fontWeight: '500'
                        }}>
                            ⚠️ Account locked out. Cooldown active: {lockoutTime}s remaining.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">USERNAME</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter username"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                disabled={isLocked}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">PASSWORD</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                disabled={isLocked}
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLocked}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            {isLocked ? `Locked (${lockoutTime}s)` : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;