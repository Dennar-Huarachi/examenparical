import React, { useState } from 'react';
import { API_URL } from '../constants';

export default function PostulanteGestion() {
    const [searchCi, setSearchCi] = useState('');
    const [postulante, setPostulante] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [mensaje, setMensaje] = useState({ texto: '', esExitoso: false });

    // CU14: Buscar Postulante por CI
    const buscarPostulante = async () => {
        if (!searchCi) return;
        setMensaje({ texto: '', esExitoso: false });
        
        try {
            const response = await fetch(`${API_URL}/postulantes/${searchCi}`);
            const res = await response.json();
            
            if (res.success) {
                setPostulante(res.data);
                setEditMode(false);
            } else {
                setPostulante(null);
                setMensaje({ texto: res.message, esExitoso: false });
            }
        } catch (error) {
            setMensaje({ texto: 'Error al conectar con el servidor', esExitoso: false });
        }
    };

    // CU12: Guardar cambios del Postulante (Update)
    const guardarCambios = async () => {
        try {
            const response = await fetch(`${API_URL}/postulantes/${postulante.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postulante)
            });
            const res = await response.json();

            if (res.success) {
                setMensaje({ texto: 'Datos actualizados correctamente', esExitoso: true });
                setEditMode(false);
            } else {
                setMensaje({ texto: res.message, esExitoso: false });
            }
        } catch (error) {
            setMensaje({ texto: 'Error al actualizar', esExitoso: false });
        }
    };

    // CU13: Eliminar Postulante (Delete)
    const eliminarPostulante = async () => {
        if (!window.confirm('¿Estás seguro de eliminar a este postulante?')) return;

        try {
            const response = await fetch(`${API_URL}/postulantes/${postulante.id}`, {
                method: 'DELETE'
            });
            const res = await response.json();

            if (res.success) {
                setMensaje({ texto: 'Postulante eliminado de PostgreSQL', esExitoso: true });
                setPostulante(null);
                setSearchCi('');
            }
        } catch (error) {
            setMensaje({ texto: 'Error al eliminar', esExitoso: false });
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Postulantes</h2>
                
                {/* Buscador CI */}
                <div className="flex flex-col sm:flex-row gap-2 mb-8">
                    <input 
                        type="text" 
                        placeholder="Buscar por CI (ej. 1234567)" 
                        className="w-full sm:flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchCi}
                        onChange={(e) => setSearchCi(e.target.value)}
                    />
                    <button 
                        onClick={buscarPostulante}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Buscar
                    </button>
                </div>

                {mensaje.texto && (
                    <div className={`p-4 rounded-lg mb-6 ${mensaje.esExitoso ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {mensaje.texto}
                    </div>
                )}

                {/* Resultado de la Búsqueda */}
                {postulante && (
                    <div className="border-t pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Nombre</label>
                                <input 
                                    disabled={!editMode}
                                    className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : 'bg-white border-indigo-300'}`}
                                    value={postulante.nombre}
                                    onChange={(e) => setPostulante({...postulante, nombre: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Apellido</label>
                                <input 
                                    disabled={!editMode}
                                    className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : 'bg-white border-indigo-300'}`}
                                    value={postulante.apellido}
                                    onChange={(e) => setPostulante({...postulante, apellido: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">CI</label>
                                <input 
                                    disabled={!editMode}
                                    className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : 'bg-white border-indigo-300'}`}
                                    value={postulante.ci}
                                    onChange={(e) => setPostulante({...postulante, ci: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Estado Actual</label>
                                <select 
                                    disabled={!editMode}
                                    className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : 'bg-white border-indigo-300'}`}
                                    value={postulante.estado}
                                    onChange={(e) => setPostulante({...postulante, estado: e.target.value})}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="reprobado">Reprobado</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            {!editMode ? (
                                <>
                                    <button onClick={() => setEditMode(true)} className="bg-yellow-500 text-white px-4 py-2 rounded font-bold hover:bg-yellow-600">
                                        Modificar Datos
                                    </button>
                                    <button onClick={eliminarPostulante} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700">
                                        Dar de Baja
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={guardarCambios} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
                                        Guardar Cambios
                                    </button>
                                    <button onClick={() => setEditMode(false)} className="bg-gray-500 text-white px-4 py-2 rounded font-bold hover:bg-gray-600">
                                        Cancelar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}