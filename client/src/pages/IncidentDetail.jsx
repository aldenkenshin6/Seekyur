import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { getIncidents, updateIncident } from '../services/incidentService';
import './Incidents.css';
import './IncidentDetail.css';

const IncidentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [incidentsList, setIncidentsList] = useState([]);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('');
    const { user } = useAuth();

    const fetchIncident = () => {
        getIncidents().then(({ data }) => {
            setIncidentsList(data);
            const found = data.find(i => i._id === id);
            if (found) {
                setIncident(found);
                setNotes(found.resolutionNotes || '');
                setStatus(found.status || 'Analyze');
            }
        }).catch(err => console.error(err));
    };

    useEffect(() => {
        fetchIncident();
    }, [id]);

    const handleUpdate = async () => {
        try {
            const { data } = await updateIncident(id, { status, resolutionNotes: notes });
            setIncident(data);
            alert('Incident updated successfully!');
            fetchIncident();
        } catch (error) {
            console.error('Failed to update incident:', error);
            alert(error.response?.data?.message || 'Failed to update incident.');
        }
    };

    if (!incident) return <div style={{ color: '#fff', padding: '24px' }}>Loading...</div>;

    const originalIndex = incidentsList.findIndex(i => i._id === incident._id);
    const displayId = "INC-" + String(originalIndex !== -1 ? originalIndex + 1 : 1).padStart(3, '0');
    
    const statusSteps = ['Collect', 'Analyze', 'Respond', 'Close'];
    const currentStatusIndex = statusSteps.indexOf(incident.status || 'Analyze');

    const formatDetailDate = (dateStr) => {
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

    const severityClass = (incident.severity || 'low').toLowerCase();
    const statusClass = (incident.status || 'analyze').toLowerCase();

    return (
        <div className="incident-detail-container">
            <Sidebar />
            <div className="incident-detail-content">
                <div className="back-link" onClick={() => navigate('/incidents')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    back to registry
                </div>

                <div className="detail-card">
                    <div className="detail-card-header">
                        <div className="detail-card-header-left">
                            <span className="incident-id-badge">{displayId}</span>
                            <span className="header-dot">.</span>
                            <span className="incident-category-badge">{incident.category || 'Security Alert'}</span>
                        </div>
                        <div className="detail-card-header-right">
                            <span className={`severity-pill ${severityClass}`}>
                                <div className="dot"></div> {incident.severity || 'Low'}
                            </span>
                            <span className={`status-pill status-${statusClass}`}>
                                {incident.status || 'Analyze'}
                            </span>
                        </div>
                    </div>

                    <h1 className="detail-title">{incident.title}</h1>

                    {/* Status Pipeline Flow Component */}
                    <div className="status-pipeline">
                        {statusSteps.map((step, idx) => {
                            const isCompleted = idx < currentStatusIndex;
                            const isActive = idx === currentStatusIndex;
                            
                            return (
                                <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`pipeline-step ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                                        {isCompleted && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                        {step}
                                    </span>
                                    {idx < statusSteps.length - 1 && (
                                        <span className="pipeline-arrow">&gt;</span>
                                    )}
                                </span>
                            );
                        })}
                    </div>

                    {/* 4-column Grid */}
                    <div className="metadata-grid">
                        <div className="metadata-item">
                            <span className="metadata-label">AFFECTED SYSTEM</span>
                            <span className="metadata-value monospace">{incident.affectedSystem || 'system-unknown'}</span>
                        </div>
                        <div className="metadata-item">
                            <span className="metadata-label">ASSIGNED TO</span>
                            <span className="metadata-value">{incident.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                        <div className="metadata-item">
                            <span className="metadata-label">OPENED</span>
                            <span className="metadata-value">{formatDetailDate(incident.createdAt)}</span>
                        </div>
                        <div className="metadata-item">
                            <span className="metadata-label">LAST UPDATED</span>
                            <span className="metadata-value">{formatDetailDate(incident.updatedAt)}</span>
                        </div>
                    </div>

                    <div className="detail-section-label">DESCRIPTION</div>
                    <div className="detail-section-content">{incident.description}</div>
                </div>

                {/* Update Incident Card */}
                {user?.role !== 'Viewer' && (
                    <div className="update-card">
                        <h3 className="update-card-title">Update Incident</h3>
                        
                        <div className="form-group">
                            <label>STATUS</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                {statusSteps.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>RESOLUTION NOTES</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4} 
                                placeholder="provide resolution details..."
                            />
                        </div>

                        <button className="btn-save-changes" onClick={handleUpdate}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IncidentDetail;