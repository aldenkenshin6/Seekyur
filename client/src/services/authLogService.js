import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/auth-logs`;

export const getAuthLogs = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.get(API_URL, {
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    });
};
