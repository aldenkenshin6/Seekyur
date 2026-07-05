const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Alert = require('../models/Alert');

const AuthLog = require('../models/AuthLog');

// Load environment variables from the parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });
mongoose.connect(process.env.MONGO_URI);

const incidents = [
    { title: 'Brute Force Login Attempt', description: 'Multiple failed login attempts detected', severity: 'High', status: 'Respond' },
    { title: 'Unauthorized Access to Admin Panel', description: 'Unknown user accessed admin panel', severity: 'Critical', status: 'Analyze' },
    { title: 'Unusual Traffic Spike Detected', description: 'Network traffic increased by 300%', severity: 'Medium', status: 'Collect' },
    { title: 'Invalid JWT Token Used Repeatedly', description: 'Expired token being used repeatedly', severity: 'Low', status: 'Close' },
    { title: 'SQL Injection Attempt on Login Form', description: 'Malicious SQL detected on login form', severity: 'Critical', status: 'Respond' },
];

const baseTime = Date.now();
const alerts = [
    { title: 'Port scan detected from external host on 22 ports', type: 'PORT SCAN', description: 'Port scan detected from external host on 22 ports', severity: 'Medium', source: 'web-app-prod', sourceIp: '10.0.0.45', isRead: false, createdAt: new Date(baseTime - 20 * 60 * 1000) },
    { title: 'Multiple authentication failures on SSH service', type: 'FAILED AUTH', description: 'Multiple authentication failures on SSH service', severity: 'High', source: 'auth-service', sourceIp: '192.168.1.102', isRead: false, createdAt: new Date(baseTime - 18 * 60 * 1000) },
    { title: 'Unusual DNS query volume to suspicious domain', type: 'DNS ANOMALY', description: 'Unusual DNS query volume to suspicious domain', severity: 'Medium', source: 'db-server-01', sourceIp: '172.16.0.8', isRead: false, createdAt: new Date(baseTime - 16 * 60 * 1000) },
    { title: 'unauthorized file modification detected in /etc', type: 'FILE CHANGE', description: 'unauthorized file modification detected in /etc', severity: 'Low', source: 'api-gateway', sourceIp: '203.45.78.91', isRead: true, createdAt: new Date(baseTime - 14 * 60 * 1000) },
    { title: 'Known malware signature detected in process memory', type: 'MALWARE SIG', description: 'Known malware signature detected in process memory', severity: 'Critical', source: 'admin-panel', sourceIp: '87.120.33.15', isRead: false, createdAt: new Date(baseTime - 12 * 60 * 1000) },
    { title: 'Potential data exfiltration to external IP on 4444', type: 'EXFIL DETECT', description: 'Potential data exfiltration to external IP on 4444', severity: 'Critical', source: 'linux-prod-03', sourceIp: '45.33.72.101', isRead: false, createdAt: new Date(baseTime - 10 * 60 * 1000) },
    { title: 'Privilege escalation attempt via SUID binary', type: 'PRIV ESCALATION', description: 'Privilege escalation attempt via SUID binary', severity: 'High', source: 'WS-HR-12', sourceIp: '10.0.1.23', isRead: false, createdAt: new Date(baseTime - 8 * 60 * 1000) },
    { title: 'SSL certificate validation failure on internal service', type: 'CERT ERROR', description: 'SSL certificate validation failure on internal service', severity: 'Low', source: 'mail-server', sourceIp: '192.168.2.55', isRead: true, createdAt: new Date(baseTime - 6 * 60 * 1000) },
    { title: 'API rate limit exceeded - possible enumeration attack', type: 'API ABUSE', description: 'API rate limit exceeded - possible enumeration attack', severity: 'Medium', source: 'web-app-prod', sourceIp: '10.0.0.45', isRead: false, createdAt: new Date(baseTime - 4 * 60 * 1000) },
    { title: 'Session token reuse detected from different geolocation', type: 'SESSION HIJACK', description: 'Session token reuse detected from different geolocation', severity: 'High', source: 'auth-service', sourceIp: '192.168.1.102', isRead: false, createdAt: new Date(baseTime - 2 * 60 * 1000) },
];

const authLogs = [
    { result: 'Success', event: 'Login', userEmail: 'cto@company.com', ipAddress: '203.45.78.12', location: 'Singapore, SG', sessionToken: 'eyJhbGc...9xWqG', userAgent: 'Chrome 124 / Windows 11', timestamp: new Date(baseTime - 100 * 60000) },
    { result: 'Success', event: 'Login', userEmail: 'alex@seekyur.io', ipAddress: '192.168.1.10', location: 'New York, US', sessionToken: 'eyJhbGc...7pRnW', userAgent: 'Chrome 124 / macOS 14', timestamp: new Date(baseTime - 95 * 60000) },
    { result: 'Success', event: 'Login', userEmail: 'maya@seekyur.io', ipAddress: '192.168.1.22', location: 'New York, US', sessionToken: 'eyJhbGc...2mXVt', userAgent: 'Firefox 125 / Ubuntu 22.04', timestamp: new Date(baseTime - 90 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'admin@company.com', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Invalid password', timestamp: new Date(baseTime - 85 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'admin@company.com', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Invalid password', timestamp: new Date(baseTime - 84 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'admin@company.com', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Invalid password', timestamp: new Date(baseTime - 83 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'root@company.com', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Account does not exist', timestamp: new Date(baseTime - 82 * 60000) },
    { result: 'Success', event: 'Login', userEmail: 'jordan@seekyur.io', ipAddress: '10.0.0.88', location: 'New York, US', sessionToken: 'eyJhbGc...9nbWp', userAgent: 'Safari 17 / macOS 14', timestamp: new Date(baseTime - 70 * 60000) },
    { result: 'Success', event: 'Token Refresh', userEmail: 'jordan@seekyur.io', ipAddress: '10.0.0.88', location: 'New York, US', sessionToken: 'eyJhbGc...9nbWp', userAgent: 'Safari 17 / macOS 14', timestamp: new Date(baseTime - 60 * 60000) },
    { result: 'Success', event: 'Login', userEmail: 'sam@seekyur.io', ipAddress: '10.0.0.51', location: 'New York, US', sessionToken: 'eyJhbGc...4HQMn', userAgent: 'Edge 124 / Windows 11', timestamp: new Date(baseTime - 50 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'devops@company.com', ipAddress: '87.120.45.23', location: 'MOSCOW, RU', sessionToken: '-', userAgent: 'curl/7.88.1', failureReason: 'IP blocked by policy', timestamp: new Date(baseTime - 40 * 60000) },
    
    // Remaining logs to reach exactly 20 total logs (10 Success, 10 Failed, 6 Failed IPs)
    { result: 'Success', event: 'Login', userEmail: 'casey@seekyur.io', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: 'eyJhbGc...3dKlw', userAgent: 'Chrome 124 / Windows 11', timestamp: new Date(baseTime - 35 * 60000) },
    { result: 'Success', event: 'Login', userEmail: 'jordan@seekyur.io', ipAddress: '10.0.0.88', location: 'New York, US', sessionToken: 'eyJhbGc...1pOmW', userAgent: 'Chrome 124 / macOS 14', timestamp: new Date(baseTime - 30 * 60000) },
    { result: 'Success', event: 'Token Refresh', userEmail: 'maya@seekyur.io', ipAddress: '192.168.1.22', location: 'New York, US', sessionToken: 'eyJhbGc...2mXVt', userAgent: 'Firefox 125 / Ubuntu 22.04', timestamp: new Date(baseTime - 25 * 60000) },
    { result: 'Success', event: 'Token Refresh', userEmail: 'alex@seekyur.io', ipAddress: '192.168.1.10', location: 'New York, US', sessionToken: 'eyJhbGc...7pRnW', userAgent: 'Chrome 124 / macOS 14', timestamp: new Date(baseTime - 20 * 60000) },
    
    { result: 'Failed', event: 'Login', userEmail: 'unknown@company.com', ipAddress: '10.0.0.99', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Account does not exist', timestamp: new Date(baseTime - 18 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'test@company.com', ipAddress: '192.168.2.11', location: 'New York, US', sessionToken: '-', userAgent: 'Mozilla/5.0 / Windows 11', failureReason: 'Invalid password', timestamp: new Date(baseTime - 16 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'test@company.com', ipAddress: '172.16.1.5', location: 'Chicago, US', sessionToken: '-', userAgent: 'Mozilla/5.0 / macOS 14', failureReason: 'Invalid password', timestamp: new Date(baseTime - 14 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'hacker@company.com', ipAddress: '203.45.78.3', location: 'Beijing, CN', sessionToken: '-', userAgent: 'curl/7.88.1', failureReason: 'IP blocked by policy', timestamp: new Date(baseTime - 12 * 60000) },
    { result: 'Failed', event: 'Login', userEmail: 'admin@company.com', ipAddress: '192.168.1.45', location: 'New York, US', sessionToken: '-', userAgent: 'Python-requests/2.31.0', failureReason: 'Invalid password', timestamp: new Date(baseTime - 10 * 60000) },
];

const demoPassword = 'password123';

const demoUsers = [
    { name: 'Alex Chen', username: 'admin', email: 'alex@seekyur.io', role: 'Admin', ipAddress: '192.168.1.10', macAddress: '00:1B:44:11:3A:B7', lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { name: 'Maya Rodriguez', username: 'analyst', email: 'maya@seekyur.io', role: 'SOC Analyst', ipAddress: '192.168.1.42', macAddress: '00:1B:44:11:3A:B8', lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { name: 'Jordan Kim', username: 'responder', email: 'jordan@seekyur.io', role: 'Incident Responder', ipAddress: '192.168.1.115', macAddress: '00:1B:44:11:3A:B9', lastLogin: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    { name: 'Sam Torres', username: 'viewer', email: 'sam@seekyur.io', role: 'Viewer', ipAddress: '192.168.1.201', macAddress: '00:1B:44:11:3A:C0', lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { name: 'Casey Nguyen', username: 'analyst2', email: 'casey@seekyur.io', role: 'SOC Analyst', ipAddress: '192.168.1.45', macAddress: '00:1B:44:11:3A:C1', lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), isActive: false },
];

const seedDB = async () => {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    await Incident.deleteMany();
    await User.deleteMany();
    await Alert.deleteMany();
    await AuthLog.deleteMany();

    const users = await User.insertMany(
        demoUsers.map((user) => ({
            ...user,
            password: hashedPassword,
            isActive: user.isActive !== undefined ? user.isActive : true,
        }))
    );

    const jordan = users.find(u => u.name === 'Jordan Kim');
    const maya = users.find(u => u.name === 'Maya Rodriguez');

    // 7 main incidents from 272 days ago matching the mockup Registry
    const seedIncidents = [
        { title: 'Brute Force Login Attempt', description: 'Multiple failed login attempts detected', severity: 'High', status: 'Respond', category: 'Authentication Attack', affectedSystem: 'auth-service-prod', assignedTo: jordan?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'Unauthorized Access to Admin Panel', description: 'Unknown user accessed admin panel', severity: 'Critical', status: 'Analyze', category: 'Unauthorized Access', affectedSystem: 'admin-panel-prod', assignedTo: maya?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'Unusual Traffic Spike Detected', description: 'Network traffic increased by 300%', severity: 'Medium', status: 'Collect', category: 'Network Anomaly', affectedSystem: 'db-server-02', assignedTo: maya?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'Invalid JWT Token Used Repeatedly', description: 'Expired token being used repeatedly', severity: 'Low', status: 'Close', category: 'Authentication Error', affectedSystem: 'api-gateway-prod', assignedTo: jordan?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'SQL Injection Attempt on Login Form', description: 'Malicious SQL detected on login form', severity: 'Critical', status: 'Respond', category: 'Injection Attack', affectedSystem: 'web-app-prod', assignedTo: jordan?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'Malware Signature on Endpoint', description: 'Known malware signature detected on end-point device memory', severity: 'High', status: 'Analyze', category: 'Malware', affectedSystem: 'WS-FINANCE-07', assignedTo: maya?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
        { title: 'Privilege Escalation via Sudo Misconfiguration', description: 'User executed unauthorized sudo command', severity: 'High', status: 'Close', category: 'Privilege Escalation', affectedSystem: 'linux-prod-04', assignedTo: jordan?._id, createdAt: new Date(Date.now() - 272*24*60*60*1000), updatedAt: new Date(Date.now() - 272*24*60*60*1000) },
    ];

    // Seed historical incidents over the last 7 days to match mockup trend waves
    const baseWaveValues = [
        { Critical: 1, High: 3, Medium: 2, Low: 4 },
        { Critical: 2, High: 2, Medium: 4, Low: 3 },
        { Critical: 1, High: 4, Medium: 3, Low: 2 },
        { Critical: 3, High: 3, Medium: 5, Low: 4 },
        { Critical: 2, High: 5, Medium: 4, Low: 3 },
        { Critical: 3, High: 4, Medium: 6, Low: 5 },
        { Critical: 2, High: 2, Medium: 3, Low: 2 }
    ];

    const historicalIncidents = [];
    baseWaveValues.forEach((wave, idx) => {
        const offsetDays = 6 - idx;
        const date = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000);
        
        // Seed Critical incidents
        for (let i = 0; i < wave.Critical; i++) {
            historicalIncidents.push({
                title: 'Malicious threat signature alert detected',
                description: 'Known pattern matches observed inside system logs',
                severity: 'Critical',
                status: 'Close',
                assignedTo: maya?._id,
                createdAt: date,
                updatedAt: date
            });
        }
        // Seed High incidents
        for (let i = 0; i < wave.High; i++) {
            historicalIncidents.push({
                title: 'High risk privilege anomaly recorded',
                description: 'User initiated high-severity administrative action',
                severity: 'High',
                status: 'Close',
                assignedTo: jordan?._id,
                createdAt: date,
                updatedAt: date
            });
        }
        // Seed Medium incidents
        for (let i = 0; i < wave.Medium; i++) {
            historicalIncidents.push({
                title: 'Unusual DNS behavior identified',
                description: 'Outbound network queries exceeded regular baseline',
                severity: 'Medium',
                status: 'Close',
                assignedTo: maya?._id,
                createdAt: date,
                updatedAt: date
            });
        }
        // Seed Low incidents
        for (let i = 0; i < wave.Low; i++) {
            historicalIncidents.push({
                title: 'SSL connection validation failure',
                description: 'Sub-system handshake failed during standard handshake',
                severity: 'Low',
                status: 'Close',
                assignedTo: jordan?._id,
                createdAt: date,
                updatedAt: date
            });
        }
    });

    await Incident.insertMany([...seedIncidents, ...historicalIncidents]);
    await Alert.insertMany(alerts);
    await AuthLog.insertMany(authLogs);

    console.log('Demo users seeded with password:', demoPassword);
    console.log('Admin:', 'alex@seekyur.io (or username: admin)');
    console.log('SOC Analyst:', 'maya@seekyur.io (or username: analyst)');
    console.log('Incident Responder:', 'jordan@seekyur.io (or username: responder)');
    console.log('Viewer:', 'sam@seekyur.io (or username: viewer)');
    console.log('Database seeded!');
    process.exit();
};

seedDB();