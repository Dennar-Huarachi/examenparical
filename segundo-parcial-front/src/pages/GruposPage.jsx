import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TURNOS_COLOR = { Mañana: 'bg-amber-100 text-amber-700 border-amber-200', Tarde: 'bg-orange-100 text-orange-700 border-orange-200', Noche: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
const HORA_BASE = 7; const TOTAL_HORAS = 15; const TOTAL_MINUTOS = TOTAL_HORAS * 60;
const COLORES_MATERIA = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', bar: 'bg-blue-500' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', bar: 'bg-emerald-500' },
    { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', bar: 'bg-violet-500' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', bar: 'bg-rose-500' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', bar: 'bg-cyan-500' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', bar: 'bg-amber-500' },
];

function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function getTop(t) { return ((timeToMin(t) - HORA_BASE * 60) / TOTAL_MINUTOS) * 100; }
function getHeight(s, e) { return ((timeToMin(e) - timeToMin(s)) / TOTAL_MINUTOS) * 100; }
function getColor(mid, idx) { return COLORES_MATERIA[(mid + (idx || 0)) % COLORES_MATERIA.length]; }
function fmtHora(t) { return t?.slice(0, 5) || ''; }
function horasDelDia() { const hh = []; for (let h = HORA_BASE; h < HORA_BASE + TOTAL_HORAS; h++) hh.push(`${String(h).padStart(2, '0')}:00`); return hh; }

export default function GruposPage() {
    const [tab, setTab] = useState('grupos');
    const [grupos, setGrupos] = useState([]);
    const [loadingGrupos, setLoadingGrupos] = useState(false);
    const [statsCalc, setStatsCalc] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const [accionando, setAccionando] = useState(false);

    const mostrarToast = (texto, tipo) => { setToast({ visible: true, texto, tipo }); setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000); };

    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const cargarGrupos = useCallback(async () => {
        setLoadingGrupos(true);
        try {
            const res = await api.get('/grupos', authHeaders());
            if (res.data.success) setGrupos(res.data.data);
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al cargar grupos', 'error'); }
        finally { setLoadingGrupos(false); }
    }, []);

    const cargarEstadisticas = useCallback(async () => {
        setLoadingStats(true);
        try {
            const totalRes = await api.get('/postulantes', { params: { estado: 'inscrito', per_page: 1 }, ...authHeaders() });
            const total = totalRes.data?.total ?? 0;
            setStatsCalc({ total_inscritos: total, grupos_necesarios: Math.ceil(total / 70), capacidad_total: Math.ceil(total / 70) * 70 });
        } catch (e) { /* ignore */ }
        finally { setLoadingStats(false); }
    }, []);

    useEffect(() => { cargarGrupos(); cargarEstadisticas(); }, []);

    const handleCalcular = async () => {
        setAccionando(true);
        try {
            const res = await api.post('/grupos/calcular', {}, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarGrupos(); cargarEstadisticas(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al calcular grupos', 'error'); }
        finally { setAccionando(false); }
    };

    const handleRecalcular = async () => {
        if (!window.confirm('¿Recalcular grupos? Se eliminarán los grupos sin postulantes.')) return;
        setAccionando(true);
        try {
            const res = await api.post('/grupos/recalcular', {}, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarGrupos(); cargarEstadisticas(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al recalcular', 'error'); }
        finally { setAccionando(false); }
    };

    const handleEliminarGrupo = async (id) => {
        if (!window.confirm('¿Eliminar este grupo?')) return;
        setAccionando(true);
        try {
            const res = await api.delete(`/grupos/${id}`, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarGrupos(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al eliminar', 'error'); }
        finally { setAccionando(false); }
    };

    // ── CU23: Asignación ──
    const [postulantesData, setPostulantesData] = useState([]);
    const [loadingPostulantes, setLoadingPostulantes] = useState(false);
    const [filtroGrupo, setFiltroGrupo] = useState('');
    const [filtroTurno, setFiltroTurno] = useState('');
    const [estAsignacion, setEstAsignacion] = useState(null);
    const [asignacionModal, setAsignacionModal] = useState(null);
    const [grupoSelect, setGrupoSelect] = useState('');
    const [postulantesGrupo, setPostulantesGrupo] = useState([]);
    const [postulantesGrupoOpen, setPostulantesGrupoOpen] = useState(null);
    const [autoResultado, setAutoResultado] = useState(null);

    const cargarEstAsignacion = useCallback(async () => {
        try {
            const res = await api.get('/grupos/estadisticas-asignacion', authHeaders());
            if (res.data.success) setEstAsignacion(res.data.data);
        } catch (e) { /* ignore */ }
    }, []);

    const cargarPostulantesAsignacion = useCallback(async () => {
        setLoadingPostulantes(true);
        try {
            const params = { estado: 'inscrito', per_page: 200 };
            const res = await api.get('/postulantes', { params, ...authHeaders() });
            if (res.data.success) setPostulantesData(res.data.data || []);
        } catch (e) { /* ignore */ }
        finally { setLoadingPostulantes(false); }
    }, []);

    useEffect(() => { if (tab === 'asignar') { cargarEstAsignacion(); cargarPostulantesAsignacion(); } }, [tab]);

    const handleAsignarAuto = async () => {
        if (!window.confirm('¿Asignar automáticamente todos los postulantes sin grupo?')) return;
        setAccionando(true);
        try {
            const res = await api.post('/grupos/asignar-postulantes', {}, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); setAutoResultado(res.data.data); cargarEstAsignacion(); cargarPostulantesAsignacion(); cargarGrupos(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error en asignación automática', 'error'); }
        finally { setAccionando(false); }
    };

    const abrirAsignarModal = (postulante) => {
        setAsignacionModal(postulante);
        setGrupoSelect('');
    };

    const handleAsignarManual = async () => {
        if (!grupoSelect) { mostrarToast('Selecciona un grupo', 'error'); return; }
        setAccionando(true);
        try {
            const res = await api.post('/grupos/asignar-manual', { postulante_id: asignacionModal.id, grupo_id: parseInt(grupoSelect) }, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); setAsignacionModal(null); cargarEstAsignacion(); cargarPostulantesAsignacion(); cargarGrupos(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al asignar', 'error'); }
        finally { setAccionando(false); }
    };

    const handleRemoverPostulante = async (postulanteId) => {
        if (!window.confirm('¿Remover este postulante del grupo?')) return;
        setAccionando(true);
        try {
            const res = await api.post('/grupos/remover-postulante', { postulante_id: postulanteId }, authHeaders());
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarEstAsignacion(); cargarPostulantesAsignacion(); cargarGrupos(); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al remover', 'error'); }
        finally { setAccionando(false); }
    };

    const abrirPostulantesGrupo = async (grupoId) => {
        setPostulantesGrupoOpen(grupoId);
        try {
            const res = await api.get(`/grupos/${grupoId}/postulantes`, authHeaders());
            if (res.data.success) setPostulantesGrupo(res.data.data.postulantes || []);
        } catch (e) { mostrarToast('Error al cargar postulantes', 'error'); setPostulantesGrupoOpen(null); }
    };

    const postulantesFiltrados = postulantesData.filter(p => {
        if (filtroGrupo) {
            const tieneGrupo = p.grupos && p.grupos.length > 0;
            if (filtroGrupo === 'con-grupo' && !tieneGrupo) return false;
            if (filtroGrupo === 'sin-grupo' && tieneGrupo) return false;
        }
        if (filtroTurno && p.turno_preferido !== filtroTurno) return false;
        return true;
    });

    const getGrupoPostulante = (p) => {
        if (!p.grupos || p.grupos.length === 0) return null;
        const grupo = grupos.find(g => g.id === p.grupos[0].id);
        return grupo || null;
    };

    // ── CU24: Docentes y aulas ──
    const [grupoHorarioId, setGrupoHorarioId] = useState('');
    const [horariosGrupo, setHorariosGrupo] = useState([]);
    const [agrupadosMateria, setAgrupadosMateria] = useState([]);
    const [loadingHorarios, setLoadingHorarios] = useState(false);
    const [materiasSistema, setMateriasSistema] = useState([]);
    const [docentesDisp, setDocentesDisp] = useState([]);
    const [aulasDisp, setAulasDisp] = useState([]);
    const [asignarDocModal, setAsignarDocModal] = useState(null);
    const [formHorario, setFormHorario] = useState({ docente_id: '', aula_id: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00' });
    const [warningCruce, setWarningCruce] = useState('');

    useEffect(() => {
        if (tab === 'docentes') { cargarMateriasYAulas(); }
    }, [tab]);

    useEffect(() => {
        if (grupoHorarioId) cargarHorariosGrupo(grupoHorarioId);
        else { setHorariosGrupo([]); setAgrupadosMateria([]); }
    }, [grupoHorarioId]);

    const cargarMateriasYAulas = async () => {
        try {
            const [mRes, dRes, aRes] = await Promise.all([
                api.get('/materias', authHeaders()),
                api.get('/docentes', authHeaders()),
                api.get('/aulas', authHeaders()),
            ]);
            if (mRes.data.success) setMateriasSistema(mRes.data.data?.materias || mRes.data.data || []);
            if (dRes.data.success) setDocentesDisp(dRes.data.data || []);
            if (aRes.data.success) setAulasDisp(aRes.data.data?.aulas || aRes.data.data || []);
        } catch (e) { /* ignore */ }
    };

    const cargarHorariosGrupo = async (gid) => {
        setLoadingHorarios(true);
        try {
            const res = await api.get(`/grupos/${gid}/horarios`, authHeaders());
            if (res.data.success) { setHorariosGrupo(res.data.data.horarios || []); setAgrupadosMateria(res.data.data.agrupados || []); }
        } catch (e) { mostrarToast('Error al cargar horarios', 'error'); }
        finally { setLoadingHorarios(false); }
    };

    const abrirAsignarDocente = (materiaId) => {
        setAsignarDocModal(materiaId);
        setFormHorario({ docente_id: '', aula_id: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00' });
        setWarningCruce('');
    };

    const verificarCruce = (campo, valor) => {
        const f = { ...formHorario, [campo]: valor };
        if (!f.docente_id || !f.aula_id || !f.hora_inicio || !f.hora_fin) { setWarningCruce(''); return; }
        if (f.hora_inicio >= f.hora_fin) { setWarningCruce('La hora de fin debe ser posterior a la inicio.'); return; }
        const cruce = horariosGrupo.find(h => {
            if (h.dia_semana !== f.dia_semana) return false;
            if (h.id === f?.editId) return false;
            return timeToMin(h.hora_inicio) < timeToMin(f.hora_fin) && timeToMin(h.hora_fin) > timeToMin(f.hora_inicio);
        });
        if (cruce) {
            const cruceDocente = parseInt(f.docente_id) === cruce.docente_id;
            const cruceAula = parseInt(f.aula_id) === cruce.aula_id;
            if (cruceDocente) setWarningCruce(`El docente ya tiene clase en ${f.dia_semana} ${f.hora_inicio}-${f.hora_fin}.`);
            else if (cruceAula) setWarningCruce(`El aula ya está ocupada en ${f.dia_semana} ${f.hora_inicio}-${f.hora_fin}.`);
            else setWarningCruce('');
        } else setWarningCruce('');
    };

    const handleGuardarHorario = async () => {
        if (!formHorario.docente_id || !formHorario.aula_id || !formHorario.hora_inicio || !formHorario.hora_fin) {
            mostrarToast('Completa todos los campos del horario', 'error'); return;
        }
        if (formHorario.hora_inicio >= formHorario.hora_fin) { mostrarToast('La hora de fin debe ser posterior a la inicio', 'error'); return; }
        setAccionando(true);
        try {
            const payload = { grupo_id: parseInt(grupoHorarioId), materia_id: asignarDocModal, docente_id: parseInt(formHorario.docente_id), aula_id: parseInt(formHorario.aula_id), dia_semana: formHorario.dia_semana, hora_inicio: formHorario.hora_inicio, hora_fin: formHorario.hora_fin };
            const res = await api.post('/horarios', payload, authHeaders());
            if (res.data.success) { mostrarToast('Horario asignado correctamente', 'exito'); setAsignarDocModal(null); cargarHorariosGrupo(grupoHorarioId); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al asignar horario', 'error'); }
        finally { setAccionando(false); }
    };

    const handleEliminarHorario = async (hid) => {
        if (!window.confirm('¿Eliminar este horario?')) return;
        setAccionando(true);
        try {
            const res = await api.delete(`/horarios/${hid}`, authHeaders());
            if (res.data.success) { mostrarToast('Horario eliminado', 'exito'); cargarHorariosGrupo(grupoHorarioId); }
        } catch (e) { mostrarToast(e.response?.data?.message || 'Error al eliminar', 'error'); }
        finally { setAccionando(false); }
    };

    const gruposActivos = grupos.filter(g => g.estado === 'activo');
    const hayPostulantesAsignados = grupos.some(g => g.total_inscritos > 0);

    return (
        <div className="max-w-7xl mx-auto mt-3 sm:mt-6 px-3 sm:px-4 pb-10">
            {/* ── Toast responsivo ── */}
            {toast.visible && (
                <div className={`fixed top-4 sm:top-6 z-50 px-4 sm:px-6 py-3 rounded-xl shadow-xl border text-sm font-bold flex items-center gap-2 transition-all animate-in slide-in-from-top ${
                    toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                } left-4 right-4 sm:left-auto sm:right-6 sm:w-auto`}>
                    <span className="flex-1 sm:flex-none">{toast.texto}</span>
                    <button onClick={() => setToast({ visible: false })} className="hover:opacity-70 cursor-pointer shrink-0">&times;</button>
                </div>
            )}

            {/* ── Header ── */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Grupos</h1>
                <p className="text-slate-500 mt-1 text-xs sm:text-sm">Calcula grupos, asigna postulantes, docentes y horarios.</p>
            </div>

            {/* ── Tabs con scroll horizontal en mobile ── */}
            <div className="border-b border-slate-200 mb-4 sm:mb-6 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="flex gap-1 min-w-max sm:min-w-0">
                    {[
                        { key: 'grupos', label: 'Grupos' },
                        { key: 'asignar', label: 'Postulantes' },
                        { key: 'docentes', label: 'Docentes' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                                tab === t.key ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* ════════════════════════════ TAB 1: GRUPOS ════════════════════════════ */}
            {tab === 'grupos' && (
                <>
                    {/* Info panel responsive */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
                        <h3 className="font-bold text-slate-700 text-xs sm:text-sm uppercase tracking-wider mb-3">Postulantes inscritos</h3>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                            {[
                                { label: 'Inscritos', value: statsCalc?.total_inscritos ?? 0, color: 'text-slate-900' },
                                { label: 'Grupos nec.', value: statsCalc?.grupos_necesarios ?? 0, color: 'text-blue-600' },
                                { label: 'Capacidad tot.', value: statsCalc?.capacidad_total ?? 0, color: 'text-green-600' },
                            ].map(s => (
                                <div key={s.label} className="bg-slate-50 rounded-xl p-2 sm:p-4 text-center">
                                    <p className={`text-xl sm:text-3xl font-black ${s.color}`}>{loadingStats ? '...' : s.value}</p>
                                    <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            {gruposActivos.length === 0 && (
                                <button onClick={handleCalcular} disabled={accionando || loadingStats}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-md text-xs sm:text-sm cursor-pointer transition-all text-center">
                                    {accionando ? 'Calculando...' : 'Calcular grupos'}
                                </button>
                            )}
                            {gruposActivos.length > 0 && !hayPostulantesAsignados && (
                                <button onClick={handleRecalcular} disabled={accionando}
                                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-md text-xs sm:text-sm cursor-pointer transition-all text-center">
                                    {accionando ? 'Recalculando...' : 'Recalcular grupos'}
                                </button>
                            )}
                            {hayPostulantesAsignados && (
                                <div className="w-full sm:w-auto bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center sm:text-left">
                                    No se puede recalcular, hay postulantes asignados.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Group cards responsive */}
                    {loadingGrupos ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                    ) : gruposActivos.length === 0 ? (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
                            <p className="text-slate-400 font-medium text-sm sm:text-base">No hay grupos creados para la gestión activa.</p>
                            <p className="text-slate-300 text-xs sm:text-sm mt-1">Usa el botón "Calcular grupos" para generar grupos.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {gruposActivos.map(g => {
                                const pct = g.porcentaje_ocupacion || 0;
                                let barColor = 'bg-green-500';
                                if (pct >= 100) barColor = 'bg-red-500';
                                else if (pct >= 80) barColor = 'bg-yellow-500';
                                return (
                                    <div key={g.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all">
                                        {/* Header con badges */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base break-words">{g.nombre}</h3>
                                            <div className="flex gap-1 shrink-0 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border ${TURNOS_COLOR[g.turno?.nombre] || 'bg-slate-100 text-slate-600'}`}>
                                                    {g.turno?.nombre || '—'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border ${g.modalidad === 'virtual' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                    {g.modalidad || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barra de ocupación */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 mb-1">
                                                <span>{g.total_inscritos} / {g.capacidad_maxima}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5">
                                                <div className={`h-2 sm:h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="text-[10px] sm:text-xs text-slate-500 mb-3 sm:mb-4">
                                            Materias: {g.materias_con_docente ?? 0} / {g.total_materias ?? 0} con docente
                                        </div>

                                        {/* Botones: stack en mobile, row en desktop */}
                                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                                            <button onClick={() => abrirPostulantesGrupo(g.id)}
                                                className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer text-center">
                                                Postulantes
                                            </button>
                                            <button onClick={() => { setTab('docentes'); setGrupoHorarioId(g.id.toString()); }}
                                                className="w-full sm:w-auto bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer text-center">
                                                Docentes
                                            </button>
                                            <button onClick={() => handleEliminarGrupo(g.id)}
                                                className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer text-center">
                                                Eliminar
                                            </button>
                                        </div>

                                        {/* Postulantes expandido */}
                                        {postulantesGrupoOpen === g.id && (
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Postulantes ({postulantesGrupo.length})</h4>
                                                    <button onClick={() => { setPostulantesGrupoOpen(null); setPostulantesGrupo([]); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <div className="max-h-40 overflow-y-auto space-y-1">
                                                    {postulantesGrupo.map(p => (
                                                        <div key={p.id} className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs flex justify-between gap-2">
                                                            <span className="font-semibold text-slate-700 truncate">{p.nombres} {p.apellidos}</span>
                                                            <span className="text-slate-400 shrink-0">{p.ci}</span>
                                                        </div>
                                                    ))}
                                                    {postulantesGrupo.length === 0 && <p className="text-[10px] sm:text-xs text-slate-400 text-center py-2">Sin postulantes.</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ════════════════════════════ TAB 2: ASIGNAR POSTULANTES ════════════════════════════ */}
            {tab === 'asignar' && (
                <>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                            <div className="bg-slate-50 rounded-xl p-2 sm:p-4 text-center">
                                <p className="text-xl sm:text-3xl font-black text-slate-900">{estAsignacion?.total_inscritos ?? 0}</p>
                                <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5">Total insc.</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2 sm:p-4 text-center">
                                <p className="text-xl sm:text-3xl font-black text-green-600">{estAsignacion?.con_grupo ?? 0}</p>
                                <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5">Con grupo</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2 sm:p-4 text-center">
                                <p className={`text-xl sm:text-3xl font-black ${(estAsignacion?.sin_grupo ?? 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>{estAsignacion?.sin_grupo ?? 0}</p>
                                <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5">Sin grupo</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                            {(estAsignacion?.sin_grupo ?? 0) > 0 && (
                                <button onClick={handleAsignarAuto} disabled={accionando}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-md text-xs sm:text-sm cursor-pointer transition-all text-center">
                                    {accionando ? 'Asignando...' : 'Asignar automáticamente'}
                                </button>
                            )}
                            {autoResultado && (
                                <div className="w-full sm:w-auto bg-green-50 border border-green-200 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm text-center sm:text-left">
                                    <span className="font-bold text-green-700">{autoResultado.total_asignados} asignados</span>
                                    {autoResultado.total_sin_asignar > 0 && <span className="text-red-600 ml-1 sm:ml-2">{autoResultado.total_sin_asignar} sin asignar</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {autoResultado && autoResultado.detalle_por_grupo?.length > 0 && (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 sm:mb-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Grupo</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Turno</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Asig.</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Ocup.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {autoResultado.detalle_por_grupo.map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-900">{d.grupo}</td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600">{d.turno}</td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-blue-600">{d.asignados}</td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">{d.ocupacion}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Filtros responsive */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                            <select className="p-2 border border-slate-200 rounded-xl text-xs sm:text-sm" value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="con-grupo">Con grupo</option>
                                <option value="sin-grupo">Sin grupo</option>
                            </select>
                            <select className="p-2 border border-slate-200 rounded-xl text-xs sm:text-sm" value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}>
                                <option value="">Todos los turnos</option>
                                <option value="mañana">Mañana</option>
                                <option value="tarde">Tarde</option>
                                <option value="noche">Noche</option>
                            </select>
                            <span className="text-xs sm:text-sm font-bold text-slate-400 sm:ml-auto text-center sm:text-left">{postulantesFiltrados.length} postulantes</span>
                        </div>
                    </div>

                    {/* Tabla postulantes responsive */}
                    {loadingPostulantes ? (
                        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                    ) : postulantesFiltrados.length === 0 ? (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
                            <p className="text-slate-400 font-medium text-sm sm:text-base">No hay postulantes con los filtros seleccionados.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">CI</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Nombre</th>
                                            <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Turno</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Grupo</th>
                                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {postulantesFiltrados.map(p => {
                                            const grupo = getGrupoPostulante(p);
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-900">{p.ci}</td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 truncate max-w-[100px] sm:max-w-none">{p.nombres} {p.apellidos}</td>
                                                    <td className="hidden sm:table-cell px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 capitalize">{p.turno_preferido || '—'}</td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                        {grupo ? (
                                                            <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">{grupo.nombre}</span>
                                                        ) : (
                                                            <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">Sin grupo</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                                                        {!grupo && (
                                                            <button onClick={() => abrirAsignarModal(p)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">
                                                                Asignar
                                                            </button>
                                                        )}
                                                        {grupo && (
                                                            <div className="flex gap-1 justify-end flex-wrap">
                                                                <button onClick={() => abrirAsignarModal(p)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">
                                                                    Reasig.
                                                                </button>
                                                                <button onClick={() => handleRemoverPostulante(p.id)} disabled={accionando} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">
                                                                    Remover
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Modal asignar - full width en mobile */}
                    {asignacionModal && (
                        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
                            <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-4 sm:p-6 mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
                                <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-3 sm:mb-4">Asignar a grupo</h3>
                                <p className="text-xs sm:text-sm text-slate-600 mb-3 break-words">
                                    <strong>{asignacionModal.nombres} {asignacionModal.apellidos}</strong> ({asignacionModal.ci})
                                </p>
                                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Grupo</label>
                                <select className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm mb-4" value={grupoSelect} onChange={e => setGrupoSelect(e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    {estAsignacion?.grupos?.filter(g => g.cupo_disponible > 0).map(g => (
                                        <option key={g.id} value={g.id}>{g.nombre} ({g.turno}) — {g.cupo_disponible} libres</option>
                                    ))}
                                </select>
                                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                    <button onClick={() => setAsignacionModal(null)} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer order-2 sm:order-1">Cancelar</button>
                                    <button onClick={handleAsignarManual} disabled={accionando || !grupoSelect} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-xs sm:text-sm cursor-pointer order-1 sm:order-2">
                                        {accionando ? 'Asignando...' : 'Asignar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ════════════════════════════ TAB 3: DOCENTES Y AULAS ════════════════════════════ */}
            {tab === 'docentes' && (
                <>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Grupo</label>
                            <select className="p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm w-full sm:flex-1" value={grupoHorarioId} onChange={e => setGrupoHorarioId(e.target.value)}>
                                <option value="">-- Seleccionar grupo --</option>
                                {gruposActivos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nombre} ({g.turno?.nombre})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!grupoHorarioId && (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
                            <p className="text-slate-400 font-medium text-sm sm:text-base">Selecciona un grupo para gestionar sus horarios.</p>
                        </div>
                    )}

                    {grupoHorarioId && (
                        <>
                            {/* Grilla semanal con scroll */}
                            <h3 className="font-bold text-slate-800 text-sm sm:text-lg mb-2 sm:mb-3">Horarios del grupo</h3>
                            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 sm:mb-6">
                                {loadingHorarios ? (
                                    <div className="flex justify-center py-12 sm:py-16"><div className="animate-spin rounded-full h-8 sm:h-10 w-8 sm:w-10 border-b-2 border-blue-600"></div></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[750px] sm:min-w-[900px]">
                                            <div className="grid" style={{ gridTemplateColumns: '60px sm:70px repeat(6, 1fr)' }}>
                                                <div className="bg-slate-50 border-b border-r border-slate-200 px-1 sm:px-2 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase text-center sticky left-0">Hora</div>
                                                {DIAS.map(d => <div key={d} className="bg-slate-50 border-b border-r border-slate-200 px-1 sm:px-2 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase text-center truncate">{d}</div>)}

                                                <div className="bg-white border-r border-slate-100 relative" style={{ height: '450px sm:height-600px' }}>
                                                    {horasDelDia().map((h, i) => (
                                                        <div key={h} className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'} flex items-start px-1`}
                                                            style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}>
                                                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 -mt-2">{h}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {DIAS.map(dia => (
                                                    <div key={dia} className="bg-white border-r border-slate-100 relative" style={{ height: '450px' }}>
                                                        {horasDelDia().map((h, i) => (
                                                            <div key={h} className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'}`}
                                                                style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }} />
                                                        ))}
                                                        {horariosGrupo.filter(h => h.dia_semana === dia).map((h, idx) => {
                                                            const color = getColor(h.materia_id, idx);
                                                            return (
                                                                <div key={h.id}
                                                                    className={`absolute left-0.5 sm:left-1 right-0.5 sm:right-1 ${color.bg} ${color.border} border rounded overflow-hidden z-10`}
                                                                    style={{ top: `${getTop(h.hora_inicio)}%`, height: `${getHeight(h.hora_inicio, h.hora_fin)}%`, minHeight: '28px sm:min-height-36px' }}>
                                                                    <div className={`h-0.5 sm:h-1 ${color.bar} rounded-t`} />
                                                                    <div className="px-1 sm:px-2 py-0.5 sm:py-1 text-[7px] sm:text-[10px] leading-tight">
                                                                        <p className={`font-extrabold ${color.text} truncate`}>{h.materia?.nombre || '—'}</p>
                                                                        <p className="text-slate-500 truncate hidden sm:block">{h.docente?.postulante_docente?.nombres?.split(' ')[0] || '—'}</p>
                                                                        <p className="text-slate-400 truncate hidden sm:block">{h.aula?.edificio}-{h.aula?.numero}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tabla materias - columnas responsive */}
                            <h3 className="font-bold text-slate-800 text-sm sm:text-lg mb-2 sm:mb-3">Asignación por materia</h3>
                            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 sm:mb-6">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Materia</th>
                                                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Docente</th>
                                                <th className="hidden md:table-cell px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Aula</th>
                                                <th className="hidden md:table-cell px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Horario</th>
                                                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {materiasSistema.length === 0 ? (
                                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs sm:text-sm">No hay materias registradas.</td></tr>
                                            ) : (
                                                materiasSistema.map(m => {
                                                    const horariosMateria = horariosGrupo.filter(h => h.materia_id === m.id);
                                                    const tieneHorario = horariosMateria.length > 0;
                                                    return (
                                                        <tr key={m.id} className="hover:bg-slate-50/50">
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-slate-900 text-[11px] sm:text-sm">{m.nombre}</td>
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                                                                {tieneHorario ? horariosMateria.map(h => (
                                                                    <span key={h.id} className="bg-green-100 text-green-700 border border-green-200 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold mr-1 whitespace-nowrap">
                                                                        {h.docente?.postulante_docente?.nombres?.split(' ')[0] || '—'}
                                                                    </span>
                                                                )) : (
                                                                    <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold">Sin asignar</span>
                                                                )}
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-sm">
                                                                {tieneHorario ? horariosMateria.map(h => <span key={h.id} className="block">{h.aula?.edificio} - {h.aula?.numero}</span>) : '—'}
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-sm">
                                                                {tieneHorario ? horariosMateria.map(h => <span key={h.id} className="block">{h.dia_semana?.slice(0, 3)} {fmtHora(h.hora_inicio)}-{fmtHora(h.hora_fin)}</span>) : '—'}
                                                            </td>
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                                                                {!tieneHorario && (
                                                                    <button onClick={() => abrirAsignarDocente(m.id)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">
                                                                        Asignar
                                                                    </button>
                                                                )}
                                                                {tieneHorario && horariosMateria.map(h => (
                                                                    <button key={h.id} onClick={() => handleEliminarHorario(h.id)} disabled={accionando} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">
                                                                        Quitar
                                                                    </button>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Modal asignar docente - responsive */}
                            {asignarDocModal && (
                                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
                                    <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 p-4 sm:p-6 mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                                            <h3 className="font-bold text-base sm:text-lg text-slate-900">Asignar horario</h3>
                                            <button onClick={() => setAsignarDocModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-slate-700 mb-3 sm:mb-4">Materia: {materiasSistema.find(m => m.id === asignarDocModal)?.nombre}</p>

                                        <div className="space-y-2.5 sm:space-y-3">
                                            <div>
                                                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Docente</label>
                                                <select className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm" value={formHorario.docente_id} onChange={e => { setFormHorario({ ...formHorario, docente_id: e.target.value }); verificarCruce('docente_id', e.target.value); }}>
                                                    <option value="">Seleccionar</option>
                                                    {docentesDisp.map(d => (
                                                        <option key={d.id} value={d.id}>
                                                            {d.postulante_docente ? `${d.postulante_docente.nombres} ${d.postulante_docente.apellidos}` : `Docente #${d.id}`}
                                                            {d.horas_disponibles !== undefined ? ` (${d.horas_disponibles} hrs)` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Aula</label>
                                                <select className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm" value={formHorario.aula_id} onChange={e => { setFormHorario({ ...formHorario, aula_id: e.target.value }); verificarCruce('aula_id', e.target.value); }}>
                                                    <option value="">Seleccionar</option>
                                                    {aulasDisp.filter(a => a.disponible !== false).map(a => (
                                                        <option key={a.id} value={a.id}>{a.edificio} - {a.numero}{a.nombre ? ` (${a.nombre})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Día</label>
                                                <select className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm" value={formHorario.dia_semana} onChange={e => { setFormHorario({ ...formHorario, dia_semana: e.target.value }); verificarCruce('dia_semana', e.target.value); }}>
                                                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                <div>
                                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Inicio</label>
                                                    <input type="time" className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm" value={formHorario.hora_inicio}
                                                        onChange={e => { setFormHorario({ ...formHorario, hora_inicio: e.target.value }); verificarCruce('hora_inicio', e.target.value); }} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fin</label>
                                                    <input type="time" className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm" value={formHorario.hora_fin}
                                                        onChange={e => { setFormHorario({ ...formHorario, hora_fin: e.target.value }); verificarCruce('hora_fin', e.target.value); }} />
                                                </div>
                                            </div>

                                            {warningCruce && (
                                                <div className="bg-red-50 border border-red-200 text-red-700 px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold">{warningCruce}</div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100">
                                            <button onClick={() => setAsignarDocModal(null)} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer order-2 sm:order-1">Cancelar</button>
                                            <button onClick={handleGuardarHorario} disabled={accionando || !!warningCruce}
                                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-xs sm:text-sm cursor-pointer order-1 sm:order-2">
                                                {accionando ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabla resumen horarios responsive */}
                            {horariosGrupo.length > 0 && (
                                <>
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-lg mb-2 sm:mb-3">Resumen de horarios</h3>
                                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Materia</th>
                                                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Docente</th>
                                                        <th className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Aula</th>
                                                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Día</th>
                                                        <th className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Horario</th>
                                                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {horariosGrupo.map(h => (
                                                        <tr key={h.id} className="hover:bg-slate-50/50">
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-slate-900 text-[11px] sm:text-sm">{h.materia?.nombre || '—'}</td>
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-700 text-[11px] sm:text-sm truncate max-w-[80px] sm:max-w-none">
                                                                {h.docente?.postulante_docente?.nombres?.split(' ')[0] || '—'}
                                                            </td>
                                                            <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-sm">
                                                                {h.aula ? `${h.aula.edificio} - ${h.aula.numero}` : '—'}
                                                            </td>
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-sm">{h.dia_semana?.slice(0, 3)}</td>
                                                            <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-[11px] sm:text-sm font-mono">{fmtHora(h.hora_inicio)}-{fmtHora(h.hora_fin)}</td>
                                                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                                                                <button onClick={() => handleEliminarHorario(h.id)} disabled={accionando} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer">Quitar</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
