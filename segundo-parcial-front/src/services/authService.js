import axios from 'axios'; // 1. Importamos la librería limpia
import api from './api';   // 2. Tu instancia con el prefijo /api

export const login = async (email, password) => {
    // Usamos 'axios' directo (la librería a secas) para que NO use tu baseURL con '/api'
    // Además, agregamos { withCredentials: true } que es obligatorio para Laravel Sanctum
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');
    await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { 
        withCredentials: true 
    }); 
    
    // Aquí sí usamos tu 'api' para que vaya a http://127.0.0.1:8000/api/login
    const response = await api.post('/login', { email, password });
    return response.data;
};