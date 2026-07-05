import { formatDate } from '../utils/formatDate';

const AlertFeed = ({ alerts = [] }) => {
    return (
        <div className="alert-feed-card">
            <div className="alert-feed-header">
                <div className="alert-feed-title">
                    <div className="dot"></div> Live Alert Feed
                </div>
                <div className="alert-feed-status">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    Real-time - Socket.io
                </div>
            </div>
            
            <div className="alert-list">
                {alerts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No live alerts currently. Waiting for socket events...
                    </div>
                ) : (
                    alerts.map((alert, i) => {
                        const sevLower = (alert.severity || 'low').toLowerCase();
                        return (
                            <div key={i} className="alert-item">
                                <div className={`alert-severity-bar bg-${sevLower}`}></div>
                                <div className="alert-content">
                                    <div className="alert-header-row">
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className={`alert-type-badge severity-${sevLower}`}>
                                                {alert.type || 'ALERT'}
                                            </span>
                                            <span className={`alert-severity-tag severity-${sevLower}`}>
                                                <div className="dot" style={{width: 4, height: 4, borderRadius: '50%', background: 'currentColor'}}></div>
                                                {alert.severity || 'Low'}
                                            </span>
                                        </div>
                                        <span className="alert-time">
                                            {alert.createdAt ? formatDate(alert.createdAt) : 'just now'}
                                        </span>
                                    </div>
                                    <p className="alert-desc">{alert.title}</p>
                                    <p className="alert-source">{alert.source || 'system'}</p>
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