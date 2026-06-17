import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/authprovider';
import api from '../services/api';

export default function Dashboard() {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [rendimientoGestiones, setRendimientoGestiones] = useState([]);
    const [topDocente, setTopDocente] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        cargarEstadisticas();
    }, []);

    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const cargarEstadisticas = async () => {
        try {
            setLoading(true);
            const [resDashboard, resRendimiento, resTop] = await Promise.all([
                api.get('/dashboard', authHeaders()),
                api.get('/dashboard/rendimiento-gestiones', authHeaders()),
                api.get('/dashboard/top-docente', authHeaders()),
            ]);
            if (resDashboard.data.success) {
                setStats(resDashboard.data.data);
            } else {
                setError('No se pudieron cargar las estadísticas.');
            }
            if (resRendimiento.data.success) {
                setRendimientoGestiones(resRendimiento.data.data);
            }
            if (resTop.data.success) {
                setTopDocente(resTop.data.data);
            }
        } catch (err) {
            console.error(err);
            setError('Error al conectar con la API de estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Cabecera del Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h1>
                    <p className="text-slate-500 mt-1 text-sm">Bienvenido de nuevo, <span className="font-bold text-blue-600">{user?.name}</span>. Rol: <span className="font-semibold text-indigo-600">{user?.rol}</span></p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={cargarEstadisticas}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-150 cursor-pointer flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2M4 9h5V4"></path>
                        </svg>
                        Actualizar
                    </button>
                </div>
            </div>

            {/* VISTA SEGÚN ACTORES */}

            {/* A1: ADMINISTRADOR / AUTORIDAD */}
            {['administrador', 'autoridad'].includes(user?.rol?.toLowerCase()) && (
                <>
                    {/* Tarjetas de Métricas Globales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Postulantes</span>
                                <h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.total_postulantes}</h3>
                                <p className="text-xs text-slate-500 mt-1.5">Postulantes registrados en PostgreSQL</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pagos Confirmados</span>
                                <h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.total_pagos}</h3>
                                <p className="text-xs text-slate-500 mt-1.5">Transacciones validadas en el sistema</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recaudado</span>
                                <h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.total_recaudado} Bs.</h3>
                                <p className="text-xs text-slate-500 mt-1.5">Monto total depositado por aranceles</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cupos Totales</span>
                                <h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.cupos_totales ?? '—'}</h3>
                                <p className="text-xs text-slate-500 mt-1.5">Cupos disponibles en la gestión activa</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos e Indicadores */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Estado de Cupos por Carrera */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Avance y Ocupación de Cupos</h3>
                            <div className="space-y-5">
                                {stats?.carreras.map((c) => {
                                    const porcentaje = Math.min(100, Math.round((c.postulantes_count / c.cupo) * 100)) || 0;
                                    return (
                                        <div key={c.id} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-700">{c.nombre}</span>
                                                <span className="text-blue-600">{c.postulantes_count} / {c.cupo} Cupos ({porcentaje}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    style={{ width: `${porcentaje}%` }} 
                                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Distribución por Estado */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Estado Académico de Postulantes</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                    <span className="text-xs font-bold text-yellow-700 block uppercase">Pendientes</span>
                                    <span className="text-2xl font-black text-yellow-800 block mt-1">{stats?.postulantes_por_estado.pendiente}</span>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                    <span className="text-xs font-bold text-green-700 block uppercase">Aprobados</span>
                                    <span className="text-2xl font-black text-green-800 block mt-1">{stats?.postulantes_por_estado.aprobado}</span>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <span className="text-xs font-bold text-red-700 block uppercase">Reprobados</span>
                                    <span className="text-2xl font-black text-red-800 block mt-1">{stats?.postulantes_por_estado.reprobado}</span>
                                </div>
                            </div>

                            {/* Representación gráfica simple */}
                            <div className="flex h-5 w-full bg-slate-100 rounded-full mt-6 overflow-hidden">
                                {stats?.total_postulantes > 0 ? (
                                    <>
                                        <div 
                                            style={{ width: `${(stats?.postulantes_por_estado.pendiente / stats?.total_postulantes) * 100}%` }}
                                            className="bg-yellow-400 h-full"
                                            title="Pendientes"
                                        ></div>
                                        <div 
                                            style={{ width: `${(stats?.postulantes_por_estado.aprobado / stats?.total_postulantes) * 100}%` }}
                                            className="bg-green-500 h-full"
                                            title="Aprobados"
                                        ></div>
                                        <div 
                                            style={{ width: `${(stats?.postulantes_por_estado.reprobado / stats?.total_postulantes) * 100}%` }}
                                            className="bg-red-500 h-full"
                                            title="Reprobados"
                                        ></div>
                                    </>
                                ) : (
                                    <div className="bg-slate-200 w-full h-full"></div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rendimiento Académico por Gestiones */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Rendimiento Académico por Gestión</h3>
                        {rendimientoGestiones.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Gestión</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total Post.</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Prom. Notas</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Aprobados</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Reprobados</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Tasa Aprob.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {rendimientoGestiones.map((r) => (
                                            <tr key={r.gestion_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-700">{r.gestion_codigo}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">{r.total_postulantes}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">{r.promedio_notas}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                        {r.aprobados}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                                        {r.reprobados}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${
                                                        r.tasa_aprobacion >= 60
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {r.tasa_aprobacion}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm text-center py-4">No hay datos de rendimiento disponibles.</p>
                        )}
                    </div>

                    {/* Top Docente con Mayor Aprobación */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Docentes con Mayor Aprobación de Alumnos</h3>
                        {topDocente.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Docente</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total Alumnos</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Aprobados</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Tasa de Aprobación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {topDocente.map((d, i) => (
                                            <tr key={d.docente_id} className={`hover:bg-slate-50/50 transition-colors ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-slate-500">
                                                    {i === 0 ? (
                                                        <span className="text-lg">🥇</span>
                                                    ) : i === 1 ? (
                                                        <span className="text-lg">🥈</span>
                                                    ) : i === 2 ? (
                                                        <span className="text-lg">🥉</span>
                                                    ) : (
                                                        `#${i + 1}`
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{d.nombre}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">{d.total_alumnos}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                        {d.alumnos_aprobados}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${
                                                        d.tasa_aprobacion >= 80
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : d.tasa_aprobacion >= 50
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        {d.tasa_aprobacion}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm text-center py-4">No hay datos de docentes disponibles.</p>
                        )}
                    </div>

                    {/* Bitácora de Acciones (Logs) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">CU08: Consultar Bitácora del Sistema</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                Audit Log
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-150">
                                <thead className="bg-gray-55">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Acción</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Detalle</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {(stats?.actividades_recientes ?? []).map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-semibold text-slate-500">#{log.id}</td>
                                            <td className="px-6 py-3 font-medium text-slate-700">{log.usuario}</td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                                    {log.accion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600 font-medium max-w-xs truncate">{log.detalle}</td>
                                            <td className="px-6 py-3 text-slate-400 text-xs font-semibold">{log.fecha}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reportes Generales de Gestión */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3">Reportes Generales de Gestión</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Acceso a consolidados generales auditados del Curso Preuniversitario actual.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => window.open(api.defaults.baseURL + '/reportes/exportar/pdf?tipo=postulantes&modo=estatico', '_blank')}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-150 hover:bg-slate-50 hover:border-blue-300 transition-all text-xs font-bold text-slate-700 cursor-pointer"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                    Consolidado Estadístico Final (PDF)
                                </span>
                                <span className="text-slate-400">Descargar</span>
                            </button>
                            <button
                                onClick={() => window.open(api.defaults.baseURL + '/reportes/exportar/excel?tipo=postulantes&modo=estatico', '_blank')}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-150 hover:bg-slate-50 hover:border-blue-300 transition-all text-xs font-bold text-slate-700 cursor-pointer"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    Reporte Financiero de Matrículas (Excel)
                                </span>
                                <span className="text-slate-400">Descargar</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* A2: DOCENTE */}
            {['docente'].includes(user?.rol?.toLowerCase()) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Carga Horaria y Grupos */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2 text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Mi Carga Horaria Asignada
                        </h3>
                        <div className="space-y-4">
                            {stats?.mi_carga?.horarios?.length > 0 ? (
                                stats.mi_carga.horarios.map((h, idx) => {
                                    const paletas = [
                                        'bg-blue-50 text-blue-700 border-blue-150',
                                        'bg-purple-50 text-purple-700 border-purple-150',
                                        'bg-emerald-50 text-emerald-700 border-emerald-150',
                                        'bg-amber-50 text-amber-700 border-amber-150',
                                    ];
                                    return (
                                        <div key={h.id} className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-xs transition-all space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${paletas[idx % paletas.length]}`}>
                                                    {h.grupo?.nombre || '—'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">{h.dia_semana}</span>
                                            </div>
                                            <p className="text-slate-800 text-sm font-semibold">{h.materia?.nombre || '—'}</p>
                                            <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
                                                <span>Aula: {h.aula?.nombre || h.aula?.numero || '—'}</span>
                                                <span>Horario: {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-slate-400 text-sm text-center py-8">No tienes horarios asignados.</p>
                            )}
                        </div>
                        {stats?.mi_carga && (
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                <div className="text-center">
                                    <span className="text-lg font-black text-blue-600">{stats.mi_carga.total_horas_semanales ?? 0}</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Horas Semanales</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-lg font-black text-slate-700">{stats.mi_carga.postulante?.carga_horaria_maxima ?? 0}</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Carga Máxima</p>
                                </div>
                                <div className="text-center">
                                    <span className={`text-lg font-black ${stats.mi_carga.horas_disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.mi_carga.horas_disponibles}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Disponibles</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Registrar Asistencia */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2 text-emerald-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                            Registrar Asistencia en Clase
                        </h3>

                        <p className="text-xs text-slate-400 font-medium text-center py-4">
                            El módulo de asistencia estará disponible próximamente.
                        </p>

                        {stats?.mi_carga?.horarios?.length > 0 && (
                            <div className="border-t border-slate-100 pt-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Grupos asignados</span>
                                <div className="space-y-2">
                                    {stats.mi_carga.horarios.map((h) => (
                                        <div key={h.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-xs font-semibold text-slate-700">{h.grupo?.nombre || '—'}</span>
                                            <span className="text-[10px] text-slate-400">{h.materia?.nombre || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* A3: COORDINADOR */}
            {['coordinador'].includes(user?.rol?.toLowerCase()) && (
                <div className="space-y-6">
                    {/* Monitoreo Operativo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Grupos Habilitados</span>
                            <h4 className="text-2xl font-black text-slate-800">{stats?.total_grupos ?? '—'} Grupos</h4>
                            <span className="text-[10px] text-green-600 font-bold">Gestión activa</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Postulantes en Proceso</span>
                            <h4 className="text-2xl font-black text-slate-800">{stats?.postulantes_por_estado?.pendiente ?? '—'}</h4>
                            <span className="text-[10px] text-amber-600 font-bold">Pendientes de evaluación</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Docentes Contratados</span>
                            <h4 className="text-2xl font-black text-slate-800">{stats?.total_docentes ?? '—'} Docentes</h4>
                            <span className="text-[10px] text-slate-400 font-bold">Registrados en el sistema</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Control de Cupos */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-3">Estado de Cupos Institucionales</h3>
                            <div className="space-y-4">
                                {stats?.carreras.map((c) => {
                                    return (
                                        <div key={c.id} className="flex justify-between items-center p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800">{c.nombre}</h4>
                                                <p className="text-xs text-slate-400 font-semibold mt-0.5">Postulantes: {c.postulantes_count} registrados</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-slate-500 block">Cupos Libres</span>
                                                <span className={`text-lg font-black block mt-0.5 ${c.disponibles > 10 ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {c.disponibles}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reportes de Coordinación */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-3">Generar Reportes Operativos</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => window.open(api.defaults.baseURL + '/reportes/exportar/pdf?tipo=postulantes&modo=estatico', '_blank')}
                                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-blue-400 hover:shadow-xs transition-all space-y-1.5 cursor-pointer"
                                >
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Admitidos por Carrera</h4>
                                    <p className="text-xs text-slate-400 leading-normal">Lista depurada de postulantes aprobados ordenados por CI.</p>
                                    <span className="text-[10px] text-blue-600 font-bold block pt-1">Descargar PDF →</span>
                                </button>
                                <button
                                    onClick={() => window.open(api.defaults.baseURL + '/reportes/exportar/excel?tipo=grupos&modo=estatico', '_blank')}
                                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-blue-400 hover:shadow-xs transition-all space-y-1.5 cursor-pointer"
                                >
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Reporte de Grupos</h4>
                                    <p className="text-xs text-slate-400 leading-normal">Consolidado general de grupos con ocupación y docentes asignados.</p>
                                    <span className="text-[10px] text-blue-600 font-bold block pt-1">Descargar Excel →</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* A5: POSTULANTE */}
            {['postulante'].includes(user?.rol?.toLowerCase()) && (
                <div className="space-y-6">
                    {/* Tarjeta de Estado de Postulación */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-150 shadow-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-3 flex items-center gap-2 text-indigo-600">
                            🎓 Mi Estado de Admisión
                        </h3>
                        
                        {stats?.mi_postulacion ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Datos del Postulante */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Postulante</span>
                                            <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                                                {stats.mi_postulacion.nombres} {stats.mi_postulacion.apellidos}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Cédula de Identidad (CI)</span>
                                            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{stats.mi_postulacion.ci}</h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Carrera Principal</span>
                                            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{stats.mi_postulacion.carrera_principal || '—'}</h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Carrera Secundaria</span>
                                            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{stats.mi_postulacion.carrera_secundaria || '—'}</h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Carrera Admitida</span>
                                            <h4 className={`text-sm font-extrabold mt-0.5 ${stats.mi_postulacion.carrera_admitida ? 'text-green-600' : 'text-slate-500'}`}>
                                                {stats.mi_postulacion.carrera_admitida || 'Pendiente de asignación'}
                                            </h4>
                                        </div>
                                    </div>
                                </div>

                                {/* Nota y Estado Final */}
                                <div className="flex flex-col justify-center items-center p-6 bg-slate-50 border border-slate-150 rounded-2xl shadow-sm text-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resultado del Proceso</span>
                                    <div className="my-4">
                                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-black border uppercase ${
                                            stats.mi_postulacion.estado === 'aprobado'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : stats.mi_postulacion.estado === 'reprobado'
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {stats.mi_postulacion.estado}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-500">
                                        Nota Final: <span className="text-3xl font-black text-slate-800 ml-1">{stats.mi_postulacion.nota_final ?? 'S/N'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic">No se encontró información de postulación asociada a este usuario.</p>
                        )}
                    </div>

                    {/* Tarjeta de Notas por Materia */}
                    {stats?.mi_postulacion?.notas?.length > 0 && (
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-150 shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-3">
                                📊 Calificaciones por Materia
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="min-w-full divide-y divide-gray-150 bg-white">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Materia</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Nota Promedio</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {stats.mi_postulacion.notas.map((n, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-700">{n.materia}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-850">{n.promedio.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold border ${
                                                        n.aprobado
                                                            ? 'bg-green-50 text-green-700 border-green-150'
                                                            : 'bg-red-50 text-red-700 border-red-150'
                                                    }`}>
                                                        {n.aprobado ? 'Aprobado' : 'Reprobado'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}


        </div>
    );
}
