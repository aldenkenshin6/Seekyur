import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getIncidents, updateIncident } from '../services/incidentService';
import '../pages/Incidents.css';
import '../pages/IncidentDetail.css';

const IncidentDetailModal = ({ incidentId, onClose, onUpdateSuccess }) => {
    const [incident, setIncident] = useState(null);
    const [incidentsList, setIncidentsList] = useState([]);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('');
    const { user } = useAuth();

    const fetchIncident = () => {
        getIncidents().then(({ data }) => {
            setIncidentsList(data);
            const found = data.find(i => i._id === incidentId);
            if (found) {
                setIncident(found);
                setNotes(found.resolutionNotes || '');
                setStatus(found.status || 'Analyze');
            }
        }).catch(err => console.error(err));
    };

    useEffect(() => {
        if (incidentId) {
            fetchIncident();
        }
    }, [incidentId]);

    const handleUpdate = async () => {
        try {
            const { data } = await updateIncident(incidentId, { status, resolutionNotes: notes });
            setIncident(data);
            alert('Incident updated successfully!');
            fetchIncident();
            if (onUpdateSuccess) {
                onUpdateSuccess();
            }
        } catch (error) {
            console.error('Failed to update incident:', error);
            alert(error.response?.data?.message || 'Failed to update incident.');
        }
    };

    if (!incident) return null;

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
        <div className="incident-modal-overlay" onClick={onClose}>
            <div className="incident-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="incident-modal-close" onClick={onClose}>&times;</button>

                <div className="detail-card" style={{ marginBottom: user?.role === 'Viewer' ? 0 : '24px', boxShadow: 'none', border: 'none', padding: 0, background: 'transparent' }}>
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

                    <h1 className="detail-title" style={{ fontSize: '22px', marginBottom: '20px' }}>{incident.title}</h1>

                    {/* Status Pipeline Flow Component */}
                    <div className="status-pipeline" style={{ marginBottom: '24px' }}>
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
                    <div className="metadata-grid" style={{ padding: '16px 0', margin: '20px 0' }}>
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
                    <div className="detail-section-content" style={{ fontSize: '13px', color: '#cbd5e1' }}>{incident.description}</div>
                </div>

                {/* Update Incident Card */}
                {user?.role !== 'Viewer' && (
                    <div className="update-card" style={{ boxShadow: 'none', border: '1px solid #1a2233', background: '#080c14', padding: '24px' }}>
                        <h3 className="update-card-title" style={{ fontSize: '14px', marginBottom: '16px' }}>Update Incident</h3>
                        
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label>STATUS</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                {statusSteps.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label>RESOLUTION NOTES</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3} 
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

export default IncidentDetailModal;
