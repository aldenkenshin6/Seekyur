import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_BASE_URL, SOCKET_URL } from '../config';

const NotificationContext = createContext();

const API_URL = `${API_BASE_URL}/api/alerts`;

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const socketRef = useRef(null);

    // Fetch initial alerts
    useEffect(() => {
        if (!user) {
            setAlerts([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        const fetchAlerts = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(API_URL, {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                });
                setAlerts(data);
                const unread = data.filter(alert => !alert.isRead).length;
                setUnreadCount(unread);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch initial alerts:", error);
                setLoading(false);
            }
        };

        fetchAlerts();
    }, [user]);

    // WebSocket connection
    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.io connected:', socket.id);
        });

        socket.on('receiveAlert', (newAlert) => {
            setAlerts((prev) => {
                if (prev.some(a => a._id === newAlert._id)) return prev;
                return [newAlert, ...prev];
            });
            setUnreadCount((prev) => prev + 1);

            // Show toast for High/Critical alerts
            if (newAlert.severity === 'High' || newAlert.severity === 'Critical') {
                setToast(newAlert);
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    // Auto-clear toast after 5 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            await axios.put(`${API_URL}/mark-read`, {}, {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            });
            setAlerts((prev) => prev.map(a => ({ ...a, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark alerts as read:", error);
        }
    };

    return (
        <NotificationContext.Provider value={{ alerts, loading, unreadCount, markAllAsRead, toast, setToast }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
