import React, { useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/authprovider';

const TABS_RESULTADOS = [
    { id: 'admitidos', label: 'Admitidos' },
    { id: 'sin-cupo', label: 'Sin Cupo' },
    { id: 'reprobados', label: 'Reprobados' },
];

export default function AsignacionCarreraPage() {
    const { user } = useContext(AuthContext);
    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const [verificacion, setVerificacion] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [resultadosData, setResultadosData] = useState(null);
    const [tabResultados, setTabResultados] = useState('admitidos');
    const [confirmando, setConfirmando] = useState(false);

    const esCoordinadorAutoridad = user?.rol && ['coordinador', 'autoridad', 'administrador', 'coordinador academico'].includes(user.rol.toLowerCase());

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    useEffect(() => {
        verificarEstado();
        cargarResultados();
    }, []);

    const verificarEstado = async () => {
        setLoading(true);
        try {
            const res = await api.get('/asignacion-carrera/verificar', authHeaders());
            if (res.data.success) {
                setVerificacion(res.data);
            }
        } catch (e) {
            const msg = e.response?.data?.message || 'Error al verificar el estado del sistema.';
            mostrarToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarResultados = async () => {
        try {
            const res = await api.get('/asignacion-carrera/resultados', authHeaders());
            if (res.data.success) {
                setResultadosData(res.data.data);
            }
        } catch (e) {
            console.error('Error al cargar resultados:', e);
        }
    };

    const generarPreview = async () => {
        setLoading(true);
        setPreviewData(null);
        try {
            const res = await api.get('/asignacion-carrera/previsualizar', authHeaders());
            if (res.data.success) {
                setPreviewData(res.data.data);
                if (res.data.asignacion_previa) {
                    mostrarToast('Ya existe una asignación previa. Al confirmar se sobreescribirá.', 'warning');
                } else {
                    mostrarToast('Vista previa generada correctamente.', 'success');
                }
            }
        } catch (e) {
            const data = e.response?.data;
            if (data?.postulantes_sin_nota?.length > 0) {
                setVerificacion(prev => ({ ...prev, postulantes_sin_nota: data.postulantes_sin_nota }));
            }
            mostrarToast(data?.message || 'Error al generar vista previa.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmarAsignacion = async () => {
        if (!window.confirm('¿Está seguro de confirmar la asignación de carreras? Esta acción no se puede deshacer fácilmente.')) return;

        setConfirmando(true);
        try {
            const res = await api.post('/asignacion-carrera/confirmar', {}, authHeaders());
            if (res.data.success) {
                mostrarToast(res.data.message, 'success');
                setPreviewData(null);
                cargarResultados();
                verificarEstado();
            }
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al confirmar la asignación.', 'error');
        } finally {
            setConfirmando(false);
        }
    };

    const getBadgeColor = (tipo) => {
        switch (tipo) {
            case 'principal': return 'bg-green-100 text-green-800';
            case 'secundaria': return 'bg-blue-100 text-blue-800';
            case 'sin_cupo': return 'bg-yellow-100 text-yellow-800';
            case 'reprobado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getBadgeLabel = (tipo) => {
        switch (tipo) {
            case 'principal': return 'Carrera Principal';
            case 'secundaria': return 'Carrera Secundaria';
            case 'sin_cupo': return 'Sin Cupo';
            case 'reprobado': return 'Reprobado';
            default: return tipo;
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Asignación por Cupo</h1>
                    <p className="text-sm text-slate-500 mt-1">CU27 - Asignar carrera por cupo según nota final</p>
                </div>
            </div>

            {/* Toast */}
            {toast.visible && (
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${
                    toast.tipo === 'success' ? 'bg-green-600 text-white' :
                    toast.tipo === 'error' ? 'bg-red-600 text-white' :
                    'bg-yellow-500 text-white'
                }`}>
                    {toast.texto}
                </div>
            )}

            {/* Sección: Estado del Sistema */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Estado del Sistema</h2>
                {loading && !verificacion ? (
                    <div className="flex items-center gap-3 text-slate-500 py-4">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Verificando estado...</span>
                    </div>
                ) : verificacion ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 text-center border border-slate-200">
                                <p className="text-2xl sm:text-3xl font-black text-slate-900">{verificacion.total_postulantes}</p>
                                <p className="text-xs text-slate-500 font-semibold mt-1">Total Postulantes</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 sm:p-4 text-center border border-green-200">
                                <p className="text-2xl sm:text-3xl font-black text-green-700">{verificacion.total_con_nota}</p>
                                <p className="text-xs text-green-600 font-semibold mt-1">Con Nota Final</p>
                            </div>
                            <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 text-center border border-yellow-200">
                                <p className="text-2xl sm:text-3xl font-black text-yellow-700">{verificacion.total_sin_nota}</p>
                                <p className="text-xs text-yellow-600 font-semibold mt-1">Sin Nota Final</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3 sm:p-4 text-center border border-red-200">
                                <p className="text-2xl sm:text-3xl font-black text-red-700">{verificacion.total_reprobados}</p>
                                <p className="text-xs text-red-600 font-semibold mt-1">Reprobados</p>
                            </div>
                        </div>

                        <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${
                            verificacion.listo ? 'bg-green-100 text-green-800 border border-green-300' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}>
                            {verificacion.listo ? (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{verificacion.mensaje}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span>{verificacion.mensaje}</span>
                                </div>
                            )}
                        </div>

                        {verificacion.postulantes_sin_nota?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-2">Postulantes sin nota final ({verificacion.postulantes_sin_nota.length})</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                <th className="px-3 py-2 text-left">ID</th>
                                                <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                                                <th className="px-3 py-2 text-left">Nombres</th>
                                                <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                                                <th className="px-3 py-2 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {verificacion.postulantes_sin_nota.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 font-medium text-slate-700">{p.id_postulante}</td>
                                                    <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                                                    <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                                                    <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                                                            {p.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Sección: Generar Vista Previa */}
            {esCoordinadorAutoridad && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Asignación de Carreras</h2>
                            <p className="text-sm text-slate-500">Genere una vista previa del algoritmo de asignación antes de confirmar</p>
                        </div>
                        <button
                            onClick={generarPreview}
                            disabled={loading || !verificacion?.listo}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                loading || !verificacion?.listo
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Procesando...
                                </span>
                            ) : 'Generar Vista Previa'}
                        </button>
                    </div>

                    {/* Preview */}
                    {previewData && (
                        <div className="mt-6 space-y-6">
                            {/* Resumen */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                                    <p className="text-2xl sm:text-3xl font-black text-green-700">{previewData.resumen.total_admitidos}</p>
                                    <p className="text-xs text-green-600 font-semibold mt-1">Admitidos</p>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
                                    <p className="text-2xl sm:text-3xl font-black text-yellow-700">{previewData.resumen.total_sin_cupo}</p>
                                    <p className="text-xs text-yellow-600 font-semibold mt-1">Sin Cupo</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                                    <p className="text-2xl sm:text-3xl font-black text-red-700">{previewData.resumen.total_reprobados}</p>
                                    <p className="text-xs text-red-600 font-semibold mt-1">Reprobados</p>
                                </div>
                            </div>

                            {/* Detalle por carrera */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Cupos por Carrera</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                <th className="px-3 py-2 text-left">Carrera</th>
                                                <th className="px-3 py-2 text-center">Cupo Máx</th>
                                                <th className="px-3 py-2 text-center">Ocupados Antes</th>
                                                <th className="px-3 py-2 text-center">A Ocupar</th>
                                                <th className="px-3 py-2 text-center">Restantes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {previewData.detalle_por_carrera.map(c => (
                                                <tr key={c.carrera_id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 font-medium text-slate-700">{c.carrera_nombre}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-700">{c.cupo_maximo}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-500">{c.cupos_ocupados_actuales}</td>
                                                    <td className="px-3 py-2.5 text-center font-bold text-blue-700">{c.cupos_a_ocupar}</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                                            c.cupos_restantes > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {c.cupos_restantes}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Lista de postulantes */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Postulantes ({previewData.lista_postulantes.length})</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                <th className="px-3 py-2 text-left">#</th>
                                                <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                                                <th className="px-3 py-2 text-left">Nombres</th>
                                                <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                                                <th className="px-3 py-2 text-center">Nota Final</th>
                                                <th className="px-3 py-2 text-center">Asignación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {previewData.lista_postulantes.map((p, idx) => (
                                                <tr key={p.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                                                    <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                                                    <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">{p.nota_final ?? '-'}</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(p.tipo_asignacion)}`}>
                                                            {getBadgeLabel(p.tipo_asignacion)}
                                                            {p.carrera_asignada_nombre ? `: ${p.carrera_asignada_nombre}` : ''}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Botón Confirmar */}
                            <div className="flex justify-end pt-4 border-t border-slate-200">
                                <button
                                    onClick={confirmarAsignacion}
                                    disabled={confirmando}
                                    className="px-6 py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                                >
                                    {confirmando ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Confirmando...
                                        </span>
                                    ) : 'Confirmar Asignación'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sección: Resultados */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Resultados de Asignación</h2>

                {!resultadosData ? (
                    <div className="flex items-center gap-3 text-slate-500 py-4">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Cargando resultados...</span>
                    </div>
                ) : !resultadosData.existen_admitidos ? (
                    <div className="text-center py-8 text-slate-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-semibold">No se ha realizado ninguna asignación aún.</p>
                        <p className="text-xs mt-1">Genere una vista previa y confirme la asignación para ver los resultados.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-slate-200">
                            {TABS_RESULTADOS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTabResultados(tab.id)}
                                    className={`px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer border-b-2 -mb-px ${
                                        tabResultados === tab.id
                                            ? 'text-blue-600 border-blue-600'
                                            : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab: Admitidos */}
                        {tabResultados === 'admitidos' && (
                            <div className="space-y-6">
                                {resultadosData.admitidos_por_carrera.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No hay admitidos.</p>
                                ) : resultadosData.admitidos_por_carrera.map((grupo, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <span>{grupo.carrera_nombre}</span>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">{grupo.total}</span>
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                        <th className="px-3 py-2 text-left">ID</th>
                                                        <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                                                        <th className="px-3 py-2 text-left">Nombres</th>
                                                        <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                                                        <th className="px-3 py-2 text-center">Nota Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {grupo.postulantes.map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50">
                                                            <td className="px-3 py-2.5 font-medium text-slate-700">{p.id_postulante}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                                                            <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-slate-700">{p.nota_final ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tab: Sin Cupo */}
                        {tabResultados === 'sin-cupo' && (
                            <div>
                                {resultadosData.sin_cupo.total === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No hay postulantes sin cupo.</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-500 mb-3">Total: <strong>{resultadosData.sin_cupo.total}</strong></p>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                        <th className="px-3 py-2 text-left">ID</th>
                                                        <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                                                        <th className="px-3 py-2 text-left">Nombres</th>
                                                        <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                                                        <th className="px-3 py-2 text-center">Nota Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {resultadosData.sin_cupo.postulantes.map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50">
                                                            <td className="px-3 py-2.5 font-medium text-slate-700">{p.id_postulante}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                                                            <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-slate-700">{p.nota_final ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Tab: Reprobados */}
                        {tabResultados === 'reprobados' && (
                            <div>
                                {resultadosData.reprobados.total === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No hay postulantes reprobados.</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-500 mb-3">Total: <strong>{resultadosData.reprobados.total}</strong></p>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                                        <th className="px-3 py-2 text-left">ID</th>
                                                        <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                                                        <th className="px-3 py-2 text-left">Nombres</th>
                                                        <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                                                        <th className="px-3 py-2 text-center hidden lg:table-cell">Nota Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {resultadosData.reprobados.postulantes.map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50">
                                                            <td className="px-3 py-2.5 font-medium text-slate-700">{p.id_postulante}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                                                            <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-red-600 hidden lg:table-cell">{p.nota_final ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
