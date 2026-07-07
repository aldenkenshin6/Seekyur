const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthLog = require('../models/AuthLog');
const Alert = require('../models/Alert');
const SecuritySetting = require('../models/SecuritySetting');

const JWT_SECRET = process.env.JWT_SECRET || 'seekyur-demo-secret';

const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

const publicRoles = ['Viewer', 'SOC Analyst', 'Incident Responder'];

const register = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        if (role && !publicRoles.includes(role)) {
            return res.status(400).json({ message: 'Admin accounts cannot be created through public registration' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({ name, email, password: hashedPassword, role: role || 'Viewer' });
        res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, token: generateToken(user._id) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    let ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
    } else if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
    }
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';
    const location = (ipAddress === '127.0.0.1') ? 'Localhost' : 'Local Network';

    try {
        const user = await User.findOne({
            $or: [{ email: email }, { username: email }]
        });

        const io = req.app.get('io');

        // Fetch security settings
        let setting = await SecuritySetting.findOne();
        if (!setting) {
            setting = await SecuritySetting.create({ maxAttempts: 3, lockoutDuration: 30 });
        }
        const maxAttempts = setting.maxAttempts;
        const lockoutDuration = setting.lockoutDuration;

        // Fetch recent failed login attempts for this IP address (within the lockout window)
        const ipFailures = await AuthLog.countDocuments({
            ipAddress,
            result: 'Failed',
            event: 'Login',
            timestamp: { $gte: new Date(Date.now() - lockoutDuration * 1000) }
        });

        // Check if IP is currently locked out
        if (ipFailures >= maxAttempts) {
            const lastFailure = await AuthLog.findOne({
                ipAddress,
                result: 'Failed',
                event: 'Login'
            }).sort({ timestamp: -1 });

            const secondsSinceLastFailure = lastFailure ? Math.floor((Date.now() - lastFailure.timestamp.getTime()) / 1000) : 0;
            const remainingSeconds = lockoutDuration - secondsSinceLastFailure;

            if (remainingSeconds > 0) {
                const logEntry = await AuthLog.create({
                    result: 'Failed',
                    event: 'Login',
                    userEmail: email,
                    ipAddress,
                    location,
                    sessionToken: '-',
                    userAgent,
                    failureReason: `Locked out (Try again in ${remainingSeconds}s)`
                });

                if (io) {
                    io.emit('receiveAuthLog', logEntry);
                }

                return res.status(429).json({
                    message: `Account is temporarily locked out. Try again in ${remainingSeconds} seconds.`,
                    lockoutUntil: new Date(lastFailure.timestamp.getTime() + lockoutDuration * 1000),
                    remainingSeconds
                });
            }
        }

        // Check if user is locked out
        if (user && user.lockoutUntil && user.lockoutUntil > new Date()) {
            const remainingSeconds = Math.ceil((user.lockoutUntil - new Date()) / 1000);
            
            const logEntry = await AuthLog.create({
                result: 'Failed',
                event: 'Login',
                userEmail: email,
                ipAddress,
                location,
                sessionToken: '-',
                userAgent,
                failureReason: `Locked out (Try again in ${remainingSeconds}s)`
            });

            if (io) {
                io.emit('receiveAuthLog', logEntry);
            }

            return res.status(429).json({
                message: `Account is temporarily locked out. Try again in ${remainingSeconds} seconds.`,
                lockoutUntil: user.lockoutUntil,
                remainingSeconds
            });
        }

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isActive) {
                const logEntry = await AuthLog.create({
                    result: 'Failed',
                    event: 'Login',
                    userEmail: email,
                    ipAddress,
                    location,
                    sessionToken: '-',
                    userAgent,
                    failureReason: 'Account deactivated'
                });

                if (io) {
                    io.emit('receiveAuthLog', logEntry);
                }

                return res.status(403).json({ message: 'This account has been deactivated' });
            }

            // Reset login attempts and lockout count on successful login
            user.loginAttempts = 0;
            user.lockoutUntil = null;
            user.lockoutCount = 0;
            user.lastLogin = new Date();
            await user.save();

            const token = generateToken(user._id);

            const logEntry = await AuthLog.create({
                result: 'Success',
                event: 'Login',
                userEmail: user.email,
                ipAddress,
                location,
                sessionToken: token.substring(0, 15) + '...',
                userAgent
            });

            if (io) {
                io.emit('receiveAuthLog', logEntry);
            }

            res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, token });
        } else {
            const failureReason = user ? 'Invalid password' : 'User does not exist';
            let attemptsRemaining = maxAttempts;
            let lockoutUntil = null;
            let remainingSeconds = 0;

            if (user) {
                user.loginAttempts += 1;
                if (user.loginAttempts >= maxAttempts) {
                    user.lockoutCount += 1;
                    const duration = lockoutDuration * Math.pow(2, user.lockoutCount - 1);
                    user.lockoutUntil = new Date(Date.now() + duration * 1000);
                    lockoutUntil = user.lockoutUntil;
                    remainingSeconds = duration;
                    attemptsRemaining = 0;
                } else {
                    attemptsRemaining = maxAttempts - user.loginAttempts;
                }
                await user.save();
            } else {
                // If user doesn't exist, count down attempts remaining using IP failures
                attemptsRemaining = Math.max(0, maxAttempts - (ipFailures + 1));
                if (attemptsRemaining === 0) {
                    remainingSeconds = lockoutDuration;
                    lockoutUntil = new Date(Date.now() + lockoutDuration * 1000);
                }
            }

            const errorMsg = (user && user.loginAttempts >= maxAttempts) || (!user && attemptsRemaining === 0)
                ? `Account locked out (failed ${user ? user.loginAttempts : ipFailures + 1} attempts)` 
                : failureReason;

            const logEntry = await AuthLog.create({
                result: 'Failed',
                event: 'Login',
                userEmail: email,
                ipAddress,
                location,
                sessionToken: '-',
                userAgent,
                failureReason: errorMsg
            });

            if (io) {
                io.emit('receiveAuthLog', logEntry);
            }

            // Create security Alert on login failure
            const alertEntry = await Alert.create({
                title: `Failed Authentication Attempt: ${email}`,
                type: 'FAILED AUTH',
                description: `Failed login attempt for user '${email}' from IP ${ipAddress} (Reason: ${errorMsg})`,
                severity: (user && user.loginAttempts >= maxAttempts) || (!user && attemptsRemaining === 0) ? 'Critical' : 'High',
                source: 'auth-service',
                sourceIp: ipAddress,
                isRead: false
            });

            if (io) {
                io.emit('receiveAlert', alertEntry);
            }

            if ((user && user.loginAttempts >= maxAttempts) || (!user && attemptsRemaining === 0)) {
                res.status(429).json({
                    message: `Account is temporarily locked out. Try again in ${remainingSeconds} seconds.`,
                    lockoutUntil,
                    remainingSeconds
                });
            } else {
                res.status(401).json({
                    message: user 
                        ? `Invalid password. ${attemptsRemaining} attempts remaining.` 
                        : `Invalid username or password. ${attemptsRemaining} attempts remaining.`,
                    attemptsRemaining
                });
            }
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logoutUser = async (req, res) => {
    const { email } = req.body;
    let ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
    } else if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
    }
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';
    const location = (ipAddress === '127.0.0.1') ? 'Localhost' : 'Local Network';

    try {
        const logEntry = await AuthLog.create({
            result: 'Success',
            event: 'Logout',
            userEmail: email || 'Unknown',
            ipAddress,
            location,
            sessionToken: '-',
            userAgent
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('receiveAuthLog', logEntry);
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, logoutUser };