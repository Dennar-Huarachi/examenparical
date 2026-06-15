import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const BLOQUES_POR_TURNO = {
    'Mañana': [
        { nro: 1,  inicio: '07:00', fin: '07:45', label: '1° Periodo 07:00 - 07:45' },
        { nro: 2,  inicio: '07:45', fin: '08:30', label: '2° Periodo 07:45 - 08:30' },
        { nro: 3,  inicio: '08:30', fin: '09:15', label: '3° Periodo 08:30 - 09:15' },
        { nro: 4,  inicio: '09:15', fin: '10:00', label: '4° Periodo 09:15 - 10:00' },
        { nro: 5,  inicio: '10:00', fin: '10:45', label: '5° Periodo 10:00 - 10:45' },
        { nro: 6,  inicio: '10:45', fin: '11:30', label: '6° Periodo 10:45 - 11:30' },
        { nro: 7,  inicio: '11:30', fin: '12:15', label: '7° Periodo 11:30 - 12:15' },
    ],
    'Tarde': [
        { nro: 1,  inicio: '14:00', fin: '14:45', label: '1° Periodo 14:00 - 14:45' },
        { nro: 2,  inicio: '14:45', fin: '15:30', label: '2° Periodo 14:45 - 15:30' },
        { nro: 3,  inicio: '15:30', fin: '16:15', label: '3° Periodo 15:30 - 16:15' },
        { nro: 4,  inicio: '16:15', fin: '17:00', label: '4° Periodo 16:15 - 17:00' },
        { nro: 5,  inicio: '17:00', fin: '17:45', label: '5° Periodo 17:00 - 17:45' },
        { nro: 6,  inicio: '17:45', fin: '18:30', label: '6° Periodo 17:45 - 18:30' },
    ],
    'Noche': [
        { nro: 1,  inicio: '19:00', fin: '19:45', label: '1° Periodo 19:00 - 19:45' },
        { nro: 2,  inicio: '19:45', fin: '20:30', label: '2° Periodo 19:45 - 20:30' },
        { nro: 3,  inicio: '20:30', fin: '21:15', label: '3° Periodo 20:30 - 21:15' },
        { nro: 4,  inicio: '21:15', fin: '22:00', label: '4° Periodo 21:15 - 22:00' },
        { nro: 5,  inicio: '22:00', fin: '22:45', label: '5° Periodo 22:00 - 22:45' },
        { nro: 6,  inicio: '22:45', fin: '23:30', label: '6° Periodo 22:45 - 23:30' },
    ],
};

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
    return t ? t.slice(0, 5) : '';
}

function horasDelDia() {
    const horas = [];
    for (let h = HORA_BASE; h < HORA_BASE + TOTAL_HORAS; h++) {
        horas.push(`${String(h).padStart(2, '0')}:00`);
    }
    return horas;
}

function calcularResumenBloques(bloquesDef, bloqueInicio, bloqueFin) {
    if (!bloqueInicio || !bloqueFin) return null;
    const primero = bloquesDef.find(b => b.nro === bloqueInicio);
    const ultimo = bloquesDef.find(b => b.nro === bloqueFin);
    if (!primero || !ultimo) return null;
    const totalMinutos = timeToMinutes(ultimo.fin) - timeToMinutes(primero.inicio);
    const horas = Math.floor(totalMinutos / 60);
    const mins = totalMinutos % 60;
    const numBloques = bloqueFin - bloqueInicio + 1;
    return {
        horaInicio: primero.inicio,
        horaFin: ultimo.fin,
        totalMinutos,
        numBloques,
        texto: `${primero.inicio} a ${ultimo.fin} (${numBloques} bloque${numBloques > 1 ? 's' : ''} = ${horas}h${mins > 0 ? mins + 'min' : ''})`,
    };
}

export default function HorariosPage() {
    const [bloques, setBloques] = useState([]);
    const [agrupados, setAgrupados] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [turnos, setTurnos] = useState([]);

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);

    const [filtroGrupo, setFiltroGrupo] = useState('');
    const [filtroDocente, setFiltroDocente] = useState('');
    const [filtroAula, setFiltroAula] = useState('');

    const [formData, setFormData] = useState({
        grupo_id: '', materia_id: '', docente_id: '', aula_id: '',
        turno_id: '', dias: [], bloque_inicio: null, bloque_fin: null,
    });
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [selectingBloque, setSelectingBloque] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const disponibilidadTimeout = useRef(null);

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    useEffect(() => {
        cargarHorarios();
    }, [filtroGrupo, filtroDocente, filtroAula]);

    useEffect(() => {
        if (formData.grupo_id) {
            const grupo = grupos.find(g => g.id === Number(formData.grupo_id));
            if (grupo && grupo.turno_id) {
                setFormData(prev => ({ ...prev, turno_id: grupo.turno_id }));
            }
        }
    }, [formData.grupo_id, grupos]);

    useEffect(() => {
        if (disponibilidadTimeout.current) {
            clearTimeout(disponibilidadTimeout.current);
        }
        if (modalOpen && formData.grupo_id && formData.docente_id && formData.aula_id
            && formData.turno_id && formData.dias.length > 0 && formData.bloque_inicio && formData.bloque_fin) {
            setVerificando(true);
            disponibilidadTimeout.current = setTimeout(() => {
                verificarDisponibilidad();
            }, 400);
        } else {
            setDisponibilidad(null);
        }
        return () => {
            if (disponibilidadTimeout.current) clearTimeout(disponibilidadTimeout.current);
        };
    }, [formData.dias, formData.bloque_inicio, formData.bloque_fin, formData.turno_id,
        formData.grupo_id, formData.docente_id, formData.aula_id, modalOpen]);

    const cargarDatosIniciales = async () => {
        try {
            const [resGrupos, resDocentes, resAulas, resMaterias, resTurnos] = await Promise.all([
                api.get('/grupos'),
                api.get('/docentes'),
                api.get('/aulas'),
                api.get('/materias'),
                api.get('/turnos'),
            ]);
            if (resGrupos.data.success) setGrupos(resGrupos.data.data || []);
            if (resDocentes.data.success) setDocentes(resDocentes.data.data || []);
            if (resAulas.data.success) setAulas(resAulas.data.data?.aulas || []);
            if (resMaterias.data.success) setMaterias(resMaterias.data.data?.materias || []);
            if (resTurnos.data.success) setTurnos(resTurnos.data.data || []);
        } catch (error) {
            mostrarToast('Error al cargar datos iniciales.', 'error');
        }
    };

    const cargarHorarios = useCallback(async () => {
        setLoading(true);
        const params = {};
        if (filtroGrupo) params.grupo_id = filtroGrupo;
        if (filtroDocente) params.docente_id = filtroDocente;
        if (filtroAula) params.aula_id = filtroAula;

        try {
            const res = await api.get('/horarios', { params });
            if (res.data.success) {
                setBloques(res.data.data?.bloques || []);
                setAgrupados(res.data.data?.agrupados || []);
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar horarios.', 'error');
        } finally {
            setLoading(false);
        }
    }, [filtroGrupo, filtroDocente, filtroAula]);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingAssignment(null);
        setFormData({
            grupo_id: '', materia_id: '', docente_id: '', aula_id: '',
            turno_id: '', dias: [], bloque_inicio: null, bloque_fin: null,
        });
        setDisponibilidad(null);
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setEditingAssignment(null);
        setDisponibilidad(null);
    };

    const toggleDia = (dia) => {
        setFormData(prev => ({
            ...prev,
            dias: prev.dias.includes(dia)
                ? prev.dias.filter(d => d !== dia)
                : [...prev.dias, dia],
        }));
    };

    const turnoSeleccionado = turnos.find(t => t.id === Number(formData.turno_id));
    const bloquesDef = turnoSeleccionado ? BLOQUES_POR_TURNO[turnoSeleccionado.nombre] || [] : [];
    const resumenBloques = calcularResumenBloques(bloquesDef, formData.bloque_inicio, formData.bloque_fin);

    const handleClickBloque = (nro) => {
        if (!selectingBloque) {
            setFormData(prev => ({ ...prev, bloque_inicio: nro, bloque_fin: null }));
            setSelectingBloque(true);
        } else {
            if (nro < formData.bloque_inicio) {
                setFormData(prev => ({ ...prev, bloque_inicio: nro, bloque_fin: formData.bloque_inicio }));
            } else {
                setFormData(prev => ({ ...prev, bloque_fin: nro }));
            }
            setSelectingBloque(false);
        }
    };

    const quitarSeleccionBloques = () => {
        setFormData(prev => ({ ...prev, bloque_inicio: null, bloque_fin: null }));
        setSelectingBloque(false);
    };

    const verificarDisponibilidad = async () => {
        if (!formData.grupo_id || !formData.docente_id || !formData.aula_id
            || !formData.turno_id || formData.dias.length === 0
            || !formData.bloque_inicio || !formData.bloque_fin) return;

        setVerificando(true);
        try {
            const res = await api.get('/horarios/verificar-disponibilidad', {
                params: {
                    grupo_id: formData.grupo_id,
                    docente_id: formData.docente_id,
                    aula_id: formData.aula_id,
                    turno_id: formData.turno_id,
                    bloque_inicio: formData.bloque_inicio,
                    bloque_fin: formData.bloque_fin,
                    dias: formData.dias,
                },
            });
            if (res.data.success) {
                setDisponibilidad(res.data.data);
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al verificar disponibilidad.';
            setDisponibilidad({ todo_libre: false, disponibilidad: [], error: msg });
        } finally {
            setVerificando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.grupo_id) { mostrarToast('Selecciona un grupo.', 'error'); return; }
        if (!formData.materia_id) { mostrarToast('Selecciona una materia.', 'error'); return; }
        if (!formData.docente_id) { mostrarToast('Selecciona un docente.', 'error'); return; }
        if (!formData.aula_id) { mostrarToast('Selecciona un aula.', 'error'); return; }
        if (formData.dias.length === 0) { mostrarToast('Selecciona al menos un día.', 'error'); return; }
        if (!formData.bloque_inicio || !formData.bloque_fin) { mostrarToast('Selecciona los bloques horarios.', 'error'); return; }
        if (disponibilidad && !disponibilidad.todo_libre) { mostrarToast('Hay conflictos en uno o más días. Revisa la tabla de disponibilidad.', 'error'); return; }

        setGuardando(true);
        try {
            const payload = {
                grupo_id: Number(formData.grupo_id),
                materia_id: Number(formData.materia_id),
                docente_id: Number(formData.docente_id),
                aula_id: Number(formData.aula_id),
                turno_id: Number(formData.turno_id),
                bloque_inicio: formData.bloque_inicio,
                bloque_fin: formData.bloque_fin,
                dias: formData.dias,
            };

            let response;
            if (editingAssignment) {
                response = await api.put(`/horarios/${editingAssignment.id}`, payload);
            } else {
                response = await api.post('/horarios', payload);
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
        } finally {
            setGuardando(false);
        }
    };

    const eliminarHorario = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este bloque de horario?')) return;
        try {
            const res = await api.delete(`/horarios/${id}`);
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

    const eliminarTodos = async (grupoId, materiaId) => {
        if (!window.confirm('¿Seguro que deseas eliminar TODOS los bloques de esta materia en este grupo?')) return;
        try {
            const res = await api.delete(`/horarios/0`, {
                params: { modo: 'todos', grupo_id: grupoId, materia_id: materiaId },
            });
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
    const getTurnoNombre = (id) => {
        const t = turnos.find(x => x.id === id);
        return t ? t.nombre : '—';
    };

    const bloquesPorDia = {};
    DIAS.forEach(d => { bloquesPorDia[d] = []; });
    (bloques || []).forEach(b => {
        if (bloquesPorDia[b.dia_semana]) {
            bloquesPorDia[b.dia_semana].push(b);
        }
    });

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU10: Horarios</h1>
                    <p className="text-slate-500 mt-1 text-sm">Grilla semanal de horarios con bloques de 45 min por turno.</p>
                </div>
                <button
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
                        <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="">Todos</option>
                            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Docente</label>
                        <select value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
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
                        <select value={filtroAula} onChange={(e) => setFiltroAula(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="">Todas</option>
                            {aulas.map(a => (
                                <option key={a.id} value={a.id}>{a.edificio} - {a.numero}{a.nombre ? ` (${a.nombre})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-sm font-bold text-slate-400 ml-auto">
                        {bloques.length} bloque{bloques.length !== 1 ? 's' : ''}
                        {agrupados.length > 0 && ` (${agrupados.length} asignación${agrupados.length !== 1 ? 'es' : ''})`}
                    </span>
                </div>
            </div>

            {loading && bloques.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                    <p className="text-sm text-slate-400 font-medium">Cargando horarios...</p>
                </div>
            ) : bloques.length === 0 && !loading ? (
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
                                        <div key={h}
                                            className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'} flex items-start px-1.5`}
                                            style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}>
                                            <span className="text-[10px] font-bold text-slate-400 -mt-2 sticky left-0">{h}</span>
                                        </div>
                                    ))}
                                </div>

                                {DIAS.map(dia => (
                                    <div key={dia} className="bg-white border-r border-slate-100 relative" style={{ height: '900px' }}>
                                        {horasDelDia().map((h, i) => (
                                            <div key={h}
                                                className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'}`}
                                                style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }} />
                                        ))}
                                        {bloquesPorDia[dia].map((b, idx) => {
                                            const color = getColor(b.materia_id, idx);
                                            const grupo = grupos.find(g => g.id === b.grupo_id);
                                            const materia = materias.find(m => m.id === b.materia_id);
                                            const docente = docentes.find(d => d.id === b.docente_id);
                                            const aula = aulas.find(a => a.id === b.aula_id);
                                            const docenteNombre = docente?.postulante_docente
                                                ? `${docente.postulante_docente.nombres} ${docente.postulante_docente.apellidos}`
                                                : '—';
                                            const aulaLabel = aula ? `${aula.edificio} - ${aula.numero}` : '—';
                                            const turnoNombre = getTurnoNombre(b.turno_id);

                                            return (
                                                <div key={b.id}
                                                    onClick={() => abrirCrearModal()}
                                                    className={`absolute left-1 right-1 ${color.bg} ${color.border} border rounded-lg overflow-hidden cursor-pointer hover:shadow-md hover:brightness-95 transition-all group z-10`}
                                                    style={{ top: `${getTop(b.hora_inicio)}%`, height: `${getHeight(b.hora_inicio, b.hora_fin)}%`, minHeight: '40px' }}
                                                    title={`${materia?.nombre || '—'}\n${grupo?.nombre || '—'}\nDocente: ${docenteNombre}\nAula: ${aulaLabel}\n${turnoNombre} | Bloque ${b.bloque_inicio}-${b.bloque_fin}`}>
                                                    <div className={`h-1 ${color.bar} rounded-t-lg`} />
                                                    <div className="px-2 py-1 text-[10px] leading-tight">
                                                        <p className={`font-extrabold ${color.text} truncate`}>{materia?.nombre || '—'}</p>
                                                        <p className="font-semibold text-slate-600 truncate">{grupo?.nombre || '—'}</p>
                                                        <p className="text-slate-500 truncate">{docenteNombre.split(' ').slice(0, 2).join(' ') || '—'}</p>
                                                        <p className="text-slate-400 truncate">{aulaLabel}</p>
                                                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                                                            {formatHora(b.hora_inicio)} - {formatHora(b.hora_fin)}
                                                        </p>
                                                    </div>
                                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); eliminarHorario(b.id); }}
                                                            className="bg-white/80 hover:bg-red-100 rounded p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                                            title="Eliminar bloque">
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

            {agrupados.length > 0 && (
                <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Asignaciones por materia</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grupo</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Materia</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Docente</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aula</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Turno</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Días</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bloque</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {agrupados.map((ag, i) => {
                                    const diasStr = ag.bloques.map(b => b.dia_semana).join(', ');
                                    const bloqueStr = `${ag.bloques[0]?.bloque_inicio || '—'}° al ${ag.bloques[0]?.bloque_fin || '—'}°`;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-800">{ag.grupo.nombre}</td>
                                            <td className="px-4 py-3 text-slate-700">{ag.materia.nombre}</td>
                                            <td className="px-4 py-3 text-slate-700">{ag.docente.nombre}</td>
                                            <td className="px-4 py-3 text-slate-700">{ag.aula.label}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                                    {ag.turno?.nombre || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={diasStr}>{diasStr}</td>
                                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{bloqueStr}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => eliminarTodos(ag.grupo.id, ag.materia.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog" aria-modal="true">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[95vh] overflow-y-auto">
                        <div className="px-6 py-5 flex justify-between items-center text-white bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10">
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">
                                    {editingAssignment ? 'Editar Horario' : 'Registrar Nuevo Horario'}
                                </h2>
                                <p className="text-blue-100 text-xs mt-0.5">Selecciona días y bloques de 45 min</p>
                            </div>
                            <button onClick={cerrarModal} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Grupo <span className="text-red-500">*</span>
                                    </label>
                                    <select required value={formData.grupo_id}
                                        onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all">
                                        <option value="">Seleccionar grupo</option>
                                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                    </select>
                                    {formData.grupo_id && turnoSeleccionado && (
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                            Turno del grupo: {turnoSeleccionado.nombre}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Materia <span className="text-red-500">*</span>
                                    </label>
                                    <select required value={formData.materia_id}
                                        onChange={(e) => setFormData({ ...formData, materia_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all">
                                        <option value="">Seleccionar materia</option>
                                        {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Docente <span className="text-red-500">*</span>
                                    </label>
                                    <select required value={formData.docente_id}
                                        onChange={(e) => setFormData({ ...formData, docente_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all">
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
                                    <select required value={formData.aula_id}
                                        onChange={(e) => setFormData({ ...formData, aula_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all">
                                        <option value="">Seleccionar aula</option>
                                        {aulas.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.edificio} - {a.numero}{a.nombre ? ` (${a.nombre})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Días de la semana <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {DIAS.map(dia => {
                                        const activo = formData.dias.includes(dia);
                                        return (
                                            <button key={dia} type="button" onClick={() => toggleDia(dia)}
                                                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                                                    activo
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                                }`}>
                                                {dia}
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.dias.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-2 font-semibold">
                                        {formData.dias.length} día{formData.dias.length !== 1 ? 's' : ''} seleccionado{formData.dias.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>

                            {formData.turno_id && bloquesDef.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Bloques horarios — {turnoSeleccionado?.nombre} <span className="text-red-500">*</span>
                                        </label>
                                        {(formData.bloque_inicio || formData.bloque_fin) && (
                                            <button type="button" onClick={quitarSeleccionBloques}
                                                className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer">
                                                Limpiar selección
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {bloquesDef.map(b => {
                                            const seleccionado = formData.bloque_inicio && formData.bloque_fin
                                                && b.nro >= formData.bloque_inicio && b.nro <= formData.bloque_fin;
                                            const esInicio = b.nro === formData.bloque_inicio;
                                            const esFin = b.nro === formData.bloque_fin;
                                            const esPendiente = selectingBloque && !formData.bloque_fin && b.nro >= (formData.bloque_inicio || 0);

                                            return (
                                                <button key={b.nro} type="button" onClick={() => handleClickBloque(b.nro)}
                                                    className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer ${
                                                        seleccionado
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                            : esPendiente
                                                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                                                    } ${esInicio ? 'ring-2 ring-blue-400' : ''} ${esFin ? 'ring-2 ring-blue-400' : ''}`}>
                                                    <span className="block text-[10px] opacity-80">Periodo {b.nro}</span>
                                                    <span className="block text-[11px] font-mono mt-0.5">
                                                        {b.inicio} - {b.fin}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {resumenBloques && (
                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                            <p className="text-sm font-bold text-blue-800">
                                                Seleccionado: {resumenBloques.texto}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        Haz click en el bloque de inicio y luego en el bloque de fin para seleccionar un rango.
                                    </p>
                                </div>
                            )}

                            {formData.grupo_id && formData.docente_id && formData.aula_id
                                && formData.turno_id && formData.dias.length > 0
                                && formData.bloque_inicio && formData.bloque_fin && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Disponibilidad por día
                                        </label>
                                        {verificando && (
                                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Verificando...
                                            </span>
                                        )}
                                    </div>
                                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Día</th>
                                                    <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Bloque</th>
                                                    <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Hora inicio</th>
                                                    <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Hora fin</th>
                                                    <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {formData.dias.map(dia => {
                                                    const item = disponibilidad?.disponibilidad?.find(d => d.dia === dia);
                                                    const disponible = item?.disponible ?? false;
                                                    return (
                                                        <tr key={dia} className={disponible ? '' : 'bg-red-50/50'}>
                                                            <td className="px-4 py-2.5 font-semibold text-slate-800">{dia}</td>
                                                            <td className="px-4 py-2.5 text-slate-600">{formData.bloque_inicio}° al {formData.bloque_fin}°</td>
                                                            <td className="px-4 py-2.5 text-slate-600 font-mono">{resumenBloques?.horaInicio || '—'}</td>
                                                            <td className="px-4 py-2.5 text-slate-600 font-mono">{resumenBloques?.horaFin || '—'}</td>
                                                            <td className="px-4 py-2.5">
                                                                {verificando ? (
                                                                    <span className="text-xs text-slate-400">Verificando...</span>
                                                                ) : disponibilidad ? (
                                                                    disponible ? (
                                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                            </svg>
                                                                            Libre
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700" title={item?.errores?.join('. ')}>
                                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                            </svg>
                                                                            Cruce
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {disponibilidad && !verificando && (
                                        <p className={`mt-2 text-xs font-bold ${
                                            disponibilidad.todo_libre ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {disponibilidad.todo_libre
                                                ? '✓ Todos los días están disponibles.'
                                                : '✗ Hay conflictos en uno o más días. Revisa la tabla.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={cerrarModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando || verificando || (disponibilidad && !disponibilidad.todo_libre)}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-blue-600 hover:bg-blue-700`}>
                                    {guardando ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Guardando...
                                        </span>
                                    ) : 'Guardar Horario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
