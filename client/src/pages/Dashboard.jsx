import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AlertFeed from '../components/AlertFeed';
import { getIncidents } from '../services/incidentService';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import AnalystDashboard from './Analyst/Dashboard';

const SEVERITY_COLORS = { Low: '#10b981', Medium: '#eab308', High: '#f59e0b', Critical: '#ef4444' };

const DefaultDashboard = () => {
    const [incidents, setIncidents] = useState([]);
    const { alerts } = useNotifications();

    useEffect(() => {
        getIncidents().then(({ data }) => setIncidents(data));
    }, []);

    // Generate dynamic 7-day trend data from actual incidents
    const trendData = (() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                name: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                dateStr: d.toDateString(),
                Critical: 0, High: 0, Medium: 0, Low: 0
            });
        }
        incidents.forEach(inc => {
            const dateVal = inc.createdAt || inc.updatedAt;
            if(!dateVal) return;
            const incDate = new Date(dateVal).toDateString();
            const dayObj = days.find(d => d.dateStr === incDate);
            if (dayObj && dayObj[inc.severity] !== undefined) {
                dayObj[inc.severity]++;
            }
        });
        return days;
    })();

    // Generate dynamic volume data for today
    const volumeData = (() => {
        const hours = [
            { time: '00:00', volume: 0 }, { time: '04:00', volume: 0 },
            { time: '08:00', volume: 0 }, { time: '12:00', volume: 0 },
            { time: '16:00', volume: 0 }, { time: '20:00', volume: 0 },
            { time: '23:59', volume: 0 }
        ];
        const today = new Date().toDateString();
        alerts.forEach(alert => {
            const dateVal = alert.createdAt;
            if(!dateVal) return;
            const alertDate = new Date(dateVal);
            if (alertDate.toDateString() === today) {
                const hour = alertDate.getHours();
                if (hour < 4) hours[0].volume++;
                else if (hour < 8) hours[1].volume++;
                else if (hour < 12) hours[2].volume++;
                else if (hour < 16) hours[3].volume++;
                else if (hour < 20) hours[4].volume++;
                else hours[5].volume++;
            }
        });
        return hours;
    })();

    const severityData = ['Low', 'Medium', 'High', 'Critical'].map(s => ({
        name: s, value: incidents.filter(i => i.severity === s).length
    })).filter(d => d.value > 0);

    const statCards = [
        { 
            label: 'Total incidents', 
            sublabel: 'All time', 
            value: incidents.length, 
            colorClass: 'blue',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        },
        { 
            label: 'Active incidents', 
            sublabel: 'Requires attention', 
            value: incidents.filter(i => i.status !== 'Close').length, 
            colorClass: 'orange',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        },
        { 
            label: 'Critical severity', 
            sublabel: 'Immediate response', 
            value: incidents.filter(i => i.severity === 'Critical').length, 
            colorClass: 'red',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        },
        { 
            label: 'Closed Today', 
            sublabel: 'Resolved', 
            value: incidents.filter(i => i.status === 'Close').length, 
            colorClass: 'green',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        },
    ];

    return (
        <div className="dashboard-layout">
            <Sidebar />
            
            <div className="main-content">
                <Header />

                <div className="dashboard-content">
                    <div className="page-header">
                        <h2 className="page-title">Security Overview</h2>
                        <p className="page-subtitle">Real-time threat intelligence dashboard • Updated {new Date().toLocaleTimeString()}</p>
                    </div>

                    {/* Stat Cards */}
                    <div className="stat-cards-grid">
                        {statCards.map((card) => (
                            <div key={card.label} className={`stat-card ${card.colorClass}`}>
                                <div className="stat-icon">{card.icon}</div>
                                <div className="stat-details">
                                    <h3 className="stat-value">{card.value}</h3>
                                    <p className="stat-label">{card.label}</p>
                                    <p className="stat-sublabel">{card.sublabel}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Top Charts Row */}
                    <div className="charts-grid-top">
                        {/* 7-Day Trend Line Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">7-Day Incident Trend</h3>
                                <div className="chart-legend">
                                    <div className="legend-item"><span className="legend-dot" style={{background: SEVERITY_COLORS.Critical}}></span> Critical</div>
                                    <div className="legend-item"><span className="legend-dot" style={{background: SEVERITY_COLORS.High}}></span> High</div>
                                    <div className="legend-item"><span className="legend-dot" style={{background: SEVERITY_COLORS.Medium}}></span> Medium</div>
                                    <div className="legend-item"><span className="legend-dot" style={{background: SEVERITY_COLORS.Low}}></span> Low</div>
                                </div>
                            </div>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', color: '#e2e8f0' }} />
                                        <Line type="monotone" dataKey="Low" stroke={SEVERITY_COLORS.Low} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Medium" stroke={SEVERITY_COLORS.Medium} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="High" stroke={SEVERITY_COLORS.High} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Critical" stroke={SEVERITY_COLORS.Critical} strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Severity Breakdown Donut Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Severity Breakdown</h3>
                            </div>
                            <div className="chart-body" style={{ display: 'flex', flexDirection: 'column' }}>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" stroke="none" paddingAngle={5}>
                                            {severityData.map((entry) => (
                                                <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 10px' }}>
                                    {severityData.map(entry => (
                                        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="legend-item"><span className="legend-dot" style={{background: SEVERITY_COLORS[entry.name]}}></span> {entry.name}</div>
                                            <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}>{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Charts Row */}
                    <div className="charts-grid-bottom">
                        {/* Alert Volume Area Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Alert Volume - Today (24h)</h3>
                            </div>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={volumeData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00c6ff" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#00c6ff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={{stroke: '#1e293b'}} />
                                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', color: '#e2e8f0' }} />
                                        <Area type="monotone" dataKey="volume" stroke="#00c6ff" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Live Alert Feed Component */}
                        <AlertFeed alerts={alerts} />
                    </div>

                    {/* Recent Incidents Table */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Recent Incidents</h3>
                            <a href="/incidents" className="view-all-link">View all &gt;</a>
                        </div>
                        <table className="incidents-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>TITLE</th>
                                    <th>SEVERITY</th>
                                    <th>STATUS</th>
                                    <th>ASSIGNED TO</th>
                                    <th>UPDATED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.slice(0, 5).map(inc => {
                                    const daysAgo = inc.updatedAt ? Math.floor((new Date() - new Date(inc.updatedAt)) / (1000 * 60 * 60 * 24)) : 0;
                                    const timeStr = daysAgo > 0 ? `${daysAgo}d ago` : 'Today';
                                    return (
                                    <tr key={inc.id || inc._id}>
                                        <td className="cell-id">{inc.id || inc._id?.substring(0,6).toUpperCase()}</td>
                                        <td>{inc.title}</td>
                                        <td>
                                            <span className={`severity-pill ${inc.severity.toLowerCase()}`}>
                                                <div className="dot"></div> {inc.severity}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-pill status-${inc.status.toLowerCase()}`}>
                                                {inc.status}
                                            </span>
                                        </td>
                                        <td>{inc.assignedTo?.name || 'Unassigned'}</td>
                                        <td className="updated-time">{timeStr}</td>
                                    </tr>
                                )})}
                                {incidents.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>No incidents found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    if (user?.role === 'SOC Analyst' || user?.role === 'Incident Responder') {
        return <AnalystDashboard />;
    }
    return <DefaultDashboard />;
};

export default Dashboard;