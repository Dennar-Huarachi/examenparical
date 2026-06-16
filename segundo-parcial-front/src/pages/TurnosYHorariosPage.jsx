import React, { useState, useEffect, useCallback } from 'react';
import TurnosPage from './TurnosPage';
import HorariosPage from './HorariosPage';
import api from '../services/api';

const TABS = [
    { key: 'turnos', label: 'Turnos', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'grupos', label: 'Grupos', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'horarios', label: 'Horarios', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

function GruposTab() {
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [turnos, setTurnos] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [formData, setFormData] = useState({ nombre: '', turno_id: '', capacidad: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const cargarGrupos = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/grupos', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setGrupos(res.data.data);
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar grupos', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const cargarTurnos = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/turnos', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setTurnos(res.data.data || []);
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => { cargarGrupos(); }, []);

    const abrirModal = () => {
        setFormData({ nombre: '', turno_id: '', capacidad: '' });
        cargarTurnos();
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) { mostrarToast('El nombre del grupo es obligatorio.', 'error'); return; }
        if (!formData.turno_id) { mostrarToast('Debe seleccionar un turno.', 'error'); return; }
        if (!formData.capacidad || parseInt(formData.capacidad) < 1) { mostrarToast('La capacidad debe ser al menos 1.', 'error'); return; }

        setGuardando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/grupos', {
                nombre: formData.nombre.trim(),
                turno_id: parseInt(formData.turno_id),
                capacidad: parseInt(formData.capacidad)
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast(res.data.message || 'Grupo creado correctamente', 'exito');
                setModalOpen(false);
                cargarGrupos();
            } else {
                mostrarToast(res.data.message || 'Error al crear el grupo', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al conectar con el servidor';
            mostrarToast(msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4">
            {toast.visible && (
                <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                    toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                    <span>{toast.texto}</span>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU: Grupos</h1>
                    <button onClick={abrirModal} className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        + Nuevo Grupo
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                    </div>
                ) : grupos.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-slate-400 font-medium">No hay grupos registrados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 bg-white">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">GRUPO</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TURNO</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CAPACIDAD</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {grupos.map(g => (
                                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{g.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-600">{g.turno?.nombre || '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            <span className="font-bold">{g.total_inscritos || 0}</span>
                                            <span className="text-slate-400"> / {g.capacidad_maxima || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal Registrar Nuevo Grupo ── */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog" aria-modal="true">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden max-h-[95vh] overflow-y-auto">
                        <div className="px-6 py-5 flex justify-between items-center text-white bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10">
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">Registrar Nuevo Grupo</h2>
                                <p className="text-blue-100 text-xs mt-0.5">Complete los datos del nuevo grupo académico</p>
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
                                    Nombre del Grupo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Grupo A"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Turno <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.turno_id}
                                    onChange={(e) => setFormData({ ...formData, turno_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                >
                                    <option value="">Seleccionar turno</option>
                                    {turnos.map(t => (
                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Capacidad <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    placeholder="Ej: 70"
                                    value={formData.capacidad}
                                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={cerrarModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando}
                                    className="text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-blue-600 hover:bg-blue-700">
                                    {guardando ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Guardando...
                                        </span>
                                    ) : 'Guardar Grupo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TurnosYHorariosPage() {
    const [tab, setTab] = useState('turnos');

    return (
        <div>
            <div className="max-w-7xl mx-auto mt-6 px-4">
                <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto">
                    {TABS.map(t => {
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                                    active
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                                </svg>
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            {tab === 'turnos' && <TurnosPage />}
            {tab === 'grupos' && <GruposTab />}
            {tab === 'horarios' && <HorariosPage />}
        </div>
    );
}
