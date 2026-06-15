import { createContext, useState, useEffect } from 'react';
import axios from 'axios'; // 🛠️ Corregido: Importamos axios limpio para la cookie
import api from '../services/api';
import { AuthContext } from './AuthContext';
export { AuthContext };

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restaurar sesión al cargar la página
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // 🛠️ Corregido: Llamamos a la cookie sin el prefijo '/api' usando axios directo
            await axios.get('http://127.0.0.1:8000/sanctum/csrf-cookie', { withCredentials: true });
        } catch (error) {
            console.log('Error o bypass de cookie Sanctum:', error);
        }

        // Enviamos los datos limpios al backend
        const { data } = await api.post('/login', { email, password });
        
        // 🛠️ Corregido: Soportar tanto 'access_token' como 'token' por si acaso
        const miterToken = data.access_token || data.token;
        
        if (miterToken && data.user) {
            localStorage.setItem('token', miterToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.sesion_id) {
                localStorage.setItem('sesion_id', data.sesion_id);
            }
            setUser(data.user);
            return data.user;
        } else {
            throw new Error('Formato de respuesta inválido de Laravel');
        }
    };

    const logout = async () => {
        try {
            const sesionId = localStorage.getItem('sesion_id');
            await api.post('/logout', { sesion_id: sesionId });
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('sesion_id');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }
    };

    const hasPrivilege = (privilegioNombre) => {
        if (!user || !user.privilegios) return false;
        return user.privilegios.includes(privilegioNombre);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPrivilege }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};