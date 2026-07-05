import React from 'react';

const getRelativeTime = (date) => {
    if (!date) return 'just now';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const AlertFeed = ({ alerts = [] }) => {
    return (
        <div className="analyst-alert-feed-card">
            <div className="analyst-alert-feed-header">
                <div className="analyst-alert-feed-title">
                    <span className="analyst-live-dot"></span> Live Alert Feed
                </div>
                <div className="analyst-alert-feed-status">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    Real-time - Socket.io
                </div>
            </div>
            
            <div className="analyst-alert-list">
                {alerts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No live alerts currently. Waiting for socket events...
                    </div>
                ) : (
                    alerts.map((alert, i) => {
                        const sevLower = (alert.severity || 'low').toLowerCase();
                        return (
                            <div key={alert._id || i} className="analyst-alert-item">
                                <div className={`analyst-alert-severity-bar bg-${sevLower}`}></div>
                                <div className="analyst-alert-content">
                                    <div className="analyst-alert-header-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="analyst-alert-type-badge">
                                                {alert.type || 'ALERT'}
                                            </span>
                                            <span className={`analyst-alert-severity-tag severity-${sevLower}`}>
                                                {alert.severity || 'Low'}
                                            </span>
                                        </div>
                                        <span className="analyst-alert-time">
                                            {getRelativeTime(alert.createdAt)}
                                        </span>
                                    </div>
                                    <p className="analyst-alert-desc">{alert.title}</p>
                                    <p className="analyst-alert-source">
                                        {alert.source || 'system'}
                                        {alert.sourceIp ? `  ${alert.sourceIp}` : ''}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AlertFeed;
