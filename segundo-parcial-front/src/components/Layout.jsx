import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authprovider';
import Sidebar from './Sidebar';

export default function Layout() {
    const { user, logout } = useContext(AuthContext);

    // Redirigir al inicio de sesión si no hay sesión activa
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 md:pl-64 flex">
            {/* Barra lateral */}
            <Sidebar />

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col">
                {/* Cabecera de control superior */}
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20 shadow-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium text-xs">Sistema de Admisión FICCT</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-800 font-semibold text-xs uppercase tracking-wider">CUP</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase mt-0.5">
                                {user?.rol}
                            </span>
                        </div>

                        {/* Botón de Cierre de Sesión */}
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 font-semibold text-xs transition-all duration-150 cursor-pointer border border-slate-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </header>

                {/* Subpáginas correspondientes */}
                <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
