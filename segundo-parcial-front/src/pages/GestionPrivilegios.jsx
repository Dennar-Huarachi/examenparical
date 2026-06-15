import React, { useState, useEffect } from 'react';
import { API_URL } from '../constants';

export default function GestionPrivilegios() {
    const [roles, setRoles] = useState([]);
    const [selectedRolId, setSelectedRolId] = useState('');
    const [privilegios, setPrivilegios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'exito' | 'error'

    // Cargar los roles disponibles
    useEffect(() => {
        obtenerRoles();
    }, []);

    // Cargar los privilegios cada vez que se cambia de rol
    useEffect(() => {
        if (selectedRolId) {
            obtenerPrivilegios(selectedRolId);
        } else {
            setPrivilegios([]);
        }
    }, [selectedRolId]);

    const obtenerRoles = async () => {
        try {
            const response = await fetch(`${API_URL}/roles`);
            const res = await response.json();
            if (res.success) {
                setRoles(res.data);
            } else {
                mostrarMensaje('Error al obtener roles', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión con el backend', 'error');
        }
    };

    const obtenerPrivilegios = async (rolId) => {
        setLoading(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            const response = await fetch(`${API_URL}/privilegios/${rolId}`);
            const res = await response.json();
            if (res.success) {
                setPrivilegios(res.data);
            } else {
                mostrarMensaje(res.message || 'Error al obtener privilegios', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error al conectar con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const mostrarMensaje = (texto, tipo) => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 6000);
    };

    const handleCheckboxChange = (id) => {
        setPrivilegios(privilegios.map(priv => 
            priv.id === id ? { ...priv, activo: !priv.activo } : priv
        ));
    };

    const guardarCambios = async () => {
        if (!selectedRolId) return;
        setGuardando(true);
        setMensaje({ texto: '', tipo: '' });

        // Obtener solo los IDs de los privilegios que están activos
        const privilegioIdsActivos = privilegios
            .filter(priv => priv.activo)
            .map(priv => priv.id);

        try {
            const response = await fetch(`${API_URL}/privilegios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    rol_id: parseInt(selectedRolId),
                    privilegio_ids: privilegioIdsActivos
                })
            });
            const res = await response.json();

            if (res.success) {
                mostrarMensaje(res.message || 'Privilegios actualizados con éxito', 'exito');
                // Recargar para estar al día
                obtenerPrivilegios(selectedRolId);
            } else {
                // Captura el bloqueo del Admin Principal
                mostrarMensaje(res.message || 'Error al guardar los privilegios', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión con el backend', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                {/* Cabecera */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CU06: Asignar Privilegios</h1>
                    <p className="text-gray-500 mt-1 text-sm">Gestiona la matriz de accesos y permisos atómicos asignados a cada rol.</p>
                </div>

                {/* Seleccion de Rol */}
                <div className="mb-8 max-w-md">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Selecciona un Rol</label>
                    <select
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white transition-all text-sm font-semibold text-gray-800"
                        value={selectedRolId}
                        onChange={(e) => setSelectedRolId(e.target.value)}
                    >
                        <option value="">-- Selecciona un Rol / Perfil --</option>
                        {roles.map((rol) => (
                            <option key={rol.id} value={rol.id}>
                                {rol.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Notificaciones */}
                {mensaje.texto && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-2.5 border transition-all ${
                        mensaje.tipo === 'exito' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            {mensaje.tipo === 'exito' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            )}
                        </svg>
                        <div>
                            <span className="font-bold block mb-0.5">{mensaje.tipo === 'exito' ? 'Éxito en la operación' : 'Restricción del Sistema'}</span>
                            <span className="font-medium text-xs opacity-90">{mensaje.texto}</span>
                        </div>
                    </div>
                )}

                {/* Matriz de Privilegios */}
                {!selectedRolId ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                        </svg>
                        <p className="font-semibold text-sm">Selecciona un rol de la lista para gestionar sus privilegios asociados.</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {privilegios.map((priv) => (
                                <div 
                                    key={priv.id} 
                                    onClick={() => handleCheckboxChange(priv.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-4 select-none ${
                                        priv.activo 
                                            ? 'bg-indigo-50/50 border-indigo-600 shadow-sm' 
                                            : 'bg-white border-gray-200 hover:border-gray-350'
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <span className={`inline-block text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                                            priv.activo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {priv.nombre}
                                        </span>
                                        <p className="text-gray-600 text-xs font-semibold leading-relaxed">{priv.descripcion}</p>
                                    </div>
                                    <div className="flex items-center mt-1">
                                        {/* Switch Toggle Alternativo con Tailwind */}
                                        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                                            priv.activo ? 'bg-indigo-600' : 'bg-gray-200'
                                        }`}>
                                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                                                priv.activo ? 'translate-x-5' : 'translate-x-0'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Guardado */}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={guardarCambios}
                                disabled={guardando}
                                className="bg-green-600 hover:bg-green-700 active:scale-95 disabled:bg-gray-400 font-extrabold text-white px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
                            >
                                {guardando ? 'Guardando...' : 'Aplicar Privilegios'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
