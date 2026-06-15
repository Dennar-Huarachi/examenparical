import React, { useState, useEffect } from 'react';
import { API_URL } from '../constants';

export default function GestionRoles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRol, setEditingRol] = useState(null); // null = Crear, {...rol} = Editar
    const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'exito' | 'error'

    // Cargar roles al montar
    useEffect(() => {
        obtenerRoles();
    }, []);

    const obtenerRoles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/roles`);
            const res = await response.json();
            if (res.success) {
                setRoles(res.data);
            } else {
                mostrarMensaje(res.message || 'Error al cargar roles', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión con el backend', 'error');
        } finally {
            setLoading(false);
        }
    };

    const mostrarMensaje = (texto, tipo) => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
    };

    const abrirCrearModal = () => {
        setEditingRol(null);
        setFormData({ nombre: '', descripcion: '' });
        setModalOpen(true);
    };

    const abrirEditarModal = (rol) => {
        setEditingRol(rol);
        setFormData({ nombre: rol.nombre, descripcion: rol.descripcion || '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const url = editingRol ? `${API_URL}/roles/${editingRol.id}` : `${API_URL}/roles`;
        const method = editingRol ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const res = await response.json();

            if (res.success) {
                mostrarMensaje(res.message || 'Operación exitosa', 'exito');
                setModalOpen(false);
                obtenerRoles();
            } else {
                // Muestra la validación exacta del backend (ej: duplicado)
                mostrarMensaje(res.message || 'Error al procesar el rol', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error al conectar con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const eliminarRol = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer.')) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/roles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const res = await response.json();

            if (res.success) {
                mostrarMensaje(res.message || 'Rol eliminado con éxito', 'exito');
                obtenerRoles();
            } else {
                mostrarMensaje(res.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error al conectar con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto mt-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                {/* Cabecera */}
                <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CU05: Gestionar Roles</h1>
                        <p className="text-gray-500 mt-1 text-sm">Crea, edita y administra los perfiles y roles del sistema.</p>
                    </div>
                    <button
                        onClick={abrirCrearModal}
                        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Nuevo Rol
                    </button>
                </div>

                {/* Notificaciones */}
                {mensaje.texto && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2 transition-all animate-bounce ${
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

                {/* Tabla de Roles */}
                {loading && roles.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-150">
                        <table className="min-w-full divide-y divide-gray-100 bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre del Rol</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {roles.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-gray-400 text-sm">
                                            No hay roles registrados en el sistema.
                                        </td>
                                    </tr>
                                ) : (
                                    roles.map((rol) => (
                                        <tr key={rol.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">#{rol.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                                                    {rol.nombre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{rol.descripcion || 'Sin descripción'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => abrirEditarModal(rol)}
                                                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => eliminarRol(rol.id)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs"
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

            {/* Modal de Crear / Editar */}
            {modalOpen && (
                <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100">
                        <div className="bg-indigo-700 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">{editingRol ? 'Modificar Rol' : 'Registrar Nuevo Rol'}</h3>
                            <button onClick={() => setModalOpen(false)} className="hover:text-gray-200 cursor-pointer">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre del Rol</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Secretaria, Auxiliar, Auditor"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm font-medium"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción</label>
                                <textarea
                                    rows="3"
                                    placeholder="Describe las funciones y accesos de este rol..."
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm font-medium"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md transition-all cursor-pointer text-sm"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Perfil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
