import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getIncidents } from '../services/incidentService';
import { formatDate } from '../utils/formatDate';
import './Dashboard.css';
import './Reports.css';

import AnalystReports from './Analyst/Reports';

const SEVERITY_COLORS = { Low: '#10b981', Medium: '#eab308', High: '#f59e0b', Critical: '#ef4444' };

const DefaultReports = () => {
    const [incidents, setIncidents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        getIncidents().then(({ data }) => setIncidents(data));
    }, []);

    // Statistics Computations
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => (i.status || '').toLowerCase() === 'close').length;
    const criticalOpenIncidents = incidents.filter(i => (i.severity || '').toLowerCase() === 'critical' && (i.status || '').toLowerCase() !== 'close').length;
    const resolutionRate = totalIncidents === 0 ? 0 : Math.round((resolvedIncidents / totalIncidents) * 100);

    // Chart 1: Incidents by Severity
    const severityData = ['Critical', 'High', 'Medium', 'Low'].map(sev => ({
        name: sev,
        count: incidents.filter(i => (i.severity || 'low').toLowerCase() === sev.toLowerCase()).length
    }));

    // Chart 2: Incidents by Status
    const statusData = ['Collect', 'Analyze', 'Respond', 'Close'].map(stat => ({
        name: stat,
        count: incidents.filter(i => (i.status || 'analyze').toLowerCase() === stat.toLowerCase()).length
    }));

    // Chart 3: Avg Response Time by Severity (calculated from MongoDB incidents)
    const responseTimeData = ['Critical', 'High', 'Medium', 'Low'].map(sev => {
        const sevIncidents = incidents.filter(i => (i.severity || 'low').toLowerCase() === sev.toLowerCase());
        
        let avgMinutes = 0;
        if (sevIncidents.length > 0) {
            const totalMinutes = sevIncidents.reduce((acc, curr) => {
                const diffMs = new Date(curr.updatedAt || curr.createdAt) - new Date(curr.createdAt);
                const diffMin = Math.max(0, Math.floor(diffMs / 60000));
                return acc + diffMin;
            }, 0);
            avgMinutes = Math.round(totalMinutes / sevIncidents.length);
        }
        
        return {
            name: sev,
            minutes: avgMinutes
        };
    });

    // Chart 4: 7-Day Incident Volume
    const volumeData = (() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                name: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                dateStr: d.toDateString(),
                volume: 0
            });
        }
        incidents.forEach(inc => {
            const dateVal = inc.createdAt || inc.updatedAt;
            if(!dateVal) return;
            const incDate = new Date(dateVal).toDateString();
            const dayObj = days.find(d => d.dateStr === incDate);
            if (dayObj) {
                dayObj.volume++;
            }
        });
        return days;
    })();

    // Export MongoDB data to CSV
    const exportToCSV = () => {
        if (incidents.length === 0) return;
        const headers = ['ID', 'Title', 'Severity', 'Status', 'Category', 'Affected System', 'Assigned To', 'Opened', 'Last Updated'];
        const rows = incidents.map(inc => [
            `INC-${inc.id || inc._id?.substring(0,6).toUpperCase()}`,
            inc.title || '',
            inc.severity || 'Low',
            inc.status || 'Analyze',
            inc.category || 'N/A',
            inc.affectedSystem || 'N/A',
            inc.assignedTo?.name || 'Unassigned',
            new Date(inc.createdAt).toLocaleString(),
            new Date(inc.updatedAt || inc.createdAt).toLocaleString()
        ]);

        const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `security_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Print PDF
    const handlePrint = () => {
        window.print();
    };

    // Pagination logic
    const itemsPerPage = 10;
    const totalPages = Math.ceil(incidents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedIncidents = incidents.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="dashboard-layout">
            <Sidebar />
            
            <div className="main-content">
                <Header />
                
                <div className="incidents-content">
                    <div className="reports-header-row">
                        <div>
                            <h2 className="reports-page-title">Security Reports</h2>
                            <p className="reports-page-subtitle">Incident analytics and exportable reports</p>
                        </div>
                        <div className="export-actions">
                            <button className="export-btn export-csv" onClick={exportToCSV}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export CSV
                            </button>
                            <button className="export-btn export-pdf" onClick={handlePrint}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                Print PDF
                            </button>
                        </div>
                    </div>

                    <div className="reports-stat-row">
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-blue">{totalIncidents}</h3>
                            <p className="report-stat-label">total incidents</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-cyan">{resolvedIncidents}</h3>
                            <p className="report-stat-label">resolved</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-red">{criticalOpenIncidents}</h3>
                            <p className="report-stat-label">critical open</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-cyan">{resolutionRate}%</h3>
                            <p className="report-stat-label">resolution rate</p>
                        </div>
                    </div>

                    <div className="reports-chart-row">
                        <div className="report-chart-card">
                            <h3 className="report-chart-title">Incidents by Severity</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={severityData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="report-chart-card">
                            <h3 className="report-chart-title">Incidents by Status</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={statusData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                                    <Bar dataKey="count" fill="#00c6ff" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="reports-chart-row">
                        <div className="report-chart-card">
                            <h3 className="report-chart-title">Avg. Response Time by Severity (minutes)</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart layout="vertical" data={responseTimeData} margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
                                    <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                                    <Bar dataKey="minutes" radius={[0, 2, 2, 0]}>
                                        {responseTimeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="report-chart-card">
                            <h3 className="report-chart-title">7-Day Incident Volume</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={volumeData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                                    <Area type="monotone" dataKey="volume" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginTop: '24px' }}>
                        <div className="table-header">
                            <h3 className="table-title">Full Incident Log</h3>
                        </div>
                        <table className="incidents-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>TITLE</th>
                                    <th>SEVERITY</th>
                                    <th>STATUS</th>
                                    <th>CATEGORY</th>
                                    <th>ASSIGNED TO</th>
                                    <th>OPENED</th>
                                    <th>LAST UPDATED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedIncidents.map((inc) => {
                                    const severityClass = (inc.severity || 'low').toLowerCase();
                                    const statusClass = (inc.status || 'analyze').toLowerCase();
                                    
                                    return (
                                        <tr key={inc.id || inc._id} onClick={() => navigate(`/incidents/${inc.id || inc._id}`)}>
                                            <td className="cell-id">INC-{inc.id || inc._id?.substring(0,3).toUpperCase()}</td>
                                            <td>{inc.title}</td>
                                            <td>
                                                <span className={`severity-pill ${severityClass}`}>
                                                    <div className="dot"></div> {inc.severity || 'Low'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-pill status-${statusClass}`}>
                                                    {inc.status || 'Analyze'}
                                                </span>
                                            </td>
                                            <td className="cell-muted">{inc.category || 'N/A'}</td>
                                            <td className="cell-muted">{inc.assignedTo?.name || 'Unassigned'}</td>
                                            <td className="cell-muted">{formatDate(inc.createdAt)}</td>
                                            <td className="updated-time">{formatDate(inc.updatedAt || inc.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                                {incidents.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No incidents found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, incidents.length)} of {incidents.length} entries
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

const Reports = () => {
    const { user } = useAuth();
    if (user?.role === 'SOC Analyst' || user?.role === 'Incident Responder') {
        return <AnalystReports />;
    }
    return <DefaultReports />;
};

export default Reports;
