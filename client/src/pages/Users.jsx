import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getUsers, updateUserStatus, createUser, getSecuritySettings, updateSecuritySettings } from '../services/userService';
import './Dashboard.css';
import './Users.css';

const Users = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Viewer' });

    const [maxAttempts, setMaxAttempts] = useState(3);
    const [lockoutDuration, setLockoutDuration] = useState(30);

    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSecuritySettings({ maxAttempts, lockoutDuration });
            alert('Security policy updated successfully!');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update security policy');
        }
    };

    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        try {
            await createUser(form);
            alert('User created successfully!');
            setShowForm(false);
            setForm({ name: '', email: '', password: '', role: 'Viewer' });
            await refreshUsers();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to create user');
        }
    };

    useEffect(() => {
        if (user?.role !== 'Admin' && user?.role !== 'Viewer') {
            navigate('/dashboard');
            return;
        }

        const loadUsers = async () => {
            try {
                const { data } = await getUsers();
                setUsers(data);
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        const loadSettings = async () => {
            try {
                const { data } = await getSecuritySettings();
                setMaxAttempts(data.maxAttempts);
                setLockoutDuration(data.lockoutDuration);
            } catch (err) {
                console.error("Failed to load security settings", err);
            }
        };

        loadUsers();
        loadSettings();
    }, [navigate, user?.role]);

    const refreshUsers = async () => {
        const { data } = await getUsers();
        setUsers(data);
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await updateUserStatus(id, !currentStatus);
            await refreshUsers();
        } catch (err) {
            setError(err?.response?.data?.message || 'Unable to update user status');
        }
    };

    if (user?.role !== 'Admin' && user?.role !== 'Viewer') {
        return null;
    }

    const adminCount = users.filter(u => u.role === 'Admin').length;
    const analystCount = users.filter(u => u.role === 'SOC Analyst').length;
    const responderCount = users.filter(u => u.role === 'Incident Responder').length;
    const viewerCount = users.filter(u => u.role === 'Viewer').length;
    const activeCount = users.filter(u => u.isActive).length;

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getRoleClass = (role) => {
        if (role === 'Admin' || role === 'Administrator') return 'role-admin';
        if (role === 'SOC Analyst') return 'role-analyst';
        if (role === 'Incident Responder') return 'role-responder';
        return 'role-viewer';
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="main-content">
                <Header />

                <div className="incidents-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                        <div>
                            <h2 className="users-page-title">User Management</h2>
                            <p className="users-page-subtitle">{users.length} registered users • Administrator access only</p>
                        </div>
                        {user?.role !== 'Viewer' && (
                            <button className="new-user-btn" onClick={() => setShowForm(true)}>
                                + Add User
                            </button>
                        )}
                    </div>

                    <div className="users-stat-row">
                        <div className="user-stat-card">
                            <h3 className="user-stat-value">{adminCount}</h3>
                            <p className="user-stat-label">Administrator</p>
                        </div>
                        <div className="user-stat-card">
                            <h3 className="user-stat-value">{analystCount}</h3>
                            <p className="user-stat-label">SOC Analyst</p>
                        </div>
                        <div className="user-stat-card">
                            <h3 className="user-stat-value">{responderCount}</h3>
                            <p className="user-stat-label">Incident Responder</p>
                        </div>
                        <div className="user-stat-card">
                            <h3 className="user-stat-value">{viewerCount}</h3>
                            <p className="user-stat-label">Viewer</p>
                        </div>
                    </div>

                    {/* Security settings section */}
                    {user?.role !== 'Viewer' && (
                        <div className="security-settings-section" style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c6ff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    Authentication Security Policy
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Configure the maximum authentication attempts allowed before account lockout and the base lockout cooling period.</p>
                            </div>
                            <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>MAX ATTEMPTS</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        style={{
                                            background: '#020617',
                                            border: '1px solid #1e293b',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            padding: '6px 10px',
                                            width: '60px',
                                            textAlign: 'center'
                                        }}
                                        value={maxAttempts}
                                        onChange={(e) => setMaxAttempts(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>LOCKOUT COOLDOWN (S)</label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="3600"
                                        style={{
                                            background: '#020617',
                                            border: '1px solid #1e293b',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            padding: '6px 10px',
                                            width: '80px',
                                            textAlign: 'center'
                                        }}
                                        value={lockoutDuration}
                                        onChange={(e) => setLockoutDuration(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="new-user-btn" style={{ height: '34px', padding: '0 16px', background: 'rgba(0, 198, 255, 0.1)', color: '#00c6ff', border: '1px solid rgba(0, 198, 255, 0.3)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                    Apply Policy
                                </button>
                            </form>
                        </div>
                    </div>
                    )}

                    {error && (
                        <div style={{ background: '#3b0909', color: '#fca5a5', padding: '12px 16px', borderRadius: '6px', border: '1px solid #7f1d1d', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <div className="users-table-container">
                        <div className="users-table-header">
                            <h3 className="users-table-title">All Users</h3>
                            <p className="users-table-subtitle">{activeCount} active</p>
                        </div>
                        <table className="incidents-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>USERNAME</th>
                                    <th>EMAIL</th>
                                    <th>ROLE</th>
                                    <th>STATUS</th>
                                    <th>IP ADDRESS</th>
                                    <th>MAC ADDRESS</th>
                                    <th>LAST LOGIN</th>
                                    {user?.role !== 'Viewer' && <th>ACTIONS</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const daysAgo = u.lastLogin ? Math.floor((new Date() - new Date(u.lastLogin)) / (1000 * 60 * 60 * 24)) : null;
                                    const loginStr = daysAgo !== null ? (daysAgo === 0 ? 'Today' : `${daysAgo}d ago`) : 'Never';

                                    return (
                                        <tr key={u._id} style={{ cursor: 'default' }}>
                                            <td>
                                                <div className="user-name-cell">
                                                    <div className="user-avatar-sm">{getInitials(u.name)}</div>
                                                    <span style={{ color: '#fff' }}>{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="user-username">{u.username || u.name.split(' ')[0].toLowerCase()}</td>
                                            <td className="user-email">{u.email}</td>
                                            <td>
                                                <span className={`role-pill ${getRoleClass(u.role)}`}>
                                                    {u.role === 'Admin' ? 'Administrator' : u.role}
                                                </span>
                                            </td>
                                            <td>
                                                {u.isActive ? (
                                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                        <div className="dot" style={{ background: '#10b981' }}></div> Active
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                        <div className="dot" style={{ background: '#64748b' }}></div> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>{u.ipAddress || '192.168.1.x'}</td>
                                            <td style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>{u.macAddress || '00:00:00:00:00'}</td>
                                            <td className="updated-time">{loginStr}</td>
                                            {user?.role !== 'Viewer' && (
                                                <td>
                                                    {user?._id !== u._id ? (
                                                        <button
                                                            className={`action-btn ${u.isActive ? 'action-deactivate' : 'action-activate'}`}
                                                            onClick={() => handleToggleStatus(u._id, u.isActive)}
                                                        >
                                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    ) : null}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showForm && (
                    <div className="form-overlay" onClick={() => setShowForm(false)}>
                        <div className="form-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Add New User</h3>
                                <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleCreateUserSubmit}>
                                <div className="form-group">
                                    <label>FULL NAME</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>EMAIL ADDRESS</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="john@seekyur.io"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>PASSWORD</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>ROLE</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="Viewer">Viewer</option>
                                        <option value="SOC Analyst">SOC Analyst</option>
                                        <option value="Incident Responder">Incident Responder</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>cancel</button>
                                    <button type="submit" className="btn-save" style={{ background: '#00c6ff', color: '#0a0e1a' }}>Create User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Users;