import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TITULO_BADGE = {
    licenciatura: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    maestria: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    doctorado: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    diplomado: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const DISPO_BADGE = {
    mañana: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    tarde: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    noche: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    completo: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
};

const ESTADO_BADGE = {
    postulante: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    contratado: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rechazado: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export default function ContratacionPage() {
    const [tab, setTab] = useState('postulantes');
    const [postulantes, setPostulantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroTitulo, setFiltroTitulo] = useState('');
    const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
    const [filtroMateria, setFiltroMateria] = useState('');

    const [contratarModal, setContratarModal] = useState(null);
    const [rechazarModal, setRechazarModal] = useState(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [accionando, setAccionando] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detallePostulante, setDetallePostulante] = useState(null);
    const [detalleLoading, setDetalleLoading] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const [errorPersistente, setErrorPersistente] = useState('');

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerPostulantes = async () => {
        setLoading(true);
        setErrorPersistente('');
        const token = localStorage.getItem('token');
        try {
            const params = {};
            if (tab === 'postulantes') params.estado = 'postulante';
            if (tab === 'contratados') params.estado = 'contratado';
            if (filtroTitulo) params.titulo_academico = filtroTitulo;
            if (filtroEspecialidad) params.especialidad = filtroEspecialidad;
            if (filtroMateria) params.materia_preferida = filtroMateria;
            const res = await api.get('/contratacion', { params, headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setPostulantes(res.data.data);
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al cargar';
            mostrarToast(msg, 'error');
            setErrorPersistente(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { obtenerPostulantes(); }, [tab, filtroTitulo, filtroEspecialidad, filtroMateria]);

    const handleContratar = async (id) => {
        setAccionando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/contratacion/${id}/contratar`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Docente contratado correctamente', 'exito');
                setContratarModal(null);
                obtenerPostulantes();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al contratar', 'error');
        } finally {
            setAccionando(false);
        }
    };

    const handleRechazar = async (id) => {
        setAccionando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/contratacion/${id}/rechazar`, { motivo: motivoRechazo }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Postulante rechazado', 'exito');
                setRechazarModal(null);
                setMotivoRechazo('');
                obtenerPostulantes();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al rechazar', 'error');
        } finally {
            setAccionando(false);
        }
    };

    const handleRevertir = async (id) => {
        if (!window.confirm('¿Revertir contratación? Se eliminará el registro de docente. El postulante volverá a estado postulante.')) return;
        setAccionando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/contratacion/${id}/revertir`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Contratación revertida', 'exito');
                obtenerPostulantes();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al revertir', 'error');
        } finally {
            setAccionando(false);
        }
    };

    const abrirDetalle = async (id) => {
        setDetalleLoading(true);
        setDrawerOpen(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/contratacion/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setDetallePostulante(res.data.data);
        } catch (error) {
            mostrarToast('Error al cargar detalle', 'error');
            setDrawerOpen(false);
        } finally {
            setDetalleLoading(false);
        }
    };

    const contar = (estado) => postulantes.filter(p => p.estado === estado).length;

    const Spinner = () => (
        <div className="flex justify-center py-20">
            <div className="relative">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200"></div>
                <div className="absolute top-0 left-0 w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    );

    const SkeletonRows = () => (
        <>
            {[1,2,3,4].map(i => (
                <tr key={i}>
                    {Array.from({ length: tab === 'contratados' ? 9 : 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div></td>
                    ))}
                </tr>
            ))}
        </>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
            {/* Toast */}
            {toast.visible && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-3 transition-all animate-in slide-in-from-right ${
                    toast.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                    {toast.tipo === 'exito' ? (
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span className="flex-1">{toast.texto}</span>
                    <button onClick={() => setToast({ visible: false })} className="ml-2 hover:opacity-70 cursor-pointer shrink-0">&times;</button>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contratación de Docentes</h1>
                        <p className="text-slate-500 mt-1.5 text-sm">Gestión de postulantes a docentes y contrataciones activas</p>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Postulantes', count: contar('postulante'), color: 'bg-sky-50 border-sky-200 text-sky-700', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { label: 'Contratados', count: contar('contratado'), color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                    { label: 'Rechazados', count: contar('rechazado'), color: 'bg-red-50 border-red-200 text-red-700', icon: 'M6 18L18 6M6 6l12 12' },
                ].map((s, i) => (
                    <div key={i} className={`${s.color} border rounded-xl px-5 py-4 flex items-center gap-4 transition-shadow hover:shadow-sm`}>
                        <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-black">{s.count}</p>
                            <p className="text-xs font-semibold opacity-80">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="flex gap-6">
                    {[
                        { key: 'postulantes', label: 'Postulantes', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                        { key: 'contratados', label: 'Contratados', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                                tab === t.key ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} /></svg>
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-shadow" value={filtroTitulo} onChange={e => setFiltroTitulo(e.target.value)}>
                        <option value="">Todos los títulos</option>
                        <option value="licenciatura">Licenciatura</option>
                        <option value="maestria">Maestría</option>
                        <option value="doctorado">Doctorado</option>
                        <option value="diplomado">Diplomado</option>
                    </select>
                    <input type="text" placeholder="Filtrar por especialidad..." className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-shadow" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)} />
                    <input type="text" placeholder="Filtrar por materia preferida..." className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-shadow" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} />
                </div>
            </div>

            {/* Error banner */}
            {errorPersistente && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-red-700 text-sm font-semibold flex-1">{errorPersistente}</span>
                    <button onClick={() => setErrorPersistente('')} className="text-red-400 hover:text-red-600 cursor-pointer shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['CI', 'Nombre', 'Título', 'Especialidad', 'Materia', 'Disponibilidad', 'Acciones'].map(h => (
                                        <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100"><SkeletonRows /></tbody>
                        </table>
                    </div>
                </div>
            ) : postulantes.length === 0 && !errorPersistente ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="text-slate-500 font-medium text-base">No hay {tab === 'postulantes' ? 'postulantes' : 'contratados'} en la gestión activa.</p>
                    <p className="text-slate-400 text-sm mt-1">Los registros importados aparecerán aquí automáticamente.</p>
                </div>
            ) : postulantes.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CI</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Título</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Especialidad</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Materia</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Disponibilidad</th>
                                    {tab === 'contratados' && (
                                        <>
                                            <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Carga máx</th>
                                            <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Horas asig</th>
                                            <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Disponibles</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {postulantes.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">{p.ci}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="text-slate-800 font-medium">{p.nombres} {p.apellidos}</span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_BADGE[p.estado] || 'bg-slate-100 text-slate-600'}`}>
                                                {p.estado === 'postulante' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>}
                                                {p.estado === 'contratado' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                                                {p.estado === 'rechazado' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${TITULO_BADGE[p.titulo_academico] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                                                {p.titulo_academico || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate" title={p.especialidad}>{p.especialidad || '—'}</td>
                                        <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate" title={p.materia_preferida}>{p.materia_preferida || '—'}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${DISPO_BADGE[p.disponibilidad_horaria] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                                                {p.disponibilidad_horaria || '—'}
                                            </span>
                                        </td>
                                        {tab === 'contratados' && (
                                            <>
                                                <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{p.carga_horaria_maxima ?? '—'}</td>
                                                <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{p.docente?.horas_asignadas ?? 0}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`font-bold ${p.docente?.horas_disponibles > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {p.docente?.horas_disponibles ?? 0}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button onClick={() => abrirDetalle(p.id)}
                                                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    Ver
                                                </button>
                                                {p.estado === 'postulante' && (
                                                    <>
                                                        <button onClick={() => setContratarModal(p)}
                                                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            Contratar
                                                        </button>
                                                        <button onClick={() => setRechazarModal(p)}
                                                            className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            Rechazar
                                                        </button>
                                                    </>
                                                )}
                                                {p.estado === 'contratado' && (
                                                    <button onClick={() => handleRevertir(p.id)}
                                                        className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        Revertir
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
                        {postulantes.length} registro{postulantes.length !== 1 ? 's' : ''} encontrado{postulantes.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            {/* Confirmar contratación modal */}
            {contratarModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => !accionando && setContratarModal(null)}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Confirmar contratación</h3>
                                <p className="text-xs text-slate-500">Esta acción vinculará al postulante como docente</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2.5 mb-5 border border-slate-100">
                            <div className="flex justify-between">
                                <span className="text-slate-400">CI</span>
                                <strong className="text-slate-900">{contratarModal.ci}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Nombre</span>
                                <strong className="text-slate-900">{contratarModal.nombres} {contratarModal.apellidos}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Título</span>
                                <strong className="text-slate-900">{contratarModal.titulo_academico}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Especialidad</span>
                                <strong className="text-slate-900">{contratarModal.especialidad || '—'}</strong>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setContratarModal(null)} disabled={accionando}
                                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={() => handleContratar(contratarModal.id)} disabled={accionando}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-sm text-sm transition-all cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2">
                                {accionando ? (
                                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Procesando...</>
                                ) : 'Confirmar contratación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rechazar modal */}
            {rechazarModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => !accionando && (setRechazarModal(null) || setMotivoRechazo(''))}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Rechazar postulante</h3>
                                <p className="text-xs text-slate-500">¿Rechazar a <strong>{rechazarModal.nombres} {rechazarModal.apellidos}</strong>?</p>
                            </div>
                        </div>
                        <textarea placeholder="Motivo del rechazo (opcional)"
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 mb-5 transition-shadow resize-none"
                            rows={3} value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setRechazarModal(null); setMotivoRechazo(''); }} disabled={accionando}
                                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={() => handleRechazar(rechazarModal.id)} disabled={accionando}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-sm text-sm transition-all cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2">
                                {accionando ? (
                                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Procesando...</>
                                ) : 'Rechazar postulante'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 bg-slate-950/30 z-50" onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <h3 className="font-bold text-lg">Detalle del postulante</h3>
                            </div>
                            <button onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {detalleLoading ? (
                            <div className="flex justify-center py-20"><div className="relative"><div className="w-10 h-10 rounded-full border-4 border-slate-200"></div><div className="absolute top-0 left-0 w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div></div>
                        ) : detallePostulante ? (
                            <div className="p-6 space-y-6">
                                <div className="pb-4 border-b border-slate-100">
                                    <h4 className="text-xl font-extrabold text-slate-900">{detallePostulante.nombres} {detallePostulante.apellidos}</h4>
                                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                        <span>CI: {detallePostulante.ci}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Estado: <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_BADGE[detallePostulante.estado] || 'bg-slate-100 text-slate-600'}`}>{detallePostulante.estado}</span></span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'Título', value: detallePostulante.titulo_academico },
                                        { label: 'Especialidad', value: detallePostulante.especialidad },
                                        { label: 'Materia preferida', value: detallePostulante.materia_preferida },
                                        { label: 'Disponibilidad', value: detallePostulante.disponibilidad_horaria },
                                        { label: 'Carga máxima', value: detallePostulante.carga_horaria_maxima ? `${detallePostulante.carga_horaria_maxima} hrs/sem` : null },
                                        { label: 'Teléfono', value: detallePostulante.telefono },
                                    ].map((item, i) => (
                                        <div key={i} className={`bg-slate-50 rounded-xl p-3 border border-slate-100 ${!item.value ? 'col-span-2' : ''}`}>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                            <p className="font-semibold text-slate-800 mt-1">{item.value || '—'}</p>
                                        </div>
                                    ))}
                                    <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo</p>
                                        <p className="font-semibold text-slate-800 mt-1">{detallePostulante.correo || '—'}</p>
                                    </div>
                                </div>
                                {detallePostulante.docente && (
                                    <div className="border-t border-slate-100 pt-5">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            Docente vinculado
                                        </h5>
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-emerald-600">Fecha contratación</span>
                                                <strong className="text-emerald-900">{detallePostulante.docente.fecha_contratacion}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-emerald-600">Horas asignadas</span>
                                                <strong className="text-emerald-900">{detallePostulante.docente.horas_asignadas ?? 0}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-emerald-600">Horas disponibles</span>
                                                <strong className={detallePostulante.docente.horas_disponibles > 0 ? 'text-emerald-900' : 'text-red-500'}>{detallePostulante.docente.horas_disponibles ?? 0}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {detallePostulante.documentos?.length > 0 && (
                                    <div className="border-t border-slate-100 pt-5">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Documentos ({detallePostulante.documentos.length})
                                        </h5>
                                        <div className="space-y-2">
                                            {detallePostulante.documentos.map(d => (
                                                <div key={d.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{d.tipo_documento}</p>
                                                            <p className="text-xs text-slate-400">{d.nombre_archivo}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
