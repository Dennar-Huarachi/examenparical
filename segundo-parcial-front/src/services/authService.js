import api from './api';

export const login = async (email, password) => {
    // Usamos 'axios' directo (la librería a secas) para que NO use tu baseURL con '/api'
    // Además, agregamos { withCredentials: true } que es obligatorio para Laravel Sanctum
    await axios.get('http://127.0.0.1:8000/sanctum/csrf-cookie', {
        withCredentials: true
    });

    // Aquí sí usamos tu 'api' para que vaya a http://127.0.0.1:8000/api/login
    const response = await api.post('/login', { email, password });
    return response.data;
};