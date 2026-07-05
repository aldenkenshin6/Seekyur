import axios from 'axios';
import { API_BASE_URL } from '../config';

const API = `${API_BASE_URL}/api/incidents`;

const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token;
};

const config = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

export const getIncidents = () => axios.get(API, config());
export const createIncident = (data) => axios.post(API, data, config());
export const updateIncident = (id, data) => axios.put(`${API}/${id}`, data, config());
export const deleteIncident = (id) => axios.delete(`${API}/${id}`, config());