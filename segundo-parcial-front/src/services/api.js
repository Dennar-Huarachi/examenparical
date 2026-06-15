import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const sesionId = localStorage.getItem('sesion_id');
    if (sesionId) {
        config.headers['X-Sesion-Id'] = sesionId;
    }
    return config;
});

export default api;

