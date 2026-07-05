import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, SOCKET_URL } from '../config';

const socket = io(SOCKET_URL);
const API = `${API_BASE_URL}/api/alerts`;

const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token;
};

const config = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

const useSocket = (onNewAlert) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const onNewAlertRef = useRef(onNewAlert);
    useEffect(() => {
        onNewAlertRef.current = onNewAlert;
    }, [onNewAlert]);

    useEffect(() => {
        setLoading(true);
        axios.get(API, config())
            .then(({ data }) => {
                setAlerts(data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
        
        const handler = (alert) => {
            setAlerts((prev) => [alert, ...prev]);
            if (onNewAlertRef.current) {
                onNewAlertRef.current(alert);
            }
        };
        
        socket.on('receiveAlert', handler);
        return () => {
            socket.off('receiveAlert', handler);
        };
    }, []);

    const sendAlert = (alert) => socket.emit('newAlert', alert);

    return { alerts, loading, sendAlert };
};

export default useSocket;