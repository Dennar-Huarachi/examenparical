import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const COLORES_TURNO = {
    'Mañana': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-400' },
    'Tarde':  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-400' },
    'Noche':  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-400' },
};

const COLOR_DEFAULT = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' };

function getColorTurno(nombre) {
    return COLORES_TURNO[nombre] || COLOR_DEFAULT;
}

function calcularDuracion(horaInicio, horaFin) {
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    const horas = Math.floor(diffMin / 60);
    const min = diffMin % 60;
    if (min === 0) return `${horas}h`;
    return `${horas}h ${min}m`;
}

export default function TurnosPage() {
    const [turnos, setTurnos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTurno, setEditingTurno] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', hora_inicio: '', hora_fin: '' });
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    useEffect(() => { cargarTurnos(); }, []);

    const cargarTurnos = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const res = await api.get('/turnos', config);
            if (res.data.success) setTurnos(res.data.data || []);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar turnos.', 'error');
        } finally { setLoading(false); }
    }, []);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingTurno(null);
        setFormData({ nombre: '', hora_inicio: '', hora_fin: '' });
        setModalOpen(true);
    };

    const abrirEditarModal = (turno) => {
        setEditingTurno(turno);
        setFormData({ nombre: turno.nombre, hora_inicio: turno.hora_inicio.slice(0, 5), hora_fin: turno.hora_fin.slice(0, 5) });
        setModalOpen(true);
    };

    const cerrarModal = () => { setModalOpen(false); setEditingTurno(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) { mostrarToast('El nombre del turno es obligatorio.', 'error'); return; }
        if (!formData.hora_inicio) { mostrarToast('La hora de inicio es obligatoria.', 'error'); return; }
        if (!formData.hora_fin) { mostrarToast('La hora de fin es obligatoria.', 'error'); return; }
        if (formData.hora_inicio >= formData.hora_fin) { mostrarToast('La hora de fin debe ser posterior a la hora de inicio.', 'error'); return; }

        setGuardando(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            let response;
            if (editingTurno) {
                response = await api.put(`/turnos/${editingTurno.id}`, formData, config);
            } else {
                response = await api.post('/turnos', formData, config);
            }
            if (response.data.success) {
                mostrarToast(response.data.message, 'exito');
                cerrarModal();
                cargarTurnos();
            } else {
                mostrarToast(response.data.message, 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al procesar la solicitud.';
            mostrarToast(msg, 'error');
        } finally { setGuardando(false); }
    };

    const eliminarTurno = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar el turno "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/turnos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
                cargarTurnos();
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al eliminar.', 'error');
        }
    };

    const cargarTurnosDefault = async () => {
        if (!window.confirm('¿Cargar los 3 turnos por defecto?\n\n• Mañana: 07:00 - 12:00\n• Tarde: 14:00 - 18:00\n• Noche: 19:00 - 22:00')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/turnos/cargar-default', {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
                cargarTurnos();
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar turnos.', 'error');
        }
    };

    const previewDuracion = () => {
        if (formData.hora_inicio && formData.hora_fin && formData.hora_inicio < formData.hora_fin) {
            return `Duración: ${calcularDuracion(formData.hora_inicio, formData.hora_fin)}`;
        }
        return null;
    };

    return (
        <div className="max-w-5xl mx-auto mt-6 px-4 pb-10">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU10: Turnos</h1>
                    <p className="text-slate-500 mt-1 text-sm">Administra los turnos (mañana, tarde, noche) del sistema.</p>
                </div>
                <button
                    id="btn-nuevo-turno"
                    onClick={abrirCrearModal}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nuevo Turno
                </button>
            </div>

            {toast.visible && (
                <div className="mb-5 rounded-xl border shadow-md overflow-hidden">
                    <div className={`p-4 text-sm font-semibold flex items-start gap-3 ${
                        toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {toast.tipo === 'exito' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            )}
                        </svg>
                        <div className="flex-1"><p>{toast.texto}</p></div>
                        <button onClick={() => setToast({ visible: false, texto: '', tipo: '' })} className="opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100">
                {loading && turnos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                        <p className="text-sm text-slate-400 font-medium">Cargando turnos...</p>
                    </div>
                ) : turnos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-slate-700 font-bold text-base">No hay turnos registrados</p>
                            <p className="text-slate-400 text-sm mt-1">Carga los turnos por defecto o crea uno nuevo.</p>
                        </div>
                        <button
                            id="btn-cargar-turnos-default"
                            onClick={cargarTurnosDefault}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Cargar turnos por defecto
                        </button>
                        <p className="text-[11px] text-slate-400">Mañana 07:00-12:00 · Tarde 14:00-18:00 · Noche 19:00-22:00</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Turno</th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hora Inicio</th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hora Fin</th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Duración</th>
                                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-sm">
                                {turnos.map((t) => {
                                    const color = getColorTurno(t.nombre);
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-3 h-3 rounded-full ${color.dot}`} />
                                                    <span className={`font-extrabold ${color.text}`}>{t.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                                                {t.hora_inicio.slice(0, 5)}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                                                {t.hora_fin.slice(0, 5)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${color.bg} ${color.text} ${color.border} border`}>
                                                    {calcularDuracion(t.hora_inicio, t.hora_fin)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        id={`btn-editar-turno-${t.id}`}
                                                        onClick={() => abrirEditarModal(t)}
                                                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Editar
                                                    </button>
                                                    <button
                                                        id={`btn-eliminar-turno-${t.id}`}
                                                        onClick={() => eliminarTurno(t.id, t.nombre)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-medium">
                                {turnos.length} turno{turnos.length !== 1 ? 's' : ''} registrado{turnos.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
                        <div className={`px-6 py-5 flex justify-between items-center text-white ${
                            editingTurno ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">
                                    {editingTurno ? 'Editar Turno' : 'Registrar Nuevo Turno'}
                                </h2>
                                {editingTurno && <p className="text-xs opacity-80 mt-0.5">{editingTurno.nombre}</p>}
                            </div>
                            <button onClick={cerrarModal} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Nombre del Turno <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="campo-nombre-turno"
                                    required
                                    type="text"
                                    placeholder="Ej. Mañana"
                                    maxLength={50}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Hora Inicio <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-hora-inicio-turno"
                                        required
                                        type="time"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.hora_inicio}
                                        onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Hora Fin <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-hora-fin-turno"
                                        required
                                        type="time"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.hora_fin}
                                        onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                                    />
                                </div>
                            </div>
                            {previewDuracion() && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-semibold text-blue-800">
                                    {previewDuracion()}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={cerrarModal} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    id="btn-guardar-turno"
                                    disabled={guardando}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingTurno ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
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
                                    ) : editingTurno ? 'Actualizar Turno' : 'Registrar Turno'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
