import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MONTO_FIJO = 700;

export default function PagosPage() {
    const navigate = useNavigate();
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState('');

    const [verifComprobante, setVerifComprobante] = useState('');
    const [verifCi, setVerifCi] = useState('');
    const [verifResultado, setVerifResultado] = useState(null);
    const [verifLoading, setVerifLoading] = useState(false);

    const [nuevoComprobante, setNuevoComprobante] = useState('');
    const [nuevoCi, setNuevoCi] = useState('');
    const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
    const [registrando, setRegistrando] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerPagos = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const params = {};
            if (filtroEstado) params.estado = filtroEstado;
            const res = await api.get('/pagos', { params, headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setPagos(res.data.data);
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar pagos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        obtenerPagos();
    }, [filtroEstado]);

    const handleVerificar = async (e) => {
        e.preventDefault();
        if (!verifComprobante || !verifCi) {
            mostrarToast('Ingresa número de comprobante y CI', 'error');
            return;
        }
        setVerifLoading(true);
        setVerifResultado(null);
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/pagos/verificar', {
                numero_comprobante: verifComprobante,
                ci_pagador: verifCi,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setVerifResultado(res.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al verificar', 'error');
        } finally {
            setVerifLoading(false);
        }
    };

    const handleRegistrarPago = async (e) => {
        e.preventDefault();
        if (!nuevoComprobante || !nuevoCi || !nuevaFecha) {
            mostrarToast('Completa todos los campos', 'error');
            return;
        }
        setRegistrando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/pagos', {
                numero_comprobante: nuevoComprobante,
                ci_pagador: nuevoCi,
                monto: MONTO_FIJO,
                fecha_pago: nuevaFecha,
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Pago registrado correctamente', 'exito');
                setNuevoComprobante('');
                setNuevoCi('');
                setNuevaFecha(new Date().toISOString().split('T')[0]);
                obtenerPagos();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al registrar pago', 'error');
        } finally {
            setRegistrando(false);
        }
    };

    const handleConfirmar = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/pagos/${id}/confirmar`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Pago verificado correctamente', 'exito');
                obtenerPagos();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al confirmar pago', 'error');
        }
    };

    const handleRechazar = async (id) => {
        if (!window.confirm('¿Rechazar este pago?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/pagos/${id}/rechazar`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Pago rechazado', 'exito');
                obtenerPagos();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al rechazar pago', 'error');
        }
    };

    const badgeEstado = (estado) => {
        const map = {
            pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            verificado: 'bg-green-100 text-green-800 border-green-200',
            rechazado: 'bg-red-100 text-red-800 border-red-200',
        };
        return `px-3 py-1 rounded-full text-xs font-bold border ${map[estado] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
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

            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU14: Gestión de Pagos</h1>
                <p className="text-slate-500 mt-1 text-sm">Verifica, registra y administra los pagos de los postulantes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verificar pago
                    </h2>
                    <form onSubmit={handleVerificar} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Número de comprobante"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={verifComprobante}
                            onChange={(e) => { setVerifComprobante(e.target.value); setVerifResultado(null); }}
                        />
                        <input
                            type="text"
                            placeholder="CI del pagador"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={verifCi}
                            onChange={(e) => { setVerifCi(e.target.value); setVerifResultado(null); }}
                        />
                        <button
                            type="submit"
                            disabled={verifLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer text-sm"
                        >
                            {verifLoading ? 'Verificando...' : 'Verificar'}
                        </button>
                    </form>

                    {verifResultado && (
                        <div className={`mt-4 p-4 rounded-xl border text-sm ${
                            !verifResultado.encontrado
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : verifResultado.verificado
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        }`}>
                            <p className="font-bold mb-1">{verifResultado.message}</p>
                            {verifResultado.encontrado && (
                                <div className="text-xs space-y-1 mt-2">
                                    <p>Comprobante: <strong>{verifResultado.pago?.numero_comprobante}</strong></p>
                                    <p>CI: <strong>{verifResultado.pago?.ci_pagador}</strong></p>
                                    <p>Monto: <strong>{verifResultado.pago?.monto} Bs</strong></p>
                                    <p>Fecha: <strong>{verifResultado.pago?.fecha_pago}</strong></p>
                                </div>
                            )}
                            {verifResultado.verificado && !verifResultado.postulante_id && (
                                <button
                                    onClick={() => navigate(`/postulantes?pago_id=${verifResultado.pago?.id}&ci=${verifResultado.pago?.ci_pagador}`)}
                                    className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md cursor-pointer"
                                >
                                    Registrar postulante
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Registrar pago en caja
                    </h2>
                    <form onSubmit={handleRegistrarPago} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Número de comprobante"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={nuevoComprobante}
                            onChange={(e) => setNuevoComprobante(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="CI del pagador"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={nuevoCi}
                            onChange={(e) => setNuevoCi(e.target.value)}
                            required
                        />
                        <div className="relative">
                            <input
                                type="number"
                                value={MONTO_FIJO}
                                readOnly
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm font-bold"
                            />
                            <span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">Bs</span>
                        </div>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={nuevaFecha}
                            onChange={(e) => setNuevaFecha(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={registrando}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer text-sm"
                        >
                            {registrando ? 'Registrando...' : 'Registrar pago'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="font-extrabold text-slate-900 text-lg">Pagos registrados</h2>
                    <select
                        className="w-full sm:w-auto p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="verificado">Verificado</option>
                        <option value="rechazado">Rechazado</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : pagos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">No hay pagos registrados en la gestión activa.</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Comprobante</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI Pagador</th>
                                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Monto</th>
                                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Postulante</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                    </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagos.map((pago) => (
                                    <tr key={pago.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-900 text-xs sm:text-sm">{pago.numero_comprobante}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs sm:text-sm">{pago.ci_pagador}</td>
                                        <td className="hidden sm:table-cell px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">{pago.monto} Bs</td>
                                        <td className="hidden md:table-cell px-4 py-3 text-slate-500 text-xs sm:text-sm">{pago.fecha_pago}</td>
                                        <td className="px-4 py-3"><span className={badgeEstado(pago.estado)}>{pago.estado}</span></td>
                                        <td className="hidden lg:table-cell px-4 py-3 text-slate-500 text-xs sm:text-sm">
                                            {pago.postulante ? (
                                                <span className="text-blue-600 font-semibold">{pago.postulante.id_postulante}</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {pago.estado === 'pendiente' && (
                                                <div className="flex gap-1.5 justify-end">
                                                    <button
                                                        onClick={() => handleConfirmar(pago.id)}
                                                        className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                                        title="Confirmar pago"
                                                    >✓</button>
                                                    <button
                                                        onClick={() => handleRechazar(pago.id)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                                        title="Rechazar pago"
                                                    >✗</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
