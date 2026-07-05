import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Header = () => {
    const { user, logout } = useAuth();
    const { alerts, unreadCount, markAllAsRead, toast } = useNotifications();
    const [currentTime, setCurrentTime] = useState('');
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

    const notificationDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);

    // Update current system time
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
                setShowNotificationDropdown(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const diffMs = new Date() - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getSeverityClass = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'severity-critical';
            case 'high': return 'severity-high';
            case 'medium': return 'severity-medium';
            default: return 'severity-low';
        }
    };

    return (
        <>
            {/* Global Real-time Toast Notifications */}
            {toast && (
                <div className="toast-container">
                    <div className="toast">
                        <div className="toast-icon">!</div>
                        <div className="toast-content">
                            <span className={`toast-severity-badge ${getSeverityClass(toast.severity)}`}>
                                {toast.severity}
                            </span>
                            <p className="toast-message">
                                <strong>{toast.title}</strong>: {toast.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <header className="top-header">
                <div className="header-left">
                    <div className="live-indicator">
                        <div className="live-dot"></div>
                        LIVE
                    </div>
                    <div className="header-time">{currentTime}</div>
                </div>
                
                <div className="header-right">
                    <div className="status-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        All Systems Operational
                    </div>
                    
                    {/* Notification Bell and Panel */}
                    <div className="notification-container" ref={notificationDropdownRef}>
                        <button 
                            className={`notification-btn ${showNotificationDropdown ? 'active' : ''}`}
                            onClick={() => {
                                setShowNotificationDropdown(!showNotificationDropdown);
                                setShowProfileDropdown(false);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {unreadCount > 0 && (
                                <span className="notification-badge">{unreadCount}</span>
                            )}
                        </button>

                        {showNotificationDropdown && (
                            <div className="notification-dropdown">
                                <div className="notification-dropdown-header">
                                    <h3>Threat Alerts</h3>
                                    {unreadCount > 0 && (
                                        <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="notification-dropdown-list">
                                    {alerts.length === 0 ? (
                                        <div className="notification-empty">
                                            <p>No threats detected</p>
                                        </div>
                                    ) : (
                                        alerts.slice(0, 10).map((alert) => (
                                            <div 
                                                key={alert._id} 
                                                className={`notification-item ${alert.isRead ? 'read' : 'unread'}`}
                                            >
                                                <div className="notification-item-header">
                                                    <span className={`notification-severity ${getSeverityClass(alert.severity)}`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="notification-time">
                                                        {formatRelativeTime(alert.createdAt)}
                                                    </span>
                                                </div>
                                                <h4 className="notification-title">{alert.title}</h4>
                                                <p className="notification-desc">{alert.description}</p>
                                                <div className="notification-meta">
                                                    <span>Source: {alert.source}</span>
                                                    {alert.sourceIp && <span>IP: {alert.sourceIp}</span>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* User Profile and Dropdown */}
                    <div className="user-profile-container" ref={profileDropdownRef}>
                        <div 
                            className="user-profile" 
                            onClick={() => {
                                setShowProfileDropdown(!showProfileDropdown);
                                setShowNotificationDropdown(false);
                            }}
                        >
                            <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                            <div className="user-info">
                                <span className="user-name">{user?.name || 'Unknown'}</span>
                                <span className="user-role">{user?.role || 'User'}</span>
                            </div>
                        </div>
                        {showProfileDropdown && (
                            <div className="profile-dropdown">
                                <button onClick={logout} className="logout-btn">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
