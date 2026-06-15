import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function GestionPage() {
    const [gestiones, setGestiones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGestion, setEditingGestion] = useState(null); // null = Crear, {...gestion} = Editar
    const [formData, setFormData] = useState({
        año: new Date().getFullYear(),
        numero: 1,
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'activo'
    });
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'exito' | 'error'

    // Obtener las gestiones académicas al cargar
    useEffect(() => {
        obtenerGestiones();
    }, []);

    const obtenerGestiones = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get('/gestiones', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setGestiones(response.data.data);
            } else {
                mostrarMensaje(response.data.message || 'Error al cargar gestiones', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al conectar con el servidor';
            mostrarMensaje(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const mostrarMensaje = (texto, tipo) => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingGestion(null);
        setFormData({
            año: new Date().getFullYear(),
            numero: 1,
            fecha_inicio: '',
            fecha_fin: '',
            estado: 'activo'
        });
        setModalOpen(true);
    };

    const abrirEditarModal = (gestion) => {
        setEditingGestion(gestion);
        setFormData({
            año: gestion.año,
            numero: gestion.numero,
            fecha_inicio: gestion.fecha_inicio,
            fecha_fin: gestion.fecha_fin,
            estado: gestion.estado
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validación local de fechas
        if (new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)) {
            mostrarMensaje('La fecha de fin debe ser posterior a la fecha de inicio', 'error');
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            let response;
            if (editingGestion) {
                // Editar fechas y estado
                response = await api.put(`/gestiones/${editingGestion.id}`, formData, config);
            } else {
                // Crear gestión
                response = await api.post('/gestiones', formData, config);
            }

            if (response.data.success) {
                mostrarMensaje(response.data.message || 'Operación realizada con éxito', 'exito');
                setModalOpen(false);
                obtenerGestiones();
            } else {
                mostrarMensaje(response.data.message || 'Error al procesar la solicitud', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al conectar con el servidor';
            mostrarMensaje(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const eliminarGestion = async (id, codigo) => {
        if (!window.confirm(`¿Seguro que deseas eliminar la gestión ${codigo}?`)) return;

        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.delete(`/gestiones/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                mostrarMensaje(response.data.message || 'Gestión eliminada con éxito', 'exito');
                obtenerGestiones();
            } else {
                mostrarMensaje(response.data.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al eliminar la gestión';
            mostrarMensaje(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const activarGestion = async (id, codigo) => {
        if (!window.confirm(`¿Seguro que deseas activar la gestión ${codigo}? Esto desactivará automáticamente las demás gestiones.`)) return;

        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.patch(`/gestiones/${id}/activar`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                mostrarMensaje(response.data.message || 'Gestión activada correctamente', 'exito');
                obtenerGestiones();
            } else {
                mostrarMensaje(response.data.message || 'Error al activar la gestión', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al activar la gestión';
            mostrarMensaje(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto mt-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-150 p-6 sm:p-8">
                {/* Cabecera */}
                <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU06: Gestión Académica</h1>
                        <p className="text-slate-500 mt-1 text-sm">Administra los periodos académicos y sus fechas de vigencia.</p>
                    </div>
                    <button
                        onClick={abrirCrearModal}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Nueva Gestión
                    </button>
                </div>

                {/* Notificaciones */}
                {mensaje.texto && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2 transition-all ${
                        mensaje.tipo === 'exito' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            {mensaje.tipo === 'exito' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            )}
                        </svg>
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                {/* Listado en Tabla */}
                {loading && gestiones.length === 0 ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-150">
                        <table className="min-w-full divide-y divide-gray-150 bg-white">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Año</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Número</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Inicio</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Fin</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {gestiones.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                                            No hay gestiones académicas registradas en el sistema.
                                        </td>
                                    </tr>
                                ) : (
                                    gestiones.map((g) => (
                                        <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{g.codigo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{g.año}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">Período {g.numero}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-semibold">{g.fecha_inicio}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-semibold">{g.fecha_fin}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    g.estado === 'activo'
                                                        ? 'bg-green-50 text-green-700 border-green-250'
                                                        : g.estado === 'inactivo'
                                                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {g.estado.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-2">
                                                {g.estado !== 'activo' && (
                                                    <button
                                                        onClick={() => activarGestion(g.id, g.codigo)}
                                                        className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                                        title="Activar gestión y desactivar las demás"
                                                    >
                                                        Activar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => abrirEditarModal(g)}
                                                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-250 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => eliminarGestion(g.id, g.codigo)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Crear / Editar */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
                        {/* Cabecera Modal */}
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">
                                {editingGestion ? `Editar Gestión ${editingGestion.codigo}` : 'Registrar Nueva Gestión'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="hover:text-slate-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Campos no editables o bloqueados en caso de edición */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Año</label>
                                    <input
                                        required
                                        type="number"
                                        min="2020"
                                        max="2100"
                                        disabled={!!editingGestion}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                        value={formData.año}
                                        onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) || '' })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Período / Número</label>
                                    <select
                                        disabled={!!editingGestion}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                        value={formData.numero}
                                        onChange={(e) => setFormData({ ...formData, numero: parseInt(e.target.value) })}
                                    >
                                        <option value={1}>Período 1</option>
                                        <option value={2}>Período 2</option>
                                    </select>
                                </div>
                            </div>

                            {/* Código Preview */}
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código Generado</span>
                                <span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                                    {formData.numero && formData.año ? `${formData.numero}-${formData.año}` : '...'}
                                </span>
                            </div>

                            {/* Fechas */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Inicio</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                                    value={formData.fecha_inicio}
                                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Fin</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                                    value={formData.fecha_fin}
                                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                                />
                            </div>

                            {/* Estado (solo visible al editar) */}
                            {editingGestion && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                                        value={formData.estado}
                                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="cerrado">Cerrado</option>
                                    </select>
                                </div>
                            )}

                            {/* Botones de acción */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Período'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
