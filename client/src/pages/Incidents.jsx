import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getIncidents, createIncident } from '../services/incidentService';
import { getUsers } from '../services/userService';
import IncidentDetailModal from '../components/IncidentDetailModal';
import './Dashboard.css';
import './Incidents.css';

import AnalystIncidents from './Analyst/Incidents';

const DefaultIncidents = () => {
    const [incidents, setIncidents] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [filter, setFilter] = useState({ severity: '', status: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [viewIncidentId, setViewIncidentId] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', severity: 'Medium', assignedTo: '', category: '', affectedSystem: '' });
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        getIncidents().then(({ data }) => setIncidents(data));
        getUsers().then(({ data }) => setUsersList(data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    const filtered = incidents.filter(i =>
        (!filter.severity || i.severity === filter.severity) &&
        (!filter.status || i.status === filter.status) &&
        (
            !searchTerm ||
            [i.id, i._id, i.title, i.description, i.severity, i.status, i.category, i.affectedSystem, i.assignedTo]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        )
    );

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedIncidents = filtered.slice(startIndex, startIndex + itemsPerPage);

    const handleCreate = async () => {
        try {
            const { data } = await createIncident(form);
            setIncidents([data, ...incidents]);
            setShowForm(false);
            setForm({ title: '', description: '', severity: 'Medium', assignedTo: '', category: '', affectedSystem: '' });
        } catch (error) {
            console.error('Failed to create incident:', error);
            alert(error.response?.data?.message || 'Failed to create incident. Please make sure all required fields are filled.');
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="main-content">
                <Header />

                <div className="incidents-content">
                    <div className="incidents-header-row">
                        <div>
                            <h2 className="incidents-page-title">Incident Registry</h2>
                            <p className="incidents-page-subtitle">{filtered.length} of {incidents.length} incidents</p>
                        </div>

                        {user?.role !== 'Viewer' && (
                            <button className="new-incident-btn" onClick={() => setShowForm(true)}>
                                + New Incident
                            </button>
                        )}
                    </div>

                    <div className="filter-bar">
                        <div className="search-container">
                            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by title, desc, system, etc..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="filter-select" onChange={(e) => setFilter({ ...filter, severity: e.target.value })}>
                            <option value="">All severities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <select className="filter-select" onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                            <option value="">All statuses</option>
                            <option value="Respond">Respond</option>
                            <option value="Analyze">Analyze</option>
                            <option value="Collect">Collect</option>
                            <option value="Close">Close</option>
                        </select>
                    </div>

                    <div className="incidents-table-container">
                        <table className="incidents-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>TITLE</th>
                                    <th>SEVERITY</th>
                                    <th>STATUS</th>
                                    <th>CATEGORY</th>
                                    <th>AFFECTED SYSTEM</th>
                                    <th>ASSIGNED TO</th>
                                    <th>RESOLUTION NOTES</th>
                                    <th>UPDATED</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedIncidents.map((inc) => {
                                    const originalIndex = incidents.findIndex(i => i._id === inc._id);
                                    const displayId = "INC-" + String(originalIndex !== -1 ? originalIndex + 1 : 1).padStart(3, '0');
                                    const daysAgo = inc.updatedAt ? Math.floor((new Date() - new Date(inc.updatedAt)) / (1000 * 60 * 60 * 24)) : 0;
                                    const timeStr = daysAgo > 0 ? `${daysAgo}d ago` : 'Today';
                                    const severityClass = (inc.severity || 'low').toLowerCase();
                                    const statusClass = (inc.status || 'analyze').toLowerCase();

                                    return (
                                        <tr key={inc.id || inc._id} onClick={() => setViewIncidentId(inc._id)}>
                                            <td className="cell-id">{displayId}</td>
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
                                            <td className="cell-muted" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{inc.affectedSystem || 'system-unknown'}</td>
                                            <td className="cell-muted">{inc.assignedTo?.name || 'Unassigned'}</td>
                                            <td className="cell-muted" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {inc.resolutionNotes || 'None'}
                                            </td>
                                            <td className="updated-time">{timeStr}</td>
                                            <td>
                                                <button
                                                    className="view-link-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewIncidentId(inc._id);
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                    view
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No incidents found matching criteria</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries
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

                {/* Create Form Modal */}
                {showForm && user?.role !== 'Viewer' && (
                    <div className="form-overlay" onClick={() => setShowForm(false)}>
                        <div className="form-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Create New Incident</h3>
                                <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                            </div>

                            <div className="form-group">
                                <label>TITLE *</label>
                                <input
                                    placeholder="incident title"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>DESCRIPTION</label>
                                <textarea
                                    placeholder="describe the incident..."
                                    value={form.description}
                                    rows="4"
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>SEVERITY</label>
                                    <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                                <div className="form-group flex-1">
                                    <label>ASSIGN TO</label>
                                    <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                                        <option value="">Unassigned</option>
                                        {usersList.filter(u => u.role === 'Incident Responder').map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>CATEGORY</label>
                                    <input
                                        placeholder="e.g. Malware"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label>AFFECTED SYSTEM</label>
                                    <input
                                        placeholder="e.g. web-app-prod"
                                        value={form.affectedSystem}
                                        onChange={(e) => setForm({ ...form, affectedSystem: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button className="btn-cancel" onClick={() => setShowForm(false)}>cancel</button>
                                <button className="btn-submit" onClick={handleCreate}>create incident</button>
                            </div>
                        </div>
                    </div>
                )}

                {viewIncidentId && (
                    <IncidentDetailModal
                        incidentId={viewIncidentId}
                        onClose={() => setViewIncidentId(null)}
                        onUpdateSuccess={() => {
                            getIncidents().then(({ data }) => setIncidents(data));
                        }}
                    />
                )}
            </div>
        </div>
    );
};

const Incidents = () => {
    const { user } = useAuth();
    if (user?.role === 'SOC Analyst' || user?.role === 'Incident Responder') {
        return <AnalystIncidents />;
    }
    return <DefaultIncidents />;
};

export default Incidents;