import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Viewer' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        try {
        await registerUser(form);
        navigate('/');
        } catch (err) {
        setError(err?.response?.data?.message || 'Registration failed');
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px', marginBottom: '12px',
        background: '#0a0e1a', border: '1px solid #1a2540',
        borderRadius: '6px', color: '#fff', fontSize: '14px'
    };

    return (
        <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: '#0a0e1a'
        }}>
        <div style={{
            background: '#0d1f3c', padding: '40px', borderRadius: '12px',
            border: '1px solid #1a2540', width: '360px'
        }}>
            <h1 style={{ color: '#00c6ff', textAlign: 'center', marginBottom: '4px' }}>SeekYur</h1>
            <p style={{ color: '#5b8db8', textAlign: 'center', marginBottom: '28px', fontSize: '13px' }}>
            Create Account
            </p>

            {error && <p style={{ color: '#ff4d4d', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

            <input placeholder="Full Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle} />
            <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle} />
            <input type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={inputStyle} />

            <select value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{ ...inputStyle, marginBottom: '20px' }}>
            <option value="Viewer">Viewer</option>
            <option value="SOC Analyst">SOC Analyst</option>
            <option value="Incident Responder">Incident Responder</option>
            </select>

            <button onClick={handleSubmit} style={{
            width: '100%', padding: '10px', background: '#00c6ff',
            color: '#0a0e1a', border: 'none', borderRadius: '6px',
            fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
            }}>
            Register
            </button>

            <p style={{ color: '#5b8db8', textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/')}
                style={{ color: '#00c6ff', cursor: 'pointer' }}>
                Login here
            </span>
            </p>
        </div>
        </div>
    );
};

export default Register;