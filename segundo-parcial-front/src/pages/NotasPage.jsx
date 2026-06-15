import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/authprovider';

const TABS = [
    { id: 'notas', label: 'Notas por Examen' },
    { id: 'resumen', label: 'Resumen General' },
];

export default function NotasPage() {
    const { user } = useContext(AuthContext);
    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const [grupos, setGrupos] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [grupoId, setGrupoId] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [notas, setNotas] = useState([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [tab, setTab] = useState('notas');
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const [importModal, setImportModal] = useState({ open: false, numeroExamen: null });
    const [archivo, setArchivo] = useState(null);
    const [importando, setImportando] = useState(false);
    const [resultadoImport, setResultadoImport] = useState(null);

    const [editModal, setEditModal] = useState({ open: false, examen: null });
    const [nuevaNota, setNuevaNota] = useState('');
    const [editandoNota, setEditandoNota] = useState(false);

    const [resumenData, setResumenData] = useState(null);
    const [loadingResumen, setLoadingResumen] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const esCoordinadorAutoridad = user?.rol && ['coordinador', 'autoridad', 'administrador', 'coordinador academico'].includes(user.rol.toLowerCase());
    const esDocente = user?.rol && user.rol.toLowerCase() === 'docente';

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    useEffect(() => {
        cargarGrupos();
        cargarMaterias();
    }, []);

    const cargarGrupos = async () => {
        try {
            const res = await api.get('/grupos', authHeaders());
            if (res.data.success) {
                setGrupos(res.data.data || []);
            }
        } catch (e) {
            console.error('Error al cargar grupos:', e);
        }
    };

    const cargarMaterias = async () => {
        try {
            const res = await api.get('/materias', authHeaders());
            if (res.data.success) {
                setMaterias(res.data.data?.materias || []);
            }
        } catch (e) {
            console.error('Error al cargar materias:', e);
        }
    };

    const cargarNotas = useCallback(async () => {
        if (!grupoId || !materiaId) return;
        setLoadingNotas(true);
        try {
            const res = await api.get(`/notas/${grupoId}/${materiaId}`, authHeaders());
            if (res.data.success) {
                setNotas(res.data.data || []);
            }
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar notas.', 'error');
        } finally {
            setLoadingNotas(false);
        }
    }, [grupoId, materiaId]);

    useEffect(() => {
        cargarNotas();
    }, [cargarNotas]);

    const cargarResumen = useCallback(async () => {
        if (!grupoId) return;
        setLoadingResumen(true);
        try {
            const res = await api.get(`/notas/resumen/${grupoId}`, authHeaders());
            if (res.data.success) {
                setResumenData(res.data.data);
            }
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar resumen.', 'error');
        } finally {
            setLoadingResumen(false);
        }
    }, [grupoId]);

    useEffect(() => {
        if (tab === 'resumen' && grupoId) {
            cargarResumen();
        }
    }, [tab, grupoId, cargarResumen]);

    const totalAprobados = notas.filter(n => n.aprobado === true).length;
    const totalReprobados = notas.filter(n => n.aprobado === false).length;
    const totalPendientes = notas.filter(n => n.aprobado === null).length;

    const examenStatus = (numExamen) => {
        const conNota = notas.filter(n => n[`nota_examen${numExamen}`] !== null).length;
        if (notas.length === 0) return { label: 'Sin datos', color: 'bg-slate-100 text-slate-500' };
        if (conNota === 0) return { label: 'Pendiente', color: 'bg-slate-100 text-slate-500' };
        if (conNota === notas.length) return { label: 'Completo', color: 'bg-green-100 text-green-700' };
        return { label: `Parcial (${conNota}/${notas.length})`, color: 'bg-amber-100 text-amber-700' };
    };

    const handleDescargarPlantilla = async () => {
        if (!grupoId || !materiaId) return;
        try {
            const res = await api.get(`/notas/plantilla/${grupoId}/${materiaId}`, {
                ...authHeaders(),
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `plantilla-notas-grupo-${grupoId}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            mostrarToast('Error al descargar plantilla.', 'error');
        }
    };

    const handleImportar = async () => {
        if (!archivo) {
            mostrarToast('Selecciona un archivo primero.', 'error');
            return;
        }
        setImportando(true);
        setResultadoImport(null);

        const formData = new FormData();
        formData.append('grupo_id', grupoId);
        formData.append('materia_id', materiaId);
        formData.append('numero_examen', importModal.numeroExamen);
        formData.append('archivo', archivo);

        try {
            const res = await api.post('/notas/importar', formData, {
                ...authHeaders(),
                headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) {
                setResultadoImport(res.data);
                mostrarToast(res.data.message, 'exito');
                cargarNotas();
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (e) {
            const msg = e.response?.data?.message || 'Error al importar notas.';
            mostrarToast(msg, 'error');
        } finally {
            setImportando(false);
        }
    };

    const abrirEditarNota = (notaRow, numExamen) => {
        const notaKey = `nota_examen${numExamen}`;
        setEditModal({
            open: true,
            postulante: `${notaRow.nombres} ${notaRow.apellidos}`,
            ci: notaRow.ci,
            numeroExamen: numExamen,
            notaActual: notaRow[notaKey],
            postulanteId: notaRow.postulante_id,
        });
        setNuevaNota(notaRow[notaKey] !== null ? String(notaRow[notaKey]) : '');
    };

    const handleGuardarEdicion = async () => {
        if (nuevaNota === '' || isNaN(parseFloat(nuevaNota)) || parseFloat(nuevaNota) < 0 || parseFloat(nuevaNota) > 100) {
            mostrarToast('La nota debe estar entre 0 y 100.', 'error');
            return;
        }
        setEditandoNota(true);
        try {
            const examenId = editModal.examenId;
            const res = await api.put(`/notas/examen/${examenId}`, { nota: parseFloat(nuevaNota) }, authHeaders());
            if (res.data.success) {
                mostrarToast('Nota actualizada correctamente.', 'exito');
                setEditModal({ open: false, examen: null });
                cargarNotas();
            }
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al actualizar nota.', 'error');
        } finally {
            setEditandoNota(false);
        }
    };

    const getExamenId = async (postulanteId, numExamen) => {
        try {
            const res = await api.get(`/notas/${grupoId}/${materiaId}`, authHeaders());
            if (res.data.success) {
                const postulante = res.data.data.find(n => n.postulante_id === postulanteId);
                if (postulante) {
                    return postulante[`examen${numExamen}_id`];
                }
            }
        } catch (e) {
            return null;
        }
    };

    const resumenPostulantes = resumenData?.postulantes || [];
    const resumenMaterias = resumenData?.materias || [];

    const resumenFiltrados = resumenPostulantes.filter(p => {
        if (filtroEstado === 'todos') return true;
        return p.estado === filtroEstado;
    });

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
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Notas</h1>
                <p className="text-slate-500 mt-1 text-xs sm:text-sm">Registro y consulta de notas por grupo, materia y examen.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Grupo</label>
                        <select
                            value={grupoId}
                            onChange={(e) => { setGrupoId(e.target.value); setMateriaId(''); }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-700 bg-white"
                        >
                            <option value="">Seleccionar grupo</option>
                            {grupos.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre} {g.turno ? `(${g.turno.nombre})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Materia</label>
                        <select
                            value={materiaId}
                            onChange={(e) => setMateriaId(e.target.value)}
                            disabled={!grupoId}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="">{grupoId ? 'Seleccionar materia' : 'Primero selecciona un grupo'}</option>
                            {materias.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre} (Peso: {m.peso}%)</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {grupoId && materiaId && (
                <>
                    <div className="border-b border-slate-200 mb-6">
                        <div className="flex gap-1">
                            {TABS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer ${
                                        tab === t.id
                                            ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm -mb-px'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tab === 'notas' && (
                        <>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carga masiva:</span>
                                {[1, 2, 3].map(num => {
                                    const status = examenStatus(num);
                                    const completo = status.label === 'Completo';
                                    const puedeSubir = !esDocente || !completo;
                                    return (
                                        <button
                                            key={num}
                                            disabled={!puedeSubir}
                                            onClick={() => { setArchivo(null); setResultadoImport(null); setImportModal({ open: true, numeroExamen: num }); }}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                !puedeSubir
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
                                            }`}
                                            title={!puedeSubir ? 'Ya registrado. Contacte al coordinador para modificar.' : `Subir notas del Examen ${num}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Subir Examen {num}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>{status.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs sm:text-sm">
                                <span className="font-bold text-green-700">&bull; {totalAprobados} aprobados</span>
                                <span className="font-bold text-red-700">&bull; {totalReprobados} reprobados</span>
                                <span className="font-bold text-slate-400">&bull; {totalPendientes} pendientes</span>
                            </div>

                            {loadingNotas ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600" />
                                    <p className="text-sm text-slate-400 font-medium">Cargando notas...</p>
                                </div>
                            ) : notas.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-500 font-semibold">No hay postulantes en este grupo o no se encontraron notas.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombres</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Apellidos</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ex. 1</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ex. 2</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ex. 3</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Promedio</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Estado</th>
                                                    {esCoordinadorAutoridad && <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {notas.map((n) => {
                                                    const reprobado = n.aprobado === false;
                                                    return (
                                                        <tr key={n.postulante_id} className={`hover:bg-slate-50/60 transition-colors ${reprobado ? 'bg-red-50/40' : ''}`}>
                                                            <td className="px-4 py-3 font-mono text-xs sm:text-sm text-slate-700">{n.ci}</td>
                                                            <td className="px-4 py-3 font-semibold text-slate-800">{n.nombres}</td>
                                                            <td className="px-4 py-3 text-slate-700">{n.apellidos}</td>
                                                            {[1, 2, 3].map(ex => {
                                                                const notaVal = n[`nota_examen${ex}`];
                                                                return (
                                                                    <td key={ex} className="px-4 py-3 text-center font-mono font-bold">
                                                                        {notaVal !== null ? (
                                                                            <span className={notaVal >= 60 ? 'text-green-600' : 'text-red-500'}>{notaVal.toFixed(1)}</span>
                                                                        ) : (
                                                                            <span className="text-slate-300">&mdash;</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-4 py-3 text-center">
                                                                {n.promedio !== null ? (
                                                                    <span className={`font-extrabold text-sm ${n.promedio >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {n.promedio.toFixed(1)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">&mdash;</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {n.aprobado === true ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Aprobado</span>
                                                                ) : n.aprobado === false ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Reprobado</span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Pendiente</span>
                                                                )}
                                                            </td>
                                                            {esCoordinadorAutoridad && (
                                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {[1, 2, 3].map(ex => {
                                                                            const notaVal = n[`nota_examen${ex}`];
                                                                            return (
                                                                                <button
                                                                                    key={ex}
                                                                                    onClick={() => {
                                                                                        setEditModal({
                                                                                            open: true,
                                                                                            postulante: `${n.nombres} ${n.apellidos}`,
                                                                                            ci: n.ci,
                                                                                            numeroExamen: ex,
                                                                                            notaActual: notaVal,
                                                                                            postulanteId: n.postulante_id,
                                                                                            examenId: null,
                                                                                        });
                                                                                        setNuevaNota(notaVal !== null ? String(notaVal) : '');
                                                                                    }}
                                                                                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                                                                    title={`Editar Examen ${ex}`}
                                                                                >
                                                                                    Ex{ex}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                                        <span className="text-[11px] text-slate-400 font-medium">{notas.length} postulante{notas.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'resumen' && (
                        <>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar por estado:</span>
                                {['todos', 'aprobado', 'reprobado', 'pendiente'].map(est => (
                                    <button
                                        key={est}
                                        onClick={() => setFiltroEstado(est)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            filtroEstado === est
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {est === 'todos' ? 'Todos' : est.charAt(0).toUpperCase() + est.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {loadingResumen ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600" />
                                    <p className="text-sm text-slate-400 font-medium">Cargando resumen...</p>
                                </div>
                            ) : !resumenData ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
                                    <p className="text-slate-500 font-semibold">Selecciona un grupo para ver el resumen.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase">CI</th>
                                                    <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase">Nombres</th>
                                                    <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase">Apellidos</th>
                                                    {resumenMaterias.map(m => (
                                                        <th key={m.id} className="px-3 py-3 text-center font-bold text-slate-500 uppercase" title={`Peso: ${m.peso}%`}>
                                                            {m.nombre.split(' ').map(p => p.charAt(0)).join('').slice(0, 4)}
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-3 text-center font-bold text-slate-500 uppercase">Nota Final</th>
                                                    <th className="px-3 py-3 text-center font-bold text-slate-500 uppercase">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {resumenFiltrados.map(p => (
                                                    <tr key={p.postulante_id} className={`hover:bg-slate-50/60 ${p.estado === 'reprobado' ? 'bg-red-50/40' : ''}`}>
                                                        <td className="px-3 py-3 font-mono text-slate-700">{p.ci}</td>
                                                        <td className="px-3 py-3 font-semibold text-slate-800">{p.nombres}</td>
                                                        <td className="px-3 py-3 text-slate-700">{p.apellidos}</td>
                                                        {resumenMaterias.map(m => {
                                                            const matData = p.materias.find(mm => mm.materia_id === m.id);
                                                            return (
                                                                <td key={m.id} className="px-3 py-3 text-center font-mono font-bold">
                                                                    {matData?.promedio !== null && matData?.promedio !== undefined ? (
                                                                        <span className={matData.aprobado ? 'text-green-600' : 'text-red-500'}>
                                                                            {matData.promedio.toFixed(1)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">&mdash;</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-3 text-center font-extrabold">
                                                            {p.nota_final !== null ? (
                                                                <span className={p.estado === 'aprobado' ? 'text-green-600' : 'text-red-500'}>{p.nota_final.toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-slate-300">&mdash;</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {p.estado === 'aprobado' ? (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Aprobado</span>
                                                            ) : p.estado === 'reprobado' ? (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Reprobado</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Pendiente</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {!grupoId && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-700 font-bold text-base">Selecciona un grupo y una materia</p>
                        <p className="text-slate-400 text-sm mt-1">Usa los selectores de arriba para comenzar.</p>
                    </div>
                </div>
            )}

            {importModal.open && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) setImportModal({ open: false, numeroExamen: null }); }}>
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto mx-2">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                            <div>
                                <h3 className="font-bold text-lg">Subir notas &mdash; Examen {importModal.numeroExamen}</h3>
                                <p className="text-xs text-blue-200 mt-0.5">{materias.find(m => m.id === parseInt(materiaId))?.nombre} &mdash; {grupos.find(g => g.id === parseInt(grupoId))?.nombre}</p>
                            </div>
                            <button onClick={() => setImportModal({ open: false, numeroExamen: null })} className="hover:text-slate-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
                                <p className="font-bold mb-1">Instrucciones</p>
                                <p>Descarga la plantilla, llena las notas y sube el archivo. Solo .xlsx o .xls.</p>
                            </div>

                            <button onClick={handleDescargarPlantilla} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar Plantilla Excel
                            </button>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setArchivo(e.target.files[0])}
                                    className="hidden"
                                    id="file-input-notas"
                                />
                                {archivo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-3">
                                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-bold text-slate-700">{archivo.name}</span>
                                            <span className="text-xs text-slate-400">({(archivo.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <button onClick={() => { setArchivo(null); document.getElementById('file-input-notas').value = ''; }} className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer">Quitar archivo</button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block" htmlFor="file-input-notas">
                                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-sm font-bold text-slate-600">Haz clic para seleccionar o arrastra un archivo aquí</p>
                                        <p className="text-xs text-slate-400 mt-1">Solo .xlsx o .xls</p>
                                    </label>
                                )}
                            </div>

                            {archivo && (
                                <button
                                    onClick={handleImportar}
                                    disabled={importando}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all text-white font-bold px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-95"
                                >
                                    {importando ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Procesando notas, por favor espere...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Importar Notas
                                        </>
                                    )}
                                </button>
                            )}

                            {resultadoImport && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-4">
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                                            <p className="text-2xl font-black text-green-700">{resultadoImport.total_exitosos}</p>
                                            <p className="text-xs font-bold text-green-600">Notas importadas</p>
                                        </div>
                                        <div className={`${resultadoImport.total_errores > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3 flex-1 min-w-[140px]`}>
                                            <p className={`text-2xl font-black ${resultadoImport.total_errores > 0 ? 'text-red-700' : 'text-slate-400'}`}>{resultadoImport.total_errores}</p>
                                            <p className={`text-xs font-bold ${resultadoImport.total_errores > 0 ? 'text-red-600' : 'text-slate-400'}`}>Filas con errores</p>
                                        </div>
                                    </div>
                                    {resultadoImport.errores?.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-sm text-red-700 mb-3">Detalle de errores</h4>
                                            <div className="overflow-x-auto rounded-xl border border-red-100">
                                                <table className="min-w-full divide-y divide-red-100 text-sm">
                                                    <thead className="bg-red-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-bold text-red-700">Fila</th>
                                                            <th className="px-4 py-2 text-left text-xs font-bold text-red-700">CI</th>
                                                            <th className="px-4 py-2 text-left text-xs font-bold text-red-700">Motivo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-red-50">
                                                        {resultadoImport.errores.map((err, i) => (
                                                            <tr key={i} className="hover:bg-red-50/50">
                                                                <td className="px-4 py-2 text-slate-600 font-mono text-xs">{err.fila}</td>
                                                                <td className="px-4 py-2 font-mono text-xs text-slate-700">{err.ci}</td>
                                                                <td className="px-4 py-2 text-red-600 text-xs">{err.motivo}</td>
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
                    </div>
                </div>
            )}

            {editModal.open && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) setEditModal({ open: false, examen: null }); }}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 mx-2">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10 rounded-t-2xl">
                            <h3 className="font-bold text-lg">Editar Nota</h3>
                            <button onClick={() => setEditModal({ open: false, examen: null })} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm"><span className="font-bold text-slate-500">Postulante:</span> {editModal.postulante}</p>
                                <p className="text-sm"><span className="font-bold text-slate-500">CI:</span> {editModal.ci}</p>
                                <p className="text-sm"><span className="font-bold text-slate-500">Examen:</span> {editModal.numeroExamen}</p>
                                <p className="text-sm"><span className="font-bold text-slate-500">Nota actual:</span> <span className="font-mono font-bold">{editModal.notaActual !== null ? editModal.notaActual.toFixed(1) : '—'}</span></p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-semibold text-amber-800">
                                Esta acción quedará registrada en la bitácora del sistema.
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nueva nota (0-100)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={nuevaNota}
                                    onChange={(e) => setNuevaNota(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button onClick={() => setEditModal({ open: false, examen: null })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">Cancelar</button>
                                <button
                                    onClick={handleGuardarEdicion}
                                    disabled={editandoNota}
                                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:cursor-not-allowed"
                                >
                                    {editandoNota ? 'Guardando...' : 'Guardar Cambio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
