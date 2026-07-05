import axios from 'axios';
import { API_BASE_URL } from '../config';

const API = `${API_BASE_URL}/api/users`;

const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token;
};

const config = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

export const getUsers = () => axios.get(API, config());
export const createUser = (data) => axios.post(API, data, config());
export const updateUserRole = (id, role) => axios.put(`${API}/${id}/role`, { role }, config());
export const updateUserStatus = (id, isActive) => axios.put(`${API}/${id}/status`, { isActive }, config());
export const deleteUser = (id) => axios.delete(`${API}/${id}`, config());
export const getSecuritySettings = () => axios.get(`${API}/settings/security`, config());
export const updateSecuritySettings = (data) => axios.put(`${API}/settings/security`, data, config());