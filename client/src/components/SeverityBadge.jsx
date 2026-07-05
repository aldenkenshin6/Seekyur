const colors = {
    Low: '#00c6ff',
    Medium: '#f0a500',
    High: '#ff6b00',
    Critical: '#ff4d4d'
    };

    const SeverityBadge = ({ severity }) => (
    <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
        background: colors[severity] + '22', color: colors[severity],
        border: `1px solid ${colors[severity]}44`
    }}>
        {severity}
    </span>
);

export default SeverityBadge;