const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const alertRoutes = require('./routes/alertRoutes');
const userRoutes = require('./routes/userRoutes');
const authLogRoutes = require('./routes/authLogRoutes');
const socketHandler = require('./socket/socketHandler');

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const RequestLog = require('./models/RequestLog');
const AuthErrorLog = require('./models/AuthErrorLog');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Global logging middleware
app.use(async (req, res, next) => {
    const oldJson = res.json;
    const oldSend = res.send;

    let userEmail = 'Anonymous';
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seekyur-demo-secret');
            const user = await User.findById(decoded.id);
            if (user) {
                userEmail = user.email;
            }
        } catch (e) {
            // Token error (expired or invalid), log as anomaly later if we hit 401
        }
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Intercept JSON responses
    res.json = function (body) {
        res.json = oldJson;
        const result = res.json.call(this, body);

        if (req.path.startsWith('/api')) {
            RequestLog.create({
                userEmail,
                ipAddress,
                path: req.path,
                method: req.method,
                token,
                timestamp: new Date()
            }).catch(err => console.error("Error creating RequestLog:", err));

            if (res.statusCode === 401 || res.statusCode === 403) {
                AuthErrorLog.create({
                    type: String(res.statusCode),
                    userEmail,
                    ipAddress,
                    path: req.path,
                    method: req.method,
                    message: body?.message || 'Unauthorized',
                    token,
                    timestamp: new Date()
                }).catch(err => console.error("Error creating AuthErrorLog:", err));
            }
        }
        return result;
    };

    // Intercept Send responses
    res.send = function (body) {
        res.send = oldSend;
        const result = res.send.call(this, body);

        if (req.path.startsWith('/api')) {
            RequestLog.create({
                userEmail,
                ipAddress,
                path: req.path,
                method: req.method,
                token,
                timestamp: new Date()
            }).catch(err => console.error("Error creating RequestLog:", err));

            if (res.statusCode === 401 || res.statusCode === 403) {
                AuthErrorLog.create({
                    type: String(res.statusCode),
                    userEmail,
                    ipAddress,
                    path: req.path,
                    method: req.method,
                    message: typeof body === 'string' ? body : 'Unauthorized',
                    token,
                    timestamp: new Date()
                }).catch(err => console.error("Error creating AuthErrorLog:", err));
            }
        }
        return result;
    };

    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth-logs', authLogRoutes);

app.set('io', io);

socketHandler(io);

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));