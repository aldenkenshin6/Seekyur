import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { getIncidents } from '../../services/incidentService';
import { formatDate } from '../../utils/formatDate';
import IncidentDetailModal from '../../components/IncidentDetailModal';
import '../Dashboard.css';
import './Reports.css';

const SEVERITY_COLORS = { Low: '#10b981', Medium: '#eab308', High: '#f59e0b', Critical: '#ef4444' };

const AnalystReports = () => {
    const [incidents, setIncidents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modal state for viewing incident details
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadIncidents = () => {
        getIncidents().then(({ data }) => setIncidents(data));
    };

    useEffect(() => {
        loadIncidents();
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

    // Chart 3: Avg Response Time by Severity (minutes)
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

    // Chart 4: 7-Day Incident Volume (split by Critical, High, Medium severities for multi-line view)
    const volumeData = (() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                name: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                dateStr: d.toDateString(),
                critical: 0,
                high: 0,
                medium: 0
            });
        }
        incidents.forEach(inc => {
            const dateVal = inc.createdAt || inc.updatedAt;
            if(!dateVal) return;
            const incDate = new Date(dateVal).toDateString();
            const dayObj = days.find(d => d.dateStr === incDate);
            if (dayObj) {
                const sev = (inc.severity || 'low').toLowerCase();
                if (sev === 'critical') dayObj.critical++;
                else if (sev === 'high') dayObj.high++;
                else if (sev === 'medium') dayObj.medium++;
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
        const doc = new jsPDF();
        
        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // #0f172a
        doc.text("SeekYur Security Report", 20, 25);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // #64748b
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 32);
        
        // Line separator
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.line(20, 36, 190, 36);
        
        // Statistics section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Incident Summary Statistics", 20, 48);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Total Incidents: ${totalIncidents}`, 25, 58);
        doc.text(`Resolved Incidents: ${resolvedIncidents}`, 25, 66);
        doc.text(`Critical Open Incidents: ${criticalOpenIncidents}`, 25, 74);
        doc.text(`SLA Resolution Rate: ${resolutionRate}%`, 25, 82);
        
        // Table section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Full Incident Logs", 20, 96);
        
        // Table headers
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(15, 23, 42); // Header background
        doc.rect(20, 102, 170, 8, "F");
        
        doc.text("ID", 22, 107);
        doc.text("Title", 45, 107);
        doc.text("Severity", 110, 107);
        doc.text("Status", 135, 107);
        doc.text("Opened", 160, 107);
        
        // Table rows
        doc.setTextColor(51, 65, 85); // Row text color
        doc.setFont("helvetica", "normal");
        
        let yPos = 116;
        incidents.forEach((inc) => {
            if (yPos > 275) {
                doc.addPage();
                // Sub-header on new page
                doc.setFont("helvetica", "bold");
                doc.setFillColor(15, 23, 42);
                doc.rect(20, 20, 170, 8, "F");
                doc.setTextColor(255, 255, 255);
                doc.text("ID", 22, 25);
                doc.text("Title", 45, 25);
                doc.text("Severity", 110, 25);
                doc.text("Status", 135, 25);
                doc.text("Opened", 160, 25);
                
                doc.setFont("helvetica", "normal");
                doc.setTextColor(51, 65, 85);
                yPos = 34;
            }
            
            const incId = `INC-${inc.id || inc._id?.substring(0,3).toUpperCase()}`;
            const titleVal = inc.title ? (inc.title.length > 30 ? inc.title.substring(0, 28) + "..." : inc.title) : 'N/A';
            const severityVal = inc.severity || 'Low';
            const statusVal = inc.status || 'Analyze';
            const dateVal = new Date(inc.createdAt).toLocaleDateString();
            
            doc.text(incId, 22, yPos);
            doc.text(titleVal, 45, yPos);
            doc.text(severityVal, 110, yPos);
            doc.text(statusVal, 135, yPos);
            doc.text(dateVal, 160, yPos);
            
            // Draw row border
            doc.setDrawColor(241, 245, 249);
            doc.line(20, yPos + 3, 190, yPos + 3);
            
            yPos += 10;
        });
        
        doc.save(`seekyur_security_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleRowClick = (incId) => {
        setSelectedIncidentId(incId);
        setIsModalOpen(true);
    };

    // Pagination logic
    const itemsPerPage = 10;
    const totalPages = Math.ceil(incidents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedIncidents = incidents.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="dashboard-layout analyst-theme">
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
                            <p className="report-stat-label">Total Incidents</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-cyan">{resolvedIncidents}</h3>
                            <p className="report-stat-label">Resolved</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-red">{criticalOpenIncidents}</h3>
                            <p className="report-stat-label">Critical Open</p>
                        </div>
                        <div className="report-stat-card">
                            <h3 className="report-stat-value val-cyan">{resolutionRate}%</h3>
                            <p className="report-stat-label">Resolution Rate</p>
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
                                <LineChart data={volumeData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                                    <Line type="monotone" dataKey="critical" stroke="#ff3b5c" strokeWidth={2} dot={false} name="Critical" />
                                    <Line type="monotone" dataKey="high" stroke="#ff7b00" strokeWidth={2} dot={false} name="High" />
                                    <Line type="monotone" dataKey="medium" stroke="#ffc400" strokeWidth={2} dot={false} name="Medium" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="table-container">
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
                                        <tr key={inc.id || inc._id} onClick={() => handleRowClick(inc.id || inc._id)}>
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
                            <div className="pagination-container" style={{ marginTop: '16px' }}>
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

            {isModalOpen && (
                <IncidentDetailModal 
                    incidentId={selectedIncidentId} 
                    onClose={() => {
                        setIsModalOpen(false);
                        loadIncidents();
                    }}
                />
            )}
        </div>
    );
};

export default AnalystReports;
