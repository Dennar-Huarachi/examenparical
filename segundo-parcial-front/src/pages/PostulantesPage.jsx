import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ESTADOS = ['pendiente', 'inscrito', 'aprobado', 'reprobado', 'admitido'];
const TURNOS = ['Mañana', 'Tarde', 'Noche'];

const badgeEstado = (estado) => {
    const map = {
        pendiente: 'bg-slate-100 text-slate-700 border-slate-200',
        inscrito: 'bg-blue-100 text-blue-700 border-blue-200',
        aprobado: 'bg-green-100 text-green-700 border-green-200',
        reprobado: 'bg-red-100 text-red-700 border-red-200',
        admitido: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return `px-3 py-1 rounded-full text-xs font-bold border ${map[estado] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
};

export default function PostulantesPage() {
    const [searchParams] = useSearchParams();
    const pagoIdInicial = searchParams.get('pago_id') || '';
    const ciInicial = searchParams.get('ci') || '';

    const [postulantes, setPostulantes] = useState([]);
    const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
    const [loading, setLoading] = useState(false);
    const [carreras, setCarreras] = useState([]);

    const [busqueda, setBusqueda] = useState('');
    const [filtroCarrera, setFiltroCarrera] = useState('');
    const [filtroTurno, setFiltroTurno] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [pagina, setPagina] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paso, setPaso] = useState(1);
    const [pagoVerificado, setPagoVerificado] = useState(null);
    const [verifLoading, setVerifLoading] = useState(false);
    const [verifError, setVerifError] = useState('');

    const [formData, setFormData] = useState({
        pago_id: pagoIdInicial || '',
        ci: ciInicial || '',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        sexo: '',
        direccion: '',
        telefono: '',
        correo: '',
        colegio_procedencia: '',
        ciudad: '',
        carrera_principal_id: '',
        carrera_secundaria_id: '',
        titulo_bachiller: '',
        año_bachillerato: '',
        turno_preferido: '',
        otros: '',
    });
    const [guardando, setGuardando] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detallePostulante, setDetallePostulante] = useState(null);
    const [detalleLoading, setDetalleLoading] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const debounceRef = useRef(null);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerCarreras = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/carreras', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setCarreras(res.data.data.carreras || []);
        } catch (_) {}
    };

    const obtenerPostulantes = useCallback(async (page = 1) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const params = { page, per_page: 20 };
            if (busqueda) params.busqueda = busqueda;
            if (filtroCarrera) params.carrera_principal_id = filtroCarrera;
            if (filtroTurno) params.turno_preferido = filtroTurno;
            if (filtroEstado) params.estado = filtroEstado;
            const res = await api.get('/postulantes', { params, headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setPostulantes(res.data.data);
                setMeta(res.data.meta);
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar postulantes', 'error');
        } finally {
            setLoading(false);
        }
    }, [busqueda, filtroCarrera, filtroTurno, filtroEstado]);

    useEffect(() => {
        obtenerCarreras();
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPagina(1);
            obtenerPostulantes(1);
        }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [busqueda, filtroCarrera, filtroTurno, filtroEstado]);

    useEffect(() => {
        obtenerPostulantes(pagina);
    }, [pagina]);

    const handlePageChange = (p) => {
        if (p >= 1 && p <= meta.last_page) setPagina(p);
    };

    const abrirNuevo = () => {
        setEditando(null);
        setPaso(1);
        setPagoVerificado(null);
        setVerifError('');
        setFormData({
            pago_id: pagoIdInicial || '',
            ci: ciInicial || '',
            nombres: '',
            apellidos: '',
            fecha_nacimiento: '',
            sexo: '',
            direccion: '',
            telefono: '',
            correo: '',
            colegio_procedencia: '',
            ciudad: '',
            carrera_principal_id: '',
            carrera_secundaria_id: '',
            titulo_bachiller: '',
            año_bachillerato: '',
            turno_preferido: '',
            otros: '',
        });
        setModalOpen(true);
    };

    const abrirEditar = (postulante) => {
        setEditando(postulante);
        setPaso(2);
        setPagoVerificado(postulante.pago || { id: postulante.pago_id });
        setVerifError('');
        setFormData({
            pago_id: postulante.pago_id || '',
            ci: postulante.ci || '',
            nombres: postulante.nombres || '',
            apellidos: postulante.apellidos || '',
            fecha_nacimiento: postulante.fecha_nacimiento || '',
            sexo: postulante.sexo || '',
            direccion: postulante.direccion || '',
            telefono: postulante.telefono || '',
            correo: postulante.correo || '',
            colegio_procedencia: postulante.colegio_procedencia || '',
            ciudad: postulante.ciudad || '',
            carrera_principal_id: postulante.carrera_principal_id || '',
            carrera_secundaria_id: postulante.carrera_secundaria_id || '',
            titulo_bachiller: postulante.titulo_bachiller || '',
            año_bachillerato: postulante.año_bachillerato || '',
            turno_preferido: postulante.turno_preferido || '',
            otros: postulante.otros || '',
        });
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setEditando(null);
        setPaso(1);
        setPagoVerificado(null);
        setVerifError('');
    };

    const handleVerificarPago = async () => {
        if (!formData.pago_id && !formData.ci) {
            setVerifError('Ingresa el número de comprobante o CI del pago');
            return;
        }
        setVerifLoading(true);
        setVerifError('');
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/pagos/verificar', {
                numero_comprobante: formData.pago_id,
                ci_pagador: formData.ci,
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.encontrado && res.data.verificado) {
                setPagoVerificado(res.data.pago);
                setFormData(prev => ({ ...prev, pago_id: res.data.pago.id }));
                setPaso(2);
            } else {
                setVerifError(res.data.message || 'El pago no está verificado');
            }
        } catch (error) {
            setVerifError(error.response?.data?.message || 'Error al verificar pago');
        } finally {
            setVerifLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            titulo_bachiller: formData.titulo_bachiller === 'true',
        };
        setGuardando(true);
        const token = localStorage.getItem('token');
        try {
            let res;
            if (editando) {
                res = await api.put(`/postulantes/${editando.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await api.post('/postulantes', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            if (res.data.success) {
                mostrarToast(res.data.message, 'exito');
                cerrarModal();
                obtenerPostulantes(pagina);
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const abrirDetalle = async (id) => {
        setDetalleLoading(true);
        setDrawerOpen(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/postulantes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setDetallePostulante(res.data.data);
        } catch (error) {
            mostrarToast('Error al cargar detalle', 'error');
            setDrawerOpen(false);
        } finally {
            setDetalleLoading(false);
        }
    };

    const handleEliminar = async (postulante) => {
        if (!window.confirm(`¿Eliminar postulante ${postulante.id_postulante}? Esta acción liberará el pago asociado.`)) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/postulantes/${postulante.id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Postulante eliminado correctamente', 'exito');
                obtenerPostulantes(pagina);
                if (drawerOpen && detallePostulante?.id === postulante.id) {
                    setDrawerOpen(false);
                    setDetallePostulante(null);
                }
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al eliminar', 'error');
        }
    };

    const generarPaginas = () => {
        const paginas = [];
        const total = meta.last_page;
        const actual = meta.current_page;
        paginas.push(1);
        for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) {
            paginas.push(i);
        }
        if (total > 1) paginas.push(total);
        return [...new Set(paginas)].sort((a, b) => a - b);
    };

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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Postulantes</h1>
                    <p className="text-slate-500 mt-1 text-xs sm:text-sm">{meta.total} postulantes registrados</p>
                </div>
                <button
                    onClick={abrirNuevo}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nuevo postulante
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Buscar por CI, nombre o apellido..."
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={filtroCarrera}
                        onChange={(e) => setFiltroCarrera(e.target.value)}
                    >
                        <option value="">Todas las carreras</option>
                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <select
                        className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={filtroTurno}
                        onChange={(e) => setFiltroTurno(e.target.value)}
                    >
                        <option value="">Todos los turnos</option>
                        {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="">Todos los estados</option>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : postulantes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-400 font-medium text-lg">No se encontraron postulantes</p>
                    <p className="text-slate-300 text-sm mt-1">Intenta ajustar los filtros o registra un nuevo postulante.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID</th>
                                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre completo</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Carrera principal</th>
                                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Turno</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
                                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nota</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {postulantes.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap text-xs sm:text-sm">{p.id_postulante}</td>
                                            <td className="hidden md:table-cell px-4 py-3 text-slate-600 whitespace-nowrap text-xs sm:text-sm">{p.ci}</td>
                                            <td className="px-4 py-3 text-slate-700 font-medium text-xs sm:text-sm">{p.nombres} {p.apellidos}</td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-slate-600 text-xs sm:text-sm">{p.carrera_principal?.nombre || '—'}</td>
                                            <td className="hidden sm:table-cell px-4 py-3 text-slate-600 text-xs sm:text-sm">{p.turno_preferido || '—'}</td>
                                            <td className="px-4 py-3"><span className={badgeEstado(p.estado)}>{p.estado.toUpperCase()}</span></td>
                                            <td className="hidden sm:table-cell px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">{p.nota_final ?? '—'}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button onClick={() => abrirDetalle(p.id)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Ver</button>
                                                <button onClick={() => abrirEditar(p)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Editar</button>
                                                <button onClick={() => handleEliminar(p)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {meta.last_page > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6">
                            <button
                                onClick={() => handlePageChange(meta.current_page - 1)}
                                disabled={meta.current_page === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-default"
                            >Anterior</button>
                            {generarPaginas().map((p, i, arr) => (
                                <React.Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300 px-1">...</span>}
                                    <button
                                        onClick={() => handlePageChange(p)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                                            p === meta.current_page ? 'bg-blue-600 text-white shadow-md' : 'border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >{p}</button>
                                </React.Fragment>
                            ))}
                            <button
                                onClick={() => handlePageChange(meta.current_page + 1)}
                                disabled={meta.current_page === meta.last_page}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-default"
                            >Siguiente</button>
                        </div>
                    )}
                </>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
                        <div className="bg-blue-600 px-4 sm:px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                            <h3 className="font-bold text-sm sm:text-lg">{editando ? 'Editar postulante' : 'Nuevo postulante'}</h3>
                            <button onClick={cerrarModal} className="hover:text-slate-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!editando && (
                            <div className="flex flex-wrap border-b border-slate-200 px-4 sm:px-6 pt-4 gap-x-2">
                                {[1, 2, 3].map((s) => (
                                    <div key={s} className={`flex items-center pb-3 px-2 sm:px-4 text-[10px] sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                                        paso === s ? 'text-blue-600 border-blue-600' : paso > s ? 'text-green-600 border-green-500' : 'text-slate-400 border-transparent'
                                    }`}>
                                        <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs mr-1 sm:mr-2 shrink-0 ${
                                            paso === s ? 'bg-blue-600 text-white' : paso > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>{paso > s ? '✓' : s}</span>
                                        <span className="hidden sm:inline">{s === 1 ? 'Verificar pago' : s === 2 ? 'Datos personales' : 'Datos académicos'}</span>
                                        <span className="sm:hidden">{s === 1 ? 'Pago' : s === 2 ? 'Personal' : 'Académico'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!editando && paso === 1 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-600 font-medium">Ingresa el número de comprobante o el CI del pagador para verificar el pago.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Número de comprobante</label>
                                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" value={formData.pago_id} onChange={(e) => setFormData(prev => ({ ...prev, pago_id: e.target.value }))} placeholder="O ingresa el CI" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CI del pagador</label>
                                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" value={formData.ci} onChange={(e) => setFormData(prev => ({ ...prev, ci: e.target.value }))} placeholder="O ingresa el comprobante" />
                                        </div>
                                    </div>
                                    {verifError && <p className="text-red-600 text-sm font-semibold">{verifError}</p>}
                                    <button type="button" onClick={handleVerificarPago} disabled={verifLoading} className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer text-sm">
                                        {verifLoading ? 'Verificando...' : 'Verificar pago'}
                                    </button>
                                    {pagoVerificado && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                                            <p className="font-bold">✓ Pago verificado</p>
                                            <p>Comprobante: {pagoVerificado.numero_comprobante}</p>
                                            <p>CI: {pagoVerificado.ci_pagador}</p>
                                            <p>Monto: {pagoVerificado.monto} Bs</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paso >= 2 && (
                                <>
                                    {paso === 2 && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Datos personales</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CI *</label>
                                                    <input required name="ci" value={formData.ci} onChange={handleChange} disabled={!!editando} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:bg-slate-50" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de nacimiento</label>
                                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombres *</label>
                                                    <input required name="nombres" value={formData.nombres} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sexo</label>
                                                    <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                                                        <option value="">Seleccionar</option>
                                                        <option value="M">Masculino</option>
                                                        <option value="F">Femenino</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Apellidos *</label>
                                                    <input required name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                                                    <input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correo</label>
                                                    <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                                                    <input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ciudad</label>
                                                    <input name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Colegio de procedencia</label>
                                                    <input name="colegio_procedencia" value={formData.colegio_procedencia} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {paso === 3 && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Datos académicos</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Carrera principal *</label>
                                                    <select required name="carrera_principal_id" value={formData.carrera_principal_id} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                                                        <option value="">Seleccionar</option>
                                                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Carrera secundaria *</label>
                                                    <select required name="carrera_secundaria_id" value={formData.carrera_secundaria_id} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                                                        <option value="">Seleccionar</option>
                                                        {carreras.filter(c => c.id !== Number(formData.carrera_principal_id)).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título de bachiller *</label>
                                                    <select required name="titulo_bachiller" value={formData.titulo_bachiller} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                                                        <option value="">Seleccionar</option>
                                                        <option value="true">Sí</option>
                                                        <option value="false">No</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Año de bachillerato</label>
                                                    <input type="number" name="año_bachillerato" value={formData.año_bachillerato} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" placeholder="Ej: 2024" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Turno preferido</label>
                                                    <select name="turno_preferido" value={formData.turno_preferido} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                                                        <option value="">Seleccionar</option>
                                                        {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Otros</label>
                                                    <input name="otros" value={formData.otros} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-between pt-3 border-t border-slate-100">
                                <div>
                                    {!editando && paso > 1 && (
                                        <button type="button" onClick={() => setPaso(paso - 1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">
                                            Anterior
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={cerrarModal} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">
                                        Cancelar
                                    </button>
                                    {!editando && paso < 3 ? (
                                        <button type="button" onClick={() => paso === 1 && pagoVerificado ? setPaso(2) : paso === 2 && setPaso(3)} disabled={paso === 1 && !pagoVerificado} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer disabled:cursor-not-allowed">
                                            Siguiente
                                        </button>
                                    ) : (
                                        <button type="submit" disabled={guardando} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer">
                                            {guardando ? 'Guardando...' : editando ? 'Actualizar datos' : 'Registrar postulante'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {drawerOpen && (
                <div className="fixed inset-0 bg-slate-950/30 z-50" onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                            <h3 className="font-bold text-lg">Detalle del postulante</h3>
                            <button onClick={() => { setDrawerOpen(false); setDetallePostulante(null); }} className="hover:text-slate-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {detalleLoading ? (
                            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                        ) : detallePostulante ? (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xl font-extrabold text-slate-900">{detallePostulante.nombres} {detallePostulante.apellidos}</h4>
                                        <p className="text-sm text-slate-500">{detallePostulante.id_postulante} · CI: {detallePostulante.ci}</p>
                                    </div>
                                    <span className={badgeEstado(detallePostulante.estado)}>{detallePostulante.estado.toUpperCase()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Carrera principal</p>
                                        <p className="font-bold text-slate-800 mt-1">{detallePostulante.carrera_principal?.nombre || '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Carrera secundaria</p>
                                        <p className="font-bold text-slate-800 mt-1">{detallePostulante.carrera_secundaria?.nombre || '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Turno</p>
                                        <p className="font-bold text-slate-800 mt-1">{detallePostulante.turno_preferido || '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Nota final</p>
                                        <p className="font-bold text-slate-800 mt-1">{detallePostulante.nota_final ?? '—'}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Información personal</h5>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-slate-400">Fecha nacimiento:</span> <span className="font-semibold">{detallePostulante.fecha_nacimiento || '—'}</span></div>
                                        <div><span className="text-slate-400">Sexo:</span> <span className="font-semibold">{detallePostulante.sexo === 'M' ? 'Masculino' : detallePostulante.sexo === 'F' ? 'Femenino' : '—'}</span></div>
                                        <div><span className="text-slate-400">Teléfono:</span> <span className="font-semibold">{detallePostulante.telefono || '—'}</span></div>
                                        <div><span className="text-slate-400">Correo:</span> <span className="font-semibold">{detallePostulante.correo || '—'}</span></div>
                                        <div><span className="text-slate-400">Dirección:</span> <span className="font-semibold">{detallePostulante.direccion || '—'}</span></div>
                                        <div><span className="text-slate-400">Ciudad:</span> <span className="font-semibold">{detallePostulante.ciudad || '—'}</span></div>
                                        <div className="col-span-2"><span className="text-slate-400">Colegio:</span> <span className="font-semibold">{detallePostulante.colegio_procedencia || '—'}</span></div>
                                        <div className="col-span-2"><span className="text-slate-400">Título bachiller:</span> <span className="font-semibold">{detallePostulante.titulo_bachiller || '—'}</span></div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Pago</h5>
                                    {detallePostulante.pago ? (
                                        <div className="bg-slate-50 rounded-xl p-3 text-sm">
                                            <p>Comprobante: <strong>{detallePostulante.pago.numero_comprobante}</strong></p>
                                            <p>Monto: <strong>{detallePostulante.pago.monto} Bs</strong></p>
                                            <p>Estado: <span className={badgeEstado(detallePostulante.pago.estado)}>{detallePostulante.pago.estado}</span></p>
                                        </div>
                                    ) : <p className="text-slate-400 text-sm">Sin pago registrado</p>}
                                </div>

                                {detallePostulante.grupos?.length > 0 && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Grupo asignado</h5>
                                        {detallePostulante.grupos.map(g => (
                                            <div key={g.id} className="bg-slate-50 rounded-xl p-3 text-sm">
                                                <p><strong>{g.nombre}</strong></p>
                                                {g.turno && <p className="text-slate-500">Turno: {g.turno.nombre}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {detallePostulante.notasMateria?.length > 0 && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Notas por materia</h5>
                                        <div className="space-y-2">
                                            {detallePostulante.notasMateria.map(nm => (
                                                <div key={nm.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-sm">
                                                    <span className="font-semibold">{nm.materia?.nombre || `Materia #${nm.materia_id}`}</span>
                                                    <span className={`font-bold ${nm.aprobado ? 'text-green-600' : 'text-red-600'}`}>
                                                        {nm.promedio} {nm.aprobado ? '(A)' : '(R)'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-slate-100 pt-4 flex gap-3">
                                    <button onClick={() => { setDrawerOpen(false); setDetallePostulante(null); abrirEditar(detallePostulante); }} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer">
                                        Editar
                                    </button>
                                    <button onClick={() => { const p = detallePostulante; setDrawerOpen(false); setDetallePostulante(null); handleEliminar(p); }} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
