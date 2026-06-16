import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function AulasPage() {
    const [aulas, setAulas] = useState([]);
    const [edificios, setEdificios] = useState([]);
    const [stats, setStats] = useState({ total_aulas: 0, disponibles: 0, con_proyector: 0, capacidad_total: 0 });

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAula, setEditingAula] = useState(null);

    const [filtroEdificio, setFiltroEdificio] = useState('');
    const [filtroModalidad, setFiltroModalidad] = useState('');
    const [filtroProyector, setFiltroProyector] = useState(false);
    const [filtroDisponible, setFiltroDisponible] = useState(false);

    const [formData, setFormData] = useState({
        numero: '', nombre: '', capacidad: '', piso: '', edificio: '',
        modalidad: 'presencial', tiene_proyector: false, disponible: true,
    });

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    useEffect(() => {
        cargarAulas();
    }, []);

    useEffect(() => {
        cargarAulas();
    }, [filtroEdificio, filtroModalidad, filtroProyector, filtroDisponible]);

    const cargarAulas = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const params = {};
        if (filtroEdificio) params.edificio = filtroEdificio;
        if (filtroModalidad) params.modalidad = filtroModalidad;
        if (filtroProyector) params.tiene_proyector = '1';
        if (filtroDisponible) params.disponible = '1';

        try {
            const res = await api.get('/aulas', { ...config, params });
            if (res.data.success) {
                setAulas(res.data.data.aulas || []);
                setEdificios(res.data.data.edificios || []);
                setStats(res.data.data.stats || { total_aulas: 0, disponibles: 0, con_proyector: 0, capacidad_total: 0 });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al cargar aulas.';
            mostrarToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [filtroEdificio, filtroModalidad, filtroProyector, filtroDisponible]);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingAula(null);
        setFormData({
            numero: '', nombre: '', capacidad: '', piso: '', edificio: '',
            modalidad: 'presencial', tiene_proyector: false, disponible: true,
        });
        setModalOpen(true);
    };

    const abrirEditarModal = (aula) => {
        setEditingAula(aula);
        setFormData({
            numero: aula.numero,
            nombre: aula.nombre || '',
            capacidad: aula.capacidad,
            piso: aula.piso,
            edificio: aula.edificio,
            modalidad: aula.modalidad,
            tiene_proyector: aula.tiene_proyector,
            disponible: aula.disponible,
        });
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setEditingAula(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.numero.trim()) { mostrarToast('El número de aula es obligatorio.', 'error'); return; }
        if (!formData.capacidad || parseInt(formData.capacidad) < 1) { mostrarToast('La capacidad debe ser al menos 1.', 'error'); return; }
        if (formData.piso === '' || formData.piso === null) { mostrarToast('El piso es obligatorio.', 'error'); return; }
        if (!formData.edificio.trim()) { mostrarToast('El edificio es obligatorio.', 'error'); return; }

        setGuardando(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            let response;
            const payload = {
                ...formData,
                capacidad: parseInt(formData.capacidad),
                piso: parseInt(formData.piso),
            };

            if (editingAula) {
                response = await api.put(`/aulas/${editingAula.id}`, payload, config);
            } else {
                response = await api.post('/aulas', payload, config);
            }

            if (response.data.success) {
                mostrarToast(response.data.message, 'exito');
                cerrarModal();
                cargarAulas();
            } else {
                mostrarToast(response.data.message || 'Error al guardar.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al procesar la solicitud.';
            mostrarToast(msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarAula = async (id, aulaLabel) => {
        if (!window.confirm(`¿Seguro que deseas eliminar el aula "${aulaLabel}"?\n\nEsta acción no se puede deshacer.`)) return;

        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/aulas/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
                cargarAulas();
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al eliminar.';
            mostrarToast(msg, 'error');
        }
    };

    const toggleDisponibilidad = async (aula) => {
        const token = localStorage.getItem('token');
        const nuevoEstado = !aula.disponible;

        setAulas(prev => prev.map(a => a.id === aula.id ? { ...a, disponible: nuevoEstado } : a));

        try {
            const res = await api.patch(`/aulas/${aula.id}/disponibilidad`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
            } else {
                setAulas(prev => prev.map(a => a.id === aula.id ? { ...a, disponible: !nuevoEstado } : a));
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            setAulas(prev => prev.map(a => a.id === aula.id ? { ...a, disponible: !nuevoEstado } : a));
            const msg = error.response?.data?.message || 'Error al cambiar disponibilidad.';
            mostrarToast(msg, 'error');
        }
    };

    const getAulaLabel = (a) => `${a.edificio} - ${a.numero}${a.nombre ? ` (${a.nombre})` : ''}`;

    const StatsChip = ({ label, valor, icono, color }) => (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white`}>
                {icono}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-xl font-black text-slate-800">{valor}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        CU09: Gestión de Aulas
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Administra las aulas disponibles para el examen de admisión.
                    </p>
                </div>
                <button
                    id="btn-nueva-aula"
                    onClick={abrirCrearModal}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nueva Aula
                </button>
            </div>

            {toast.visible && (
                <div className={`mb-5 rounded-xl border shadow-md overflow-hidden`}>
                    <div className={`p-4 text-sm font-semibold flex items-start gap-3 ${
                        toast.tipo === 'exito'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {toast.tipo === 'exito' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            )}
                        </svg>
                        <div className="flex-1">
                            <p>{toast.texto}</p>
                        </div>
                        <button
                            onClick={() => setToast({ visible: false, texto: '', tipo: '' })}
                            className="opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatsChip
                    label="Total Aulas"
                    valor={stats.total_aulas}
                    color="bg-blue-500"
                    icono={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    }
                />
                <StatsChip
                    label="Disponibles"
                    valor={stats.disponibles}
                    color="bg-green-500"
                    icono={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatsChip
                    label="Con Proyector"
                    valor={stats.con_proyector}
                    color="bg-purple-500"
                    icono={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    }
                />
                <StatsChip
                    label="Capacidad Total"
                    valor={stats.capacidad_total}
                    color="bg-amber-500"
                    icono={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edificio</label>
                        <select
                            value={filtroEdificio}
                            onChange={(e) => setFiltroEdificio(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none"
                        >
                            <option value="">Todos</option>
                            {edificios.map((ed) => (
                                <option key={ed} value={ed}>{ed}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidad</label>
                        <select
                            value={filtroModalidad}
                            onChange={(e) => setFiltroModalidad(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none"
                        >
                            <option value="">Todas</option>
                            <option value="presencial">Presencial</option>
                            <option value="virtual">Virtual</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtroProyector}
                            onChange={(e) => setFiltroProyector(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-600">Solo con proyector</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtroDisponible}
                            onChange={(e) => setFiltroDisponible(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-600">Solo disponibles</span>
                    </label>

                    <span className="text-sm font-bold text-slate-400 ml-auto">
                        {aulas.length} aula{aulas.length !== 1 ? 's' : ''} encontrada{aulas.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {loading && aulas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                    <p className="text-sm text-slate-400 font-medium">Cargando aulas...</p>
                </div>
            ) : aulas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-slate-700 font-bold text-base">No hay aulas registradas para esta gestión</p>
                        <p className="text-slate-400 text-sm mt-1">Crea una nueva aula usando el botón "Nueva Aula".</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aulas.map((aula) => (
                        <div
                            key={aula.id}
                            id={`aula-card-${aula.id}`}
                            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                                aula.disponible ? 'border-slate-100' : 'border-red-100 bg-red-50/30'
                            }`}
                        >
                            <div className={`px-5 py-4 flex justify-between items-start gap-2 ${
                                aula.disponible ? '' : 'opacity-85'
                            }`}>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-slate-900 text-base truncate">
                                        {aula.numero}
                                        {aula.nombre && (
                                            <span className="font-medium text-slate-500 ml-1.5">- {aula.nombre}</span>
                                        )}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                        {aula.edificio} - Piso {aula.piso}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {aula.disponible ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                            Disponible
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                            No disponible
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="px-5 pb-4 space-y-2.5">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1.5 font-bold text-slate-600">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {aula.capacidad}
                                    </span>

                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        aula.modalidad === 'presencial'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}>
                                        {aula.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
                                    </span>

                                    <span className="flex items-center gap-1">
                                        {aula.tiene_proyector ? (
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-1.5">
                                <button
                                    id={`btn-toggle-aula-${aula.id}`}
                                    onClick={() => toggleDisponibilidad(aula)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                        aula.disponible
                                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                            : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                                    }`}
                                    title={aula.disponible ? 'Marcar como no disponible' : 'Marcar como disponible'}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {aula.disponible ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        )}
                                    </svg>
                                    {aula.disponible ? 'No disponible' : 'Disponible'}
                                </button>
                                <button
                                    id={`btn-editar-aula-${aula.id}`}
                                    onClick={() => abrirEditarModal(aula)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                    title="Editar aula"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar
                                </button>
                                <button
                                    id={`btn-eliminar-aula-${aula.id}`}
                                    onClick={() => eliminarAula(aula.id, getAulaLabel(aula))}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                    title="Eliminar aula"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
                        <div className={`px-6 py-5 flex justify-between items-center text-white ${
                            editingAula
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">
                                    {editingAula ? 'Editar Aula' : 'Registrar Nueva Aula'}
                                </h2>
                                {editingAula && (
                                    <p className="text-xs opacity-80 mt-0.5">{getAulaLabel(editingAula)}</p>
                                )}
                            </div>
                            <button
                                id="btn-cerrar-modal-aula"
                                onClick={cerrarModal}
                                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Número de Aula <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-numero-aula"
                                        required
                                        type="text"
                                        placeholder="Ej. 101"
                                        maxLength={50}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                                        value={formData.numero}
                                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Nombre (opcional)
                                    </label>
                                    <input
                                        id="campo-nombre-aula"
                                        type="text"
                                        placeholder="Ej. Laboratorio A"
                                        maxLength={255}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Capacidad <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-capacidad-aula"
                                        required
                                        type="number"
                                        min="1"
                                        placeholder="Ej. 30"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.capacidad}
                                        onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Piso <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-piso-aula"
                                        required
                                        type="number"
                                        min="-5"
                                        max="100"
                                        placeholder="Ej. 2"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.piso}
                                        onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Edificio <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-edificio-aula"
                                        required
                                        type="text"
                                        list="edificios-list"
                                        placeholder="Ej. Central"
                                        maxLength={255}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.edificio}
                                        onChange={(e) => setFormData({ ...formData, edificio: e.target.value })}
                                    />
                                    <datalist id="edificios-list">
                                        {edificios.map((ed) => (
                                            <option key={ed} value={ed} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Modalidad <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="campo-modalidad-aula"
                                    value={formData.modalidad}
                                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                >
                                    <option value="presencial">Presencial</option>
                                    <option value="virtual">Virtual</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        id="campo-proyector-aula"
                                        type="checkbox"
                                        checked={formData.tiene_proyector}
                                        onChange={(e) => setFormData({ ...formData, tiene_proyector: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Tiene proyector</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        id="campo-disponible-aula"
                                        type="checkbox"
                                        checked={formData.disponible}
                                        onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Disponible</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    id="btn-cancelar-aula"
                                    onClick={cerrarModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    id="btn-guardar-aula"
                                    disabled={guardando}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingAula
                                            ? 'bg-amber-500 hover:bg-amber-600'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {guardando ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Guardando...
                                        </span>
                                    ) : editingAula ? 'Actualizar Aula' : 'Registrar Aula'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
