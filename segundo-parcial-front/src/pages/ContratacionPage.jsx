import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TITULO_BADGE = {
    licenciatura: 'bg-blue-100 text-blue-700 border-blue-200',
    maestria: 'bg-green-100 text-green-700 border-green-200',
    doctorado: 'bg-purple-100 text-purple-700 border-purple-200',
    diplomado: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const DISPO_BADGE = {
    mañana: 'bg-amber-100 text-amber-700 border-amber-200',
    tarde: 'bg-orange-100 text-orange-700 border-orange-200',
    noche: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completo: 'bg-slate-100 text-slate-700 border-slate-200',
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

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerPostulantes = async () => {
        setLoading(true);
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
            mostrarToast(error.response?.data?.message || 'Error al cargar', 'error');
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
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU19: Contratación de Docentes</h1>
                <p className="text-slate-500 mt-1 text-sm">
                    {contar('postulante')} postulantes · {contar('contratado')} contratados · {contar('rechazado')} rechazados
                </p>
            </div>

            <div className="border-b border-slate-200 mb-6">
                <div className="flex gap-1">
                    {['postulantes', 'contratados'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                                tab === t ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                        >{t === 'postulantes' ? 'Postulantes' : 'Contratados'}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <select className="p-2.5 border border-slate-200 rounded-xl text-sm" value={filtroTitulo} onChange={e => setFiltroTitulo(e.target.value)}>
                        <option value="">Todos los títulos</option>
                        <option value="licenciatura">Licenciatura</option>
                        <option value="maestria">Maestría</option>
                        <option value="doctorado">Doctorado</option>
                        <option value="diplomado">Diplomado</option>
                    </select>
                    <input type="text" placeholder="Filtrar por especialidad..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)} />
                    <input type="text" placeholder="Filtrar por materia..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : postulantes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-400 font-medium">No hay {tab === 'postulantes' ? 'postulantes' : 'contratados'} en la gestión activa.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Título</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Especialidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Materia</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Disponibilidad</th>
                                    {tab === 'contratados' && (
                                        <>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Carga máx</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Horas asig</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Disponibles</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {postulantes.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-900">{p.ci}</td>
                                        <td className="px-4 py-3 text-slate-700">{p.nombres} {p.apellidos}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${TITULO_BADGE[p.titulo_academico] || 'bg-slate-100 text-slate-600'}`}>
                                                {p.titulo_academico || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{p.especialidad || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{p.materia_preferida || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${DISPO_BADGE[p.disponibilidad_horaria] || 'bg-slate-100 text-slate-600'}`}>
                                                {p.disponibilidad_horaria || '—'}
                                            </span>
                                        </td>
                                        {tab === 'contratados' && (
                                            <>
                                                <td className="px-4 py-3 font-bold text-slate-900">{p.carga_horaria_maxima ?? '—'}</td>
                                                <td className="px-4 py-3 font-bold text-slate-900">{p.docente?.horas_asignadas ?? 0}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-bold ${p.docente?.horas_disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {p.docente?.horas_disponibles ?? 0}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-4 py-3 text-right space-x-1">
                                            <button onClick={() => abrirDetalle(p.id)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Ver</button>
                                            {p.estado === 'postulante' && (
                                                <>
                                                    <button onClick={() => setContratarModal(p)} className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Contratar</button>
                                                    <button onClick={() => setRechazarModal(p)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Rechazar</button>
                                                </>
                                            )}
                                            {p.estado === 'contratado' && (
                                                <button onClick={() => handleRevertir(p.id)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Revertir</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {contratarModal && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Confirmar contratación</h3>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 mb-4">
                            <p><span className="text-slate-400">CI:</span> <strong>{contratarModal.ci}</strong></p>
                            <p><span className="text-slate-400">Nombre:</span> <strong>{contratarModal.nombres} {contratarModal.apellidos}</strong></p>
                            <p><span className="text-slate-400">Título:</span> <strong>{contratarModal.titulo_academico}</strong></p>
                            <p><span className="text-slate-400">Especialidad:</span> <strong>{contratarModal.especialidad || '—'}</strong></p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setContratarModal(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">Cancelar</button>
                            <button onClick={() => handleContratar(contratarModal.id)} disabled={accionando} className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer">
                                {accionando ? 'Procesando...' : 'Confirmar contratación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rechazarModal && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Rechazar postulante</h3>
                        <p className="text-sm text-slate-600 mb-3">¿Rechazar a <strong>{rechazarModal.nombres} {rechazarModal.apellidos}</strong>?</p>
                        <textarea placeholder="Motivo del rechazo (opcional)" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm mb-4" rows={3} value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setRechazarModal(null); setMotivoRechazo(''); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">Cancelar</button>
                            <button onClick={() => handleRechazar(rechazarModal.id)} disabled={accionando} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer">
                                {accionando ? 'Procesando...' : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {drawerOpen && (
                <div className="fixed inset-0 bg-slate-950/30 z-50" onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                            <h3 className="font-bold text-lg">Detalle del postulante</h3>
                            <button onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }} className="hover:text-slate-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {detalleLoading ? (
                            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                        ) : detallePostulante ? (
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-xl font-extrabold text-slate-900">{detallePostulante.nombres} {detallePostulante.apellidos}</h4>
                                    <p className="text-sm text-slate-500">CI: {detallePostulante.ci} · Estado: <span className="font-bold">{detallePostulante.estado}</span></p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Título</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.titulo_academico || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Especialidad</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.especialidad || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Materia preferida</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.materia_preferida || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Disponibilidad</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.disponibilidad_horaria || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Carga máxima</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.carga_horaria_maxima ?? '—'} hrs/sem</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Teléfono</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.telefono || '—'}</p></div>
                                    <div className="col-span-2 bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Correo</p><p className="font-bold text-slate-800 mt-1">{detallePostulante.correo || '—'}</p></div>
                                </div>
                                {detallePostulante.docente && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Docente vinculado</h5>
                                        <div className="bg-slate-50 rounded-xl p-3 text-sm">
                                            <p>Fecha contratación: <strong>{detallePostulante.docente.fecha_contratacion}</strong></p>
                                            <p>Horas asignadas: <strong>{detallePostulante.docente.horas_asignadas ?? 0}</strong></p>
                                            <p>Horas disponibles: <strong className="text-green-600">{detallePostulante.docente.horas_disponibles ?? 0}</strong></p>
                                        </div>
                                    </div>
                                )}
                                {detallePostulante.documentos?.length > 0 && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Documentos ({detallePostulante.documentos.length})</h5>
                                        <div className="space-y-2">
                                            {detallePostulante.documentos.map(d => (
                                                <div key={d.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-sm">
                                                    <span className="font-semibold">{d.tipo_documento}</span>
                                                    <span className="text-slate-400 text-xs">{d.nombre_archivo}</span>
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
