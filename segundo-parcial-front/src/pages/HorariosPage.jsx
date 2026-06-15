import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORA_BASE = 7;
const TOTAL_HORAS = 15;
const TOTAL_MINUTOS = TOTAL_HORAS * 60;

const COLORES_MATERIA = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', bar: 'bg-blue-500' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', bar: 'bg-emerald-500' },
    { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', bar: 'bg-violet-500' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', bar: 'bg-rose-500' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', bar: 'bg-cyan-500' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', bar: 'bg-amber-500' },
];

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function getTop(time) {
    return ((timeToMinutes(time) - HORA_BASE * 60) / TOTAL_MINUTOS) * 100;
}

function getHeight(inicio, fin) {
    return ((timeToMinutes(fin) - timeToMinutes(inicio)) / TOTAL_MINUTOS) * 100;
}

function getColor(materiaId, index) {
    return COLORES_MATERIA[(materiaId + (index || 0)) % COLORES_MATERIA.length];
}

function formatHora(t) {
    return t.slice(0, 5);
}

function horasDelDia() {
    const horas = [];
    for (let h = HORA_BASE; h < HORA_BASE + TOTAL_HORAS; h++) {
        horas.push(`${String(h).padStart(2, '0')}:00`);
    }
    return horas;
}

export default function HorariosPage() {
    const [horarios, setHorarios] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [materias, setMaterias] = useState([]);

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingHorario, setEditingHorario] = useState(null);

    const [filtroGrupo, setFiltroGrupo] = useState('');
    const [filtroDocente, setFiltroDocente] = useState('');
    const [filtroAula, setFiltroAula] = useState('');

    const [formData, setFormData] = useState({
        grupo_id: '', materia_id: '', docente_id: '', aula_id: '',
        dia_semana: 'Lunes', hora_inicio: '07:00', hora_fin: '08:00',
    });

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    useEffect(() => {
        cargarHorarios();
    }, [filtroGrupo, filtroDocente, filtroAula]);

    const cargarDatosIniciales = async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const [resGrupos, resDocentes, resAulas, resMaterias] = await Promise.all([
                api.get('/grupos', config),
                api.get('/docentes', config),
                api.get('/aulas', config),
                api.get('/materias', config),
            ]);

            if (resGrupos.data.success) setGrupos(resGrupos.data.data || []);
            if (resDocentes.data.success) setDocentes(resDocentes.data.data || []);
            if (resAulas.data.success) setAulas(resAulas.data.data.aulas || []);
            if (resMaterias.data.success) setMaterias(resMaterias.data.data.materias || []);
        } catch (error) {
            mostrarToast('Error al cargar datos iniciales.', 'error');
        }
    };

    const cargarHorarios = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const params = {};
        if (filtroGrupo) params.grupo_id = filtroGrupo;
        if (filtroDocente) params.docente_id = filtroDocente;
        if (filtroAula) params.aula_id = filtroAula;

        try {
            const res = await api.get('/horarios', { ...config, params });
            if (res.data.success) setHorarios(res.data.data || []);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar horarios.', 'error');
        } finally { setLoading(false); }
    }, [filtroGrupo, filtroDocente, filtroAula]);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingHorario(null);
        setFormData({ grupo_id: '', materia_id: '', docente_id: '', aula_id: '', dia_semana: 'Lunes', hora_inicio: '07:00', hora_fin: '08:00' });
        setModalOpen(true);
    };

    const abrirEditarModal = (horario) => {
        setEditingHorario(horario);
        setFormData({
            grupo_id: horario.grupo_id,
            materia_id: horario.materia_id,
            docente_id: horario.docente_id,
            aula_id: horario.aula_id,
            dia_semana: horario.dia_semana,
            hora_inicio: horario.hora_inicio.slice(0, 5),
            hora_fin: horario.hora_fin.slice(0, 5),
        });
        setModalOpen(true);
    };

    const cerrarModal = () => { setModalOpen(false); setEditingHorario(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.grupo_id) { mostrarToast('Selecciona un grupo.', 'error'); return; }
        if (!formData.materia_id) { mostrarToast('Selecciona una materia.', 'error'); return; }
        if (!formData.docente_id) { mostrarToast('Selecciona un docente.', 'error'); return; }
        if (!formData.aula_id) { mostrarToast('Selecciona un aula.', 'error'); return; }
        if (formData.hora_inicio >= formData.hora_fin) { mostrarToast('La hora de fin debe ser posterior a la inicio.', 'error'); return; }

        setGuardando(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            let response;
            if (editingHorario) {
                response = await api.put(`/horarios/${editingHorario.id}`, formData, config);
            } else {
                response = await api.post('/horarios', formData, config);
            }
            if (response.data.success) {
                mostrarToast(response.data.message, 'exito');
                cerrarModal();
                cargarHorarios();
            } else {
                mostrarToast(response.data.message, 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al procesar la solicitud.';
            mostrarToast(msg, 'error');
        } finally { setGuardando(false); }
    };

    const eliminarHorario = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este horario?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/horarios/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
                cargarHorarios();
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al eliminar.', 'error');
        }
    };

    const getGrupoNombre = (id) => { const g = grupos.find(x => x.id === id); return g ? g.nombre : '—'; };
    const getMateriaNombre = (id) => { const m = materias.find(x => x.id === id); return m ? m.nombre : '—'; };
    const getDocenteNombre = (id) => {
        const d = docentes.find(x => x.id === id);
        if (d && d.postulante_docente) return `${d.postulante_docente.nombres} ${d.postulante_docente.apellidos}`;
        return '—';
    };
    const getAulaLabel = (id) => {
        const a = aulas.find(x => x.id === id);
        return a ? `${a.edificio} - ${a.numero}` : '—';
    };

    const getTurnoDelGrupo = (grupoId) => {
        const g = grupos.find(x => x.id === Number(grupoId));
        if (g && g.turno) return `${g.turno.nombre} (${formatHora(g.turno.hora_inicio)} - ${formatHora(g.turno.hora_fin)})`;
        return null;
    };

    const horariosPorDia = {};
    DIAS.forEach(d => { horariosPorDia[d] = []; });
    horarios.forEach(h => {
        if (horariosPorDia[h.dia_semana]) {
            horariosPorDia[h.dia_semana].push(h);
        }
    });

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU10: Horarios</h1>
                    <p className="text-slate-500 mt-1 text-sm">Grilla semanal de horarios por grupo, docente y aula.</p>
                </div>
                <button
                    id="btn-nuevo-horario"
                    onClick={abrirCrearModal}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nuevo Horario
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

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grupo</label>
                        <select
                            value={filtroGrupo}
                            onChange={(e) => setFiltroGrupo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none"
                        >
                            <option value="">Todos</option>
                            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Docente</label>
                        <select
                            value={filtroDocente}
                            onChange={(e) => setFiltroDocente(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none"
                        >
                            <option value="">Todos</option>
                            {docentes.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.postulante_docente ? `${d.postulante_docente.nombres} ${d.postulante_docente.apellidos}` : `Docente #${d.id}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aula</label>
                        <select
                            value={filtroAula}
                            onChange={(e) => setFiltroAula(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none"
                        >
                            <option value="">Todas</option>
                            {aulas.map(a => (
                                <option key={a.id} value={a.id}>{a.edificio} - {a.numero}{a.nombre ? ` (${a.nombre})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-sm font-bold text-slate-400 ml-auto">
                        {horarios.length} horario{horarios.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {loading && horarios.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                    <p className="text-sm text-slate-400 font-medium">Cargando horarios...</p>
                </div>
            ) : horarios.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-bold text-base">No hay horarios registrados para esta gestión</p>
                    <p className="text-slate-400 text-sm mt-1">Usa el botón "Nuevo Horario" para agregar uno.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            <div className="grid" style={{ gridTemplateColumns: '70px repeat(6, 1fr)' }}>
                                <div className="bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sticky left-0">
                                    Hora
                                </div>
                                {DIAS.map(dia => (
                                    <div key={dia} className="bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                        {dia}
                                    </div>
                                ))}

                                <div className="bg-white border-r border-slate-100 relative" style={{ height: '900px' }}>
                                    {horasDelDia().map((h, i) => (
                                        <div
                                            key={h}
                                            className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'} flex items-start px-1.5`}
                                            style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}
                                        >
                                            <span className="text-[10px] font-bold text-slate-400 -mt-2 sticky left-0">{h}</span>
                                        </div>
                                    ))}
                                </div>

                                {DIAS.map(dia => (
                                    <div key={dia} className="bg-white border-r border-slate-100 relative" style={{ height: '900px' }}>
                                        {horasDelDia().map((h, i) => (
                                            <div
                                                key={h}
                                                className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'}`}
                                                style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}
                                            />
                                        ))}
                                        {horariosPorDia[dia].map((h, idx) => {
                                            const color = getColor(h.materia_id, idx);
                                            return (
                                                <div
                                                    key={h.id}
                                                    id={`horario-block-${h.id}`}
                                                    onClick={() => abrirEditarModal(h)}
                                                    className={`absolute left-1 right-1 ${color.bg} ${color.border} border rounded-lg overflow-hidden cursor-pointer hover:shadow-md hover:brightness-95 transition-all group z-10`}
                                                    style={{ top: `${getTop(h.hora_inicio)}%`, height: `${getHeight(h.hora_inicio, h.hora_fin)}%`, minHeight: '40px' }}
                                                    title={`${getMateriaNombre(h.materia_id)}\n${getGrupoNombre(h.grupo_id)}\nDocente: ${getDocenteNombre(h.docente_id)}\nAula: ${getAulaLabel(h.aula_id)}`}
                                                >
                                                    <div className={`h-1 ${color.bar} rounded-t-lg`} />
                                                    <div className="px-2 py-1 text-[10px] leading-tight">
                                                        <p className={`font-extrabold ${color.text} truncate`}>
                                                            {getMateriaNombre(h.materia_id)}
                                                        </p>
                                                        <p className="font-semibold text-slate-600 truncate">
                                                            {getGrupoNombre(h.grupo_id)}
                                                        </p>
                                                        <p className="text-slate-500 truncate">
                                                            {getDocenteNombre(h.docente_id).split(' ').slice(0, 2).join(' ') || '—'}
                                                        </p>
                                                        <p className="text-slate-400 truncate">
                                                            {getAulaLabel(h.aula_id)}
                                                        </p>
                                                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                                                            {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                                                        </p>
                                                    </div>
                                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            id={`btn-eliminar-horario-${h.id}`}
                                                            onClick={(e) => { e.stopPropagation(); eliminarHorario(h.id); }}
                                                            className="bg-white/80 hover:bg-red-100 rounded p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                                            title="Eliminar horario"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className={`px-6 py-5 flex justify-between items-center text-white sticky top-0 z-10 ${
                            editingHorario ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">{editingHorario ? 'Editar Horario' : 'Registrar Nuevo Horario'}</h2>
                            </div>
                            <button onClick={cerrarModal} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Grupo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="campo-grupo-horario"
                                        required
                                        value={formData.grupo_id}
                                        onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                    >
                                        <option value="">Seleccionar grupo</option>
                                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                    </select>
                                    {formData.grupo_id && (
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                            Turno: {getTurnoDelGrupo(formData.grupo_id) || '—'}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Materia <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="campo-materia-horario"
                                        required
                                        value={formData.materia_id}
                                        onChange={(e) => setFormData({ ...formData, materia_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                    >
                                        <option value="">Seleccionar materia</option>
                                        {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Docente <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="campo-docente-horario"
                                        required
                                        value={formData.docente_id}
                                        onChange={(e) => setFormData({ ...formData, docente_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                    >
                                        <option value="">Seleccionar docente</option>
                                        {docentes.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.postulante_docente ? `${d.postulante_docente.nombres} ${d.postulante_docente.apellidos}` : `Docente #${d.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Aula <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="campo-aula-horario"
                                        required
                                        value={formData.aula_id}
                                        onChange={(e) => setFormData({ ...formData, aula_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                    >
                                        <option value="">Seleccionar aula</option>
                                        {aulas.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.edificio} - {a.numero}{a.nombre ? ` (${a.nombre})` : ''} {a.disponible ? '' : '🔴'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Día de la Semana <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="campo-dia-horario"
                                    required
                                    value={formData.dia_semana}
                                    onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all"
                                >
                                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Hora Inicio <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="campo-hora-inicio-horario"
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
                                        id="campo-hora-fin-horario"
                                        required
                                        type="time"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.hora_fin}
                                        onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={cerrarModal} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    id="btn-guardar-horario"
                                    disabled={guardando}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingHorario ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
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
                                    ) : editingHorario ? 'Actualizar Horario' : 'Registrar Horario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
