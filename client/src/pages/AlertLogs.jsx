import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import './AlertLogs.css';

import AnalystAlertLogs from './Analyst/AlertLogs';

const DefaultAlertLogs = () => {
    const { alerts, loading } = useNotifications();

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('All Severities');
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [currentPage, setCurrentPage] = useState(1);

    const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
    const highCount = alerts.filter(a => a.severity === 'High').length;
    const mediumCount = alerts.filter(a => a.severity === 'Medium').length;
    const lowCount = alerts.filter(a => a.severity === 'Low').length;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, severityFilter, typeFilter]);

    const filteredAlerts = alerts.filter(a => {
        const severityMatches = severityFilter === 'All Severities' || a.severity === severityFilter;

        const typeStr = a.type || a.title.substring(0, 15).toUpperCase();
        const typeMatches = typeFilter === 'All Types' || typeStr === typeFilter;

        const searchLower = searchTerm.toLowerCase();
        const searchMatches = !searchTerm ||
            (a.title && a.title.toLowerCase().includes(searchLower)) ||
            (a.description && a.description.toLowerCase().includes(searchLower)) ||
            (a.source && a.source.toLowerCase().includes(searchLower)) ||
            (a.sourceIp && a.sourceIp.toLowerCase().includes(searchLower)) ||
            (a.type && a.type.toLowerCase().includes(searchLower));

        return severityMatches && typeMatches && searchMatches;
    });



    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="main-content">
                <Header />

                <div className="incidents-content">
                    <div style={{ marginBottom: '24px' }}>
                        <h2 className="users-page-title">Alert Logs</h2>
                        <p className="users-page-subtitle">Live feed history - {alerts.length} alerts captured this session</p>
                    </div>

                    <div className="alerts-stat-row">
                        <div className="alert-stat-card">
                            <h3 className="alert-stat-value" style={{ color: '#ef4444' }}>{criticalCount}</h3>
                            <p className="alert-stat-label">Critical</p>
                        </div>
                        <div className="alert-stat-card">
                            <h3 className="alert-stat-value" style={{ color: '#f59e0b' }}>{highCount}</h3>
                            <p className="alert-stat-label">High</p>
                        </div>
                        <div className="alert-stat-card">
                            <h3 className="alert-stat-value" style={{ color: '#eab308' }}>{mediumCount}</h3>
                            <p className="alert-stat-label">Medium</p>
                        </div>
                        <div className="alert-stat-card">
                            <h3 className="alert-stat-value" style={{ color: '#10b981' }}>{lowCount}</h3>
                            <p className="alert-stat-label">Low</p>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <div className="search-input-wrapper">
                            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className="alerts-search-input"
                                placeholder="Search message, IP, source..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="filter-dropdown" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                            <option value="All Severities">All Severities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <select className="filter-dropdown" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="All Types">All Types</option>
                            {Array.from(new Set(alerts.map(a => a.type || a.title.substring(0, 15).toUpperCase()).filter(Boolean))).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="live-feed-banner">
                        <div className="live-dot" style={{ width: '6px', height: '6px', background: '#ef4444' }}></div>
                        Live - new alerts appear automatically - showing {filteredAlerts.length} of {alerts.length}
                    </div>

                    <div className="alerts-table-container">
                        <table className="alerts-table">
                            <thead>
                                <tr>
                                    <th>SEVERITY</th>
                                    <th>TYPE</th>
                                    <th>MESSAGE</th>
                                    <th>SOURCE SYSTEM</th>
                                    <th>SOURCE IP</th>
                                    <th>DATETIME</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAlerts.map(a => {
                                    const sevLower = (a.severity || 'low').toLowerCase();
                                    return (
                                        <tr key={a._id}>
                                            <td>
                                                <span className={`severity-pill ${sevLower}`}>
                                                    <div className="dot"></div> {a.severity}
                                                </span>
                                            </td>
                                            <td className="type-cell">{a.type || a.title.substring(0, 15).toUpperCase()}</td>
                                            <td className="message-cell">{a.description}</td>
                                            <td className="source-sys-cell">{a.source}</td>
                                            <td className="source-ip-cell">{a.sourceIp || 'N/A'}</td>
                                            <td className="updated-time" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>
                                            <td>
                                                {a.isRead ? (
                                                    <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div className="dot" style={{ background: '#64748b' }}></div> Read
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#00c6ff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                                        <div className="dot" style={{ background: '#00c6ff', boxShadow: '0 0 8px rgba(0, 198, 255, 0.6)' }}></div> Unread
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredAlerts.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No alerts captured.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} entries
                                </div>
                                <div className="pagination-buttons">
                                    <button 
                                        className="pagination-btn" 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    >
                                        Previous
                                    </button>
                                    {[...Array(totalPages).keys()].map(page => (
                                        <button 
                                            key={page + 1}
                                            className={`pagination-btn ${currentPage === page + 1 ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(page + 1)}
                                        >
                                            {page + 1}
                                        </button>
                                    ))}
                                    <button 
                                        className="pagination-btn" 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AlertLogs = () => {
    const { user } = useAuth();
    if (user?.role === 'SOC Analyst' || user?.role === 'Incident Responder') {
        return <AnalystAlertLogs />;
    }
    return <DefaultAlertLogs />;
};

export default AlertLogs;
