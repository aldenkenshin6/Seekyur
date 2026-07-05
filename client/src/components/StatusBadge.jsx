const colors = {
    Collect: '#00c6ff',
    Analyze: '#f0a500',
    Respond: '#ff6b00',
    Close: '#00ff88'
    };

    const StatusBadge = ({ status }) => (
    <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
        background: colors[status] + '22', color: colors[status],
        border: `1px solid ${colors[status]}44`
    }}>
        {status}
    </span>
);

export default StatusBadge;