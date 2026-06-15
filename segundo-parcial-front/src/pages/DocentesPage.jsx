import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DISPO_BADGE = {
    mañana: 'bg-amber-100 text-amber-700 border-amber-200',
    tarde: 'bg-orange-100 text-orange-700 border-orange-200',
    noche: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completo: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const BLOQUES_POR_TURNO = {
    Mañana: [
        { nro: 1, inicio: '07:00', fin: '07:45' }, { nro: 2, inicio: '07:45', fin: '08:30' },
        { nro: 3, inicio: '08:30', fin: '09:15' }, { nro: 4, inicio: '09:15', fin: '10:00' },
        { nro: 5, inicio: '10:00', fin: '10:45' }, { nro: 6, inicio: '10:45', fin: '11:30' },
        { nro: 7, inicio: '11:30', fin: '12:15' },
    ],
    Tarde: [
        { nro: 1, inicio: '14:00', fin: '14:45' }, { nro: 2, inicio: '14:45', fin: '15:30' },
        { nro: 3, inicio: '15:30', fin: '16:15' }, { nro: 4, inicio: '16:15', fin: '17:00' },
        { nro: 5, inicio: '17:00', fin: '17:45' }, { nro: 6, inicio: '17:45', fin: '18:30' },
    ],
    Noche: [
        { nro: 1, inicio: '19:00', fin: '19:45' }, { nro: 2, inicio: '19:45', fin: '20:30' },
        { nro: 3, inicio: '20:30', fin: '21:15' }, { nro: 4, inicio: '21:15', fin: '22:00' },
        { nro: 5, inicio: '22:00', fin: '22:45' }, { nro: 6, inicio: '22:45', fin: '23:30' },
    ],
};

const TAB = { DISPONIBILIDAD: 0, MANUAL: 1, AUTOMATICA: 2 };

export default function DocentesPage() {
    const [docentes, setDocentes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
    const [filtroMateria, setFiltroMateria] = useState('');
    const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('');

    const [cargaModal, setCargaModal] = useState(null);
    const [cargaValor, setCargaValor] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [sidePanel, setSidePanel] = useState(null);
    const [tabActivo, setTabActivo] = useState(TAB.DISPONIBILIDAD);

    const [distribucionAbierto, setDistribucionAbierto] = useState(false);
    const [distribucionData, setDistribucionData] = useState(null);
    const [distribucionCargando, setDistribucionCargando] = useState(false);
    const [distribucionAplicando, setDistribucionAplicando] = useState(false);
    const [historialData, setHistorialData] = useState([]);
    const [historialCargando, setHistorialCargando] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerDocentes = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtroEspecialidad) params.especialidad = filtroEspecialidad;
            if (filtroMateria) params.materia_preferida = filtroMateria;
            if (filtroDisponibilidad) params.disponibilidad_horaria = filtroDisponibilidad;
            const res = await api.get('/docentes', { params });
            if (res.data.success) setDocentes(res.data.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar docentes', 'error');
        } finally {
            setLoading(false);
        }
    }, [filtroEspecialidad, filtroMateria, filtroDisponibilidad]);

    useEffect(() => { obtenerDocentes(); }, [obtenerDocentes]);

    const abrirCargaModal = (docente) => {
        setCargaModal(docente);
        setCargaValor(docente.carga_horaria_maxima?.toString() || '');
    };

    const handleGuardarCarga = async () => {
        if (!cargaValor || parseInt(cargaValor) < 1 || parseInt(cargaValor) > 40) {
            mostrarToast('La carga horaria debe ser entre 1 y 40 horas', 'error');
            return;
        }
        setGuardando(true);
        try {
            const res = await api.patch(`/docentes/${cargaModal.id}/carga-horaria`, { carga_horaria_maxima: parseInt(cargaValor) });
            if (res.data.success) {
                mostrarToast('Carga horaria asignada correctamente', 'exito');
                setCargaModal(null);
                obtenerDocentes();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al asignar carga', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const abrirPanel = (docente) => {
        setSidePanel(docente);
        setTabActivo(TAB.DISPONIBILIDAD);
    };

    const totalDocentes = docentes.length;
    const conCarga = docentes.filter(d => d.carga_horaria_maxima > 0).length;
    const sinCarga = docentes.filter(d => !d.carga_horaria_maxima).length;
    const promedioHoras = totalDocentes > 0 ? (docentes.reduce((s, d) => s + (d.carga_horaria_maxima || 0), 0) / totalDocentes).toFixed(1) : 0;

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            {toast.visible && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-xl border text-sm font-bold flex items-center gap-2 transition-all ${
                    toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                    <span>{toast.texto}</span>
                    <button onClick={() => setToast({ visible: false })} className="ml-2 hover:opacity-70 cursor-pointer">&times;</button>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU20: Carga Horaria de Docentes</h1>
                <p className="text-slate-500 mt-1 text-sm">Administra la disponibilidad y carga horaria de los docentes contratados.</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-slate-900">{totalDocentes}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total docentes</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-green-600">{conCarga}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Con carga asignada</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-slate-400">{sinCarga}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Sin carga asignada</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{promedioHoras}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Promedio hrs/sem</p>
                </div>
            </div>

            <DistribucionGlobal
                abierto={distribucionAbierto}
                setAbierto={setDistribucionAbierto}
                data={distribucionData}
                setData={setDistribucionData}
                cargando={distribucionCargando}
                setCargando={setDistribucionCargando}
                aplicando={distribucionAplicando}
                setAplicando={setDistribucionAplicando}
                historialData={historialData}
                setHistorialData={setHistorialData}
                historialCargando={historialCargando}
                setHistorialCargando={setHistorialCargando}
                mostrarToast={mostrarToast}
                onCambio={obtenerDocentes}
            />

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <input type="text" placeholder="Filtrar por especialidad..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)} />
                    <input type="text" placeholder="Filtrar por materia..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} />
                    <select className="p-2.5 border border-slate-200 rounded-xl text-sm" value={filtroDisponibilidad} onChange={e => setFiltroDisponibilidad(e.target.value)}>
                        <option value="">Toda disponibilidad</option>
                        <option value="mañana">Mañana</option>
                        <option value="tarde">Tarde</option>
                        <option value="noche">Noche</option>
                        <option value="completo">Completo</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : docentes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-400 font-medium">No hay docentes contratados en la gestión activa.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Especialidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Materia</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Disponibilidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Carga máx</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Asignadas</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Libres</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Progreso</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {docentes.map(d => {
                                    const pd = d.postulante_docente || {};
                                    const pct = d.carga_horaria_maxima > 0 ? Math.min(100, Math.round((d.horas_asignadas / d.carga_horaria_maxima) * 100)) : 0;
                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{pd.ci || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{pd.nombres} {pd.apellidos}</td>
                                            <td className="px-4 py-3 text-slate-600">{pd.especialidad || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{pd.materia_preferida || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${DISPO_BADGE[pd.disponibilidad_horaria] || 'bg-slate-100 text-slate-600'}`}>
                                                    {pd.disponibilidad_horaria || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-900">{d.carga_horaria_maxima || 0}</td>
                                            <td className="px-4 py-3 font-bold">{d.horas_asignadas ?? 0}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${d.horas_disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>{d.horas_disponibles}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex gap-1.5 justify-end">
                                                    <button onClick={() => abrirCargaModal(d)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                                        Carga
                                                    </button>
                                                    <button onClick={() => abrirPanel(d)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                                        Panel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {cargaModal && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Asignar carga horaria</h3>
                        <p className="text-sm text-slate-600 mb-2">Docente: <strong>{cargaModal.postulante_docente?.nombres} {cargaModal.postulante_docente?.apellidos}</strong></p>
                        <p className="text-xs text-slate-400 mb-4">Horas actualmente asignadas en horarios: <strong>{cargaModal.horas_asignadas ?? 0} hrs/sem</strong></p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Carga horaria máxima semanal</label>
                            <input type="number" min={1} max={40} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" value={cargaValor} onChange={e => setCargaValor(e.target.value)} />
                            <p className="text-xs text-slate-400 mt-1">Valor entre 1 y 40 horas por semana.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCargaModal(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">Cancelar</button>
                            <button onClick={handleGuardarCarga} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer">
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sidePanel && (
                <SidePanel
                    docente={sidePanel}
                    onClose={() => setSidePanel(null)}
                    tabActivo={tabActivo}
                    setTabActivo={setTabActivo}
                    mostrarToast={mostrarToast}
                    onCambio={obtenerDocentes}
                />
            )}
        </div>
    );
}

function SidePanel({ docente, onClose, tabActivo, setTabActivo, mostrarToast, onCambio }) {
    const pd = docente.postulante_docente || {};

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-xs" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg shadow-2xl border-l border-slate-200 overflow-y-auto animate-slide-in">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {pd.nombres?.[0]}{pd.apellidos?.[0]}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{pd.nombres} {pd.apellidos}</p>
                            <p className="text-xs text-slate-400">{pd.especialidad || 'Sin especialidad'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">&times;</button>
                </div>

                <div className="flex border-b border-slate-100">
                    {[
                        { id: TAB.DISPONIBILIDAD, label: 'Disponibilidad' },
                        { id: TAB.MANUAL, label: 'Asignación manual' },
                        { id: TAB.AUTOMATICA, label: 'Asignación automática' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActivo(tab.id)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                                tabActivo === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                                    : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {tabActivo === TAB.DISPONIBILIDAD && (
                        <TabDisponibilidad docente={docente} mostrarToast={mostrarToast} onCambio={onCambio} />
                    )}
                    {tabActivo === TAB.MANUAL && (
                        <TabManual docente={docente} mostrarToast={mostrarToast} onCambio={onCambio} />
                    )}
                    {tabActivo === TAB.AUTOMATICA && (
                        <TabAutomatica docente={docente} mostrarToast={mostrarToast} onCambio={onCambio} />
                    )}
                </div>
            </div>
        </div>
    );
}

function TabDisponibilidad({ docente, mostrarToast, onCambio }) {
    const [turnos, setTurnos] = useState([]);
    const [disponibilidad, setDisponibilidad] = useState({});
    const [cargaMaxima, setCargaMaxima] = useState(0);
    const [guardando, setGuardando] = useState(false);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [turnosRes, dispRes] = await Promise.all([
                api.get('/turnos'),
                api.get(`/docentes/${docente.id}/disponibilidad`),
            ]);
            if (turnosRes.data.success) setTurnos(turnosRes.data.data);
            if (dispRes.data.success) {
                const data = dispRes.data.data;
                const map = {};
                (data.disponibilidad || []).forEach(d => {
                    map[d.turno_id] = d.horas_disponibles != null ? d.horas_disponibles : '';
                });
                setDisponibilidad(map);
                setCargaMaxima(data.carga_horaria_maxima || 0);
            }
        } catch (error) {
            mostrarToast('Error al cargar datos de disponibilidad', 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleChange = (turnoId, value) => {
        setDisponibilidad(prev => ({ ...prev, [turnoId]: value }));
    };

    const totalHoras = Object.values(disponibilidad).reduce((s, v) => s + (parseInt(v) || 0), 0);
    const excede = cargaMaxima > 0 && totalHoras > cargaMaxima;

    const handleGuardar = async () => {
        if (excede) {
            mostrarToast(`La suma (${totalHoras}) supera la carga máxima (${cargaMaxima})`, 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = Object.entries(disponibilidad)
                .filter(([, v]) => v !== '' && v !== null)
                .map(([turnoId, horas]) => ({
                    turno_id: parseInt(turnoId),
                    horas_disponibles: parseInt(horas) || 0,
                }));
            const res = await api.post('/docentes/disponibilidad', {
                docente_id: docente.id,
                disponibilidad: payload,
            });
            if (res.data.success) {
                mostrarToast('Disponibilidad guardada correctamente', 'exito');
                onCambio();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al guardar disponibilidad', 'error');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div>
            <p className="text-sm text-slate-600 mb-4">
                Configure las horas disponibles del docente en cada turno. Si no configura ningún turno, se asumirá disponible en todos.
            </p>
            <div className="space-y-3 mb-6">
                {turnos.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700 text-sm">{t.nombre}</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                max={40}
                                className="w-20 p-2 border border-slate-200 rounded-lg text-sm text-center"
                                value={disponibilidad[t.id] ?? ''}
                                onChange={e => handleChange(t.id, e.target.value)}
                                placeholder="—"
                            />
                            <span className="text-xs text-slate-400">hrs</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className={`p-3 rounded-xl text-sm font-bold mb-4 ${excede ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                Total configurado: {totalHoras} hrs
                {cargaMaxima > 0 && (
                    <span> de {cargaMaxima} hrs máximas</span>
                )}
                {excede && <span> — ¡Excede el límite!</span>}
            </div>
            <button
                onClick={handleGuardar}
                disabled={guardando || excede}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer"
            >
                {guardando ? 'Guardando...' : 'Guardar disponibilidad'}
            </button>
        </div>
    );
}

function TabManual({ docente, mostrarToast, onCambio }) {
    const [grupos, setGrupos] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [turnos, setTurnos] = useState([]);

    const [grupoId, setGrupoId] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [aulaId, setAulaId] = useState('');
    const [turnoId, setTurnoId] = useState('');
    const [turnoNombre, setTurnoNombre] = useState('');
    const [diasSel, setDiasSel] = useState([]);
    const [bloqueInicio, setBloqueInicio] = useState(null);
    const [bloqueFin, setBloqueFin] = useState(null);

    const [verificando, setVerificando] = useState(false);
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarCatalogos();
    }, []);

    const cargarCatalogos = async () => {
        setCargando(true);
        try {
            const [gRes, mRes, aRes, tRes] = await Promise.all([
                api.get('/grupos'),
                api.get('/materias'),
                api.get('/aulas'),
                api.get('/turnos'),
            ]);
            if (gRes.data.success) setGrupos(Array.isArray(gRes.data.data) ? gRes.data.data : []);
            if (mRes.data.success) setMaterias(Array.isArray(mRes.data.data) ? mRes.data.data : (mRes.data.data?.materias || []));
            if (aRes.data.success) setAulas(Array.isArray(aRes.data.data) ? aRes.data.data : (aRes.data.data?.aulas || []));
            if (tRes.data.success) setTurnos(Array.isArray(tRes.data.data) ? tRes.data.data : []);
        } catch (error) {
            mostrarToast('Error al cargar catálogos', 'error');
        } finally {
            setCargando(false);
        }
    };

    const grupoSel = grupos.find(g => g.id === parseInt(grupoId));
    const turnoGrupo = grupoSel ? turnos.find(t => t.id === grupoSel.turno_id) : null;

    const toggleDia = (dia) => {
        setDiasSel(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
    };

    const bloques = turnoNombre ? BLOQUES_POR_TURNO[turnoNombre] || [] : [];

    const handleBloqueClick = (nro) => {
        if (bloqueInicio === null || (bloqueFin !== null)) {
            setBloqueInicio(nro);
            setBloqueFin(null);
        } else if (nro < bloqueInicio) {
            setBloqueInicio(nro);
            setBloqueFin(null);
        } else {
            setBloqueFin(nro);
        }
    };

    const handleGrupoChange = (id) => {
        setGrupoId(id);
        const g = grupos.find(g => g.id === parseInt(id));
        if (g && g.turno_id) {
            setTurnoId(g.turno_id);
            const t = turnos.find(t => t.id === g.turno_id);
            setTurnoNombre(t?.nombre || '');
        }
        setBloqueInicio(null);
        setBloqueFin(null);
        setDisponibilidad(null);
    };

    const verificarDisponibilidad = async () => {
        if (!grupoId || !materiaId || !aulaId || !turnoId || diasSel.length === 0 || !bloqueInicio || !bloqueFin) {
            mostrarToast('Complete todos los campos', 'error');
            return;
        }
        setVerificando(true);
        setDisponibilidad(null);
        try {
            const res = await api.get('/horarios/verificar-disponibilidad', {
                params: {
                    grupo_id: grupoId,
                    docente_id: docente.id,
                    aula_id: aulaId,
                    turno_id: turnoId,
                    bloque_inicio: bloqueInicio,
                    bloque_fin: bloqueFin,
                    dias: diasSel,
                },
            });
            if (res.data.success) setDisponibilidad(res.data.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al verificar', 'error');
        } finally {
            setVerificando(false);
        }
    };

    const handleGuardar = async () => {
        if (!disponibilidad?.todo_libre) {
            mostrarToast('No puede guardar si hay conflictos', 'error');
            return;
        }
        setGuardando(true);
        try {
            const res = await api.post(`/docentes/${docente.id}/carga-manual`, {
                docente_id: docente.id,
                grupo_id: parseInt(grupoId),
                materia_id: parseInt(materiaId),
                aula_id: parseInt(aulaId),
                turno_id: parseInt(turnoId),
                bloque_inicio: bloqueInicio,
                bloque_fin: bloqueFin,
                dias: diasSel,
            });
            if (res.data.success) {
                mostrarToast('Asignación manual guardada correctamente', 'exito');
                onCambio();
                setGrupoId('');
                setMateriaId('');
                setAulaId('');
                setTurnoId('');
                setTurnoNombre('');
                setDiasSel([]);
                setBloqueInicio(null);
                setBloqueFin(null);
                setDisponibilidad(null);
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al asignar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" value={grupoId} onChange={e => handleGrupoChange(e.target.value)}>
                    <option value="">Seleccionar grupo...</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Materia</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" value={materiaId} onChange={e => setMateriaId(e.target.value)}>
                    <option value="">Seleccionar materia...</option>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aula</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" value={aulaId} onChange={e => setAulaId(e.target.value)}>
                    <option value="">Seleccionar aula...</option>
                    {aulas.map(a => <option key={a.id} value={a.id}>{a.edificio} - {a.numero}</option>)}
                </select>
            </div>
            {turnoNombre && (
                <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">Turno del grupo: <strong>{turnoNombre}</strong></p>
            )}

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Días</label>
                <div className="flex flex-wrap gap-2">
                    {DIAS.map(dia => (
                        <button
                            key={dia}
                            onClick={() => toggleDia(dia)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                                diasSel.includes(dia)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                            }`}
                        >
                            {dia.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {turnoNombre && (
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bloques ({turnoNombre})</label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {bloques.map(b => {
                            const seleccionado = bloqueInicio && bloqueFin && b.nro >= bloqueInicio && b.nro <= bloqueFin;
                            const esInicio = b.nro === bloqueInicio;
                            const esFin = b.nro === bloqueFin;
                            return (
                                <button
                                    key={b.nro}
                                    onClick={() => handleBloqueClick(b.nro)}
                                    className={`p-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                        seleccionado
                                            ? esInicio || esFin
                                                ? 'bg-blue-700 text-white border-blue-800'
                                                : 'bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {b.nro}<br /><span className="font-mono">{b.inicio}-{b.fin}</span>
                                </button>
                            );
                        })}
                    </div>
                    {bloqueInicio && bloqueFin && (
                        <p className="text-xs text-blue-700 mt-2 font-semibold">
                            Bloques {bloqueInicio} a {bloqueFin} ({bloques.find(b => b.nro === bloqueInicio)?.inicio} - {bloques.find(b => b.nro === bloqueFin)?.fin})
                        </p>
                    )}
                </div>
            )}

            <button
                onClick={verificarDisponibilidad}
                disabled={verificando || !grupoId || !materiaId || !aulaId || !bloqueInicio || !bloqueFin || diasSel.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer"
            >
                {verificando ? 'Verificando...' : 'Verificar disponibilidad'}
            </button>

            {disponibilidad && (
                <div className={`p-3 rounded-xl border text-sm ${disponibilidad.todo_libre ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {disponibilidad.todo_libre ? (
                        <p>✓ Todos los días están disponibles</p>
                    ) : (
                        <div>
                            <p className="font-bold mb-1">✗ Conflictos detectados:</p>
                            {disponibilidad.disponibilidad?.filter(d => !d.disponible).map(d => (
                                <p key={d.dia} className="text-xs">• {d.dia}: {d.errores?.join(', ')}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleGuardar}
                disabled={guardando || !disponibilidad?.todo_libre}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer"
            >
                {guardando ? 'Guardando...' : 'Asignar carga horaria'}
            </button>
        </div>
    );
}

function TabAutomatica({ docente, mostrarToast, onCambio }) {
    const [modo, setModo] = useState('llenar_huecos');
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [confirmando, setConfirmando] = useState(false);

    const handleSimular = async () => {
        setCargando(true);
        setResultado(null);
        try {
            const res = await api.post(`/docentes/${docente.id}/carga-automatica`, {
                docente_id: docente.id,
                modo,
            });
            if (res.data.success) setResultado(res.data.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al simular asignación', 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleConfirmar = async () => {
        if (!resultado?.asignaciones?.length) return;
        setConfirmando(true);
        try {
            const res = await api.post(`/docentes/${docente.id}/confirmar-automatica`, {
                docente_id: docente.id,
                asignaciones: resultado.asignaciones.map(a => ({
                    grupo_id: a.grupo_id,
                    materia_id: a.materia_id,
                    aula_id: a.aula_id,
                    turno_id: a.turno_id,
                    bloque_inicio: a.bloque_inicio,
                    bloque_fin: a.bloque_fin,
                    dias: a.dias,
                })),
            });
            if (res.data.success) {
                mostrarToast(`Asignación automática completada: ${res.data.data.bloques_creados} bloque(s)`, 'exito');
                setResultado(null);
                onCambio();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al confirmar', 'error');
        } finally {
            setConfirmando(false);
        }
    };

    return (
        <div>
            <p className="text-sm text-slate-600 mb-4">
                Asignación automática de carga horaria según disponibilidad del docente y grupos sin cubrir.
            </p>

            <div className="space-y-3 mb-4">
                <button
                    onClick={() => setModo('llenar_huecos')}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                        modo === 'llenar_huecos'
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                    <p className={`font-bold text-sm ${modo === 'llenar_huecos' ? 'text-blue-700' : 'text-slate-700'}`}>Llenar huecos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Asigna solo grupos que no tienen docente en alguna materia.</p>
                </button>
                <button
                    onClick={() => setModo('maximizar_horas')}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                        modo === 'maximizar_horas'
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                    <p className={`font-bold text-sm ${modo === 'maximizar_horas' ? 'text-blue-700' : 'text-slate-700'}`}>Maximizar horas</p>
                    <p className="text-xs text-slate-500 mt-0.5">Asigna la mayor cantidad de horas posibles hasta cubrir la carga máxima del docente.</p>
                </button>
            </div>

            <button
                onClick={handleSimular}
                disabled={cargando}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer mb-4"
            >
                {cargando ? 'Simulando...' : 'Simular asignación'}
            </button>

            {resultado && (
                <div>
                    {resultado.asignaciones?.length > 0 ? (
                        <>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-bold mb-3">
                                ✓ {resultado.asignaciones.length} asignación(es) encontrada(s) — {resultado.total_horas} hrs totales
                            </div>
                            <div className="space-y-2 mb-4">
                                {resultado.asignaciones.map((a, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                        <p className="font-bold text-slate-700">{a.grupo_nombre} — {a.materia_nombre}</p>
                                        <p className="text-slate-500 mt-0.5">{a.dias?.join(', ')} | Bloques {a.bloque_inicio}-{a.bloque_fin} | {a.horas_totales} hrs</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleConfirmar}
                                disabled={confirmando}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer"
                            >
                                {confirmando ? 'Confirmando...' : 'Confirmar asignación'}
                            </button>
                        </>
                    ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            No se encontraron asignaciones disponibles para este docente.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DistribucionGlobal({ abierto, setAbierto, data, setData, cargando, setCargando, aplicando, setAplicando, historialData, setHistorialData, historialCargando, setHistorialCargando, mostrarToast, onCambio }) {

    const calcular = async () => {
        setCargando(true);
        setData(null);
        try {
            const res = await api.get('/distribucion-carga/calcular');
            if (res.data.success) setData(res.data.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al calcular distribución', 'error');
        } finally {
            setCargando(false);
        }
    };

    const aplicar = async () => {
        if (!data?.distribucion?.length) return;
        setAplicando(true);
        try {
            const payload = {
                distribucion: data.distribucion.map(d => ({
                    docente_id: d.docente_id,
                    carga_sugerida: d.carga_sugerida,
                })),
            };
            const res = await api.post('/distribucion-carga/aplicar', payload);
            if (res.data.success) {
                mostrarToast(`Distribución aplicada: ${res.data.data.total_modificados} docente(s) modificados`, 'exito');
                setData(null);
                setAbierto(false);
                onCambio();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al aplicar distribución', 'error');
        } finally {
            setAplicando(false);
        }
    };

    const cargarHistorial = async () => {
        setHistorialCargando(true);
        try {
            const res = await api.get('/distribucion-carga/historial');
            if (res.data.success) setHistorialData(res.data.data);
        } catch (error) {
            mostrarToast('Error al cargar historial', 'error');
        } finally {
            setHistorialCargando(false);
        }
    };

    useEffect(() => {
        if (abierto) {
            calcular();
            cargarHistorial();
        }
    }, [abierto]);

    return (
        <div className="mb-6">
            <button
                onClick={() => setAbierto(!abierto)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border shadow-sm text-left transition-colors cursor-pointer ${
                    abierto ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${abierto ? 'bg-indigo-200' : 'bg-indigo-100'}`}>
                        <svg className={`w-5 h-5 ${abierto ? 'text-indigo-700' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm">Distribución global de carga horaria</p>
                        <p className="text-xs text-slate-400">Calcula y distribuye la carga horaria entre todos los docentes contratados.</p>
                    </div>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {abierto && (
                <div className="mt-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                    {cargando ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                    ) : data ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <p className="text-xl font-black text-slate-900">{data.horas_totales_necesarias}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Horas necesarias</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <p className="text-xl font-black text-slate-900">{data.total_docentes}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Docentes</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <p className="text-xl font-black text-indigo-600">{data.carga_promedio_sugerida}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Promedio sugerido</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <p className={`text-xl font-black ${data.viable ? 'text-green-600' : 'text-red-600'}`}>
                                        {data.horas_cubiertas}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Horas cubiertas</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Docente</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Especialidad</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Carga actual</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Carga sugerida</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Máximo</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Viable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.distribucion.map(d => (
                                            <tr key={d.docente_id} className={`${!d.viable ? 'bg-red-50' : 'hover:bg-slate-50/50'}`}>
                                                <td className="px-3 py-2 font-semibold text-slate-900">{d.docente_nombre}</td>
                                                <td className="px-3 py-2 text-slate-600">{d.especialidad}</td>
                                                <td className="px-3 py-2 text-center font-bold text-slate-700">{d.carga_actual}</td>
                                                <td className={`px-3 py-2 text-center font-bold ${!d.viable ? 'text-red-600' : 'text-green-600'}`}>
                                                    {d.carga_sugerida}
                                                    {!d.viable && <span className="block text-[10px] text-red-500 font-normal">Supera su máximo de {d.carga_maxima} hrs</span>}
                                                </td>
                                                <td className="px-3 py-2 text-center text-slate-600">{d.carga_maxima}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {d.viable ? <span className="text-green-600 font-bold">✓</span> : <span className="text-red-600 font-bold">✗</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-sm font-semibold text-slate-700">
                                    <span className={data.viable ? 'text-green-600' : 'text-red-600'}>{data.horas_cubiertas}</span> hrs cubiertas de <strong>{data.horas_totales_necesarias}</strong> hrs necesarias
                                </p>
                                {!data.viable && (
                                    <p className="text-xs text-red-600 font-semibold">Faltan {data.horas_faltantes} hrs — considera contratar más docentes o reducir grupos.</p>
                                )}
                            </div>

                            {data.viable ? (
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Deseas actualizar la carga horaria máxima de todos los docentes según esta distribución?')) {
                                            aplicar();
                                        }
                                    }}
                                    disabled={aplicando}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer"
                                >
                                    {aplicando ? 'Aplicando...' : 'Aplicar distribución'}
                                </button>
                            ) : (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                    <p className="font-bold">No hay suficientes docentes para cubrir todas las horas necesarias.</p>
                                    <p className="text-xs mt-1">Faltan {data.horas_faltantes} horas. Considera contratar {Math.ceil(data.horas_faltantes / 20)} docente(s) adicional(es) o reducir los grupos.</p>
                                </div>
                            )}
                        </>
                    ) : null}

                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historial de distribuciones aplicadas</p>
                        {historialCargando ? (
                            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
                        ) : historialData.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-3">No hay distribuciones aplicadas aún.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase">Fecha</th>
                                            <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase">Docentes modificados</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase">Aplicado por</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historialData.map((h, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-slate-700">{h.fecha}</td>
                                                <td className="px-3 py-2 text-center font-bold text-slate-700">{h.total_modificados}</td>
                                                <td className="px-3 py-2 text-slate-700">{h.aplicado_por}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
