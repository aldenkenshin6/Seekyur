import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { getAuthLogs } from '../../services/authLogService';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';
import '../Dashboard.css';
import './AuthLogs.css';

const AnalystAuthLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('All Events');
    const [resultFilter, setResultFilter] = useState('All Results');

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const { data } = await getAuthLogs();
                setLogs(data);
            } catch (err) {
                console.error("Failed to load auth logs:", err);
            } finally {
                setLoading(false);
            }
        };

        loadLogs();

        const socket = io(SOCKET_URL);
        const logHandler = (newLog) => {
            setLogs((prev) => [newLog, ...prev]);
        };
        socket.on('receiveAuthLog', logHandler);

        return () => {
            socket.off('receiveAuthLog', logHandler);
            socket.disconnect();
        };
    }, []);

    const totalCount = logs.length;
    const successCount = logs.filter(l => l.result === 'Success').length;
    const failedCount = logs.filter(l => l.result === 'Failed').length;
    const uniqueFailedIPs = new Set(logs.filter(l => l.result === 'Failed').map(l => l.ipAddress)).size;

    const filteredLogs = logs.filter(log => {
        const eventMatches = eventFilter === 'All Events' || log.event === eventFilter;
        const resultMatches = resultFilter === 'All Results' || log.result === resultFilter;
        const searchLower = searchTerm.toLowerCase();
        const searchMatches = !searchTerm ||
            (log.userEmail && log.userEmail.toLowerCase().includes(searchLower)) ||
            (log.ipAddress && log.ipAddress.toLowerCase().includes(searchLower)) ||
            (log.location && log.location.toLowerCase().includes(searchLower)) ||
            (log.sessionToken && log.sessionToken.toLowerCase().includes(searchLower)) ||
            (log.userAgent && log.userAgent.toLowerCase().includes(searchLower)) ||
            (log.failureReason && log.failureReason.toLowerCase().includes(searchLower));
        return eventMatches && resultMatches && searchMatches;
    });

    const formatTimestamp = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="dashboard-layout analyst-theme">
            <Sidebar />
            
            <div className="main-content">
                <Header />

                <div className="incidents-content">
                    <div className="authlogs-title-row">
                        <h2 className="users-page-title">User Authentication Logs</h2>
                        <p className="users-page-subtitle">Login, logout, and session activity - {totalCount} events recorded</p>
                    </div>

                    <div className="authlogs-stat-row">
                        <div className="authlogs-stat-card">
                            <h3 className="authlogs-stat-value" style={{ color: '#e2e8f0' }}>{totalCount}</h3>
                            <p className="authlogs-stat-label">Total Events</p>
                        </div>
                        <div className="authlogs-stat-card">
                            <h3 className="authlogs-stat-value" style={{ color: 'var(--success-color)' }}>{successCount}</h3>
                            <p className="authlogs-stat-label">Successful</p>
                        </div>
                        <div className="authlogs-stat-card">
                            <h3 className="authlogs-stat-value" style={{ color: 'var(--failed-color)' }}>{failedCount}</h3>
                            <p className="authlogs-stat-label">Failed Attempts</p>
                        </div>
                        <div className="authlogs-stat-card">
                            <h3 className="authlogs-stat-value" style={{ color: 'var(--ip-failed-color)' }}>{uniqueFailedIPs}</h3>
                            <p className="authlogs-stat-label">IPs with Failures</p>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <div className="search-input-wrapper">
                            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input 
                                type="text" 
                                className="alerts-search-input" 
                                placeholder="Search email, IP, location, token..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="filter-dropdown" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                            <option value="All Events">All Events</option>
                            <option value="Login">Login</option>
                            <option value="Token Refresh">Token Refresh</option>
                        </select>
                        <select className="filter-dropdown" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
                            <option value="All Results">All Results</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>

                    <div className="live-feed-banner">
                        <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>Authentication Events</div>
                        <div style={{ color: '#64748b' }}>{filteredLogs.length} entries</div>
                    </div>

                    <div className="authlogs-table-container">
                        <table className="authlogs-table">
                            <thead>
                                <tr>
                                    <th>RESULT</th>
                                    <th>EVENT</th>
                                    <th>USER EMAIL</th>
                                    <th>IP ADDRESS</th>
                                    <th>LOCATION</th>
                                    <th>SESSION TOKEN</th>
                                    <th>USER AGENT</th>
                                    <th>TIMESTAMP</th>
                                    <th>FAILURE REASON</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.map(log => {
                                    const resLower = (log.result || 'success').toLowerCase();
                                    return (
                                        <tr key={log._id}>
                                            <td>
                                                <span className={`severity-pill ${resLower === 'success' ? 'success' : 'failed'}`}>
                                                    <div className="dot"></div> {log.result}
                                                </span>
                                            </td>
                                            <td className="event-cell">{log.event}</td>
                                            <td className="email-cell">{log.userEmail}</td>
                                            <td className="source-ip-cell">{log.ipAddress}</td>
                                            <td className="location-cell">{log.location}</td>
                                            <td className="session-cell">{log.sessionToken || '-'}</td>
                                            <td className="agent-cell">{log.userAgent}</td>
                                            <td className="updated-time">{formatTimestamp(log.timestamp)}</td>
                                            <td className="reason-cell">{log.failureReason || '-'}</td>
                                        </tr>
                                    );
                                })}
                                {filteredLogs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No authentication events recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
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

export default AnalystAuthLogs;
