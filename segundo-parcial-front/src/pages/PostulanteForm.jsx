import React, { useState } from 'react';
import { API_URL } from '../constants';

export default function PostulanteForm() {
    // Estado local para capturar los datos del formulario
    const [formData, setFormData] = useState({
        ci: '',
        nombre: '',
        apellido: '',
        celular: '',
        carrera_id: '1' // Por defecto Carrera 1 (ej. Sistemas)
    });

    const [mensaje, setMensaje] = useState({ texto: '', esExitoso: false });
    const [cargando, setCargando] = useState(false);

    // Capturar los cambios de los inputs de texto
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Enviar los datos a la API de Laravel
    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        setMensaje({ texto: '', esExitoso: false });

        try {
            const response = await fetch(`${API_URL}/postulantes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const resultado = await response.json();

            if (resultado.success) {
                setMensaje({ texto: '¡Postulante registrado con éxito en PostgreSQL!', esExitoso: true });
                // Limpiar formulario
                setFormData({ ci: '', nombre: '', apellido: '', celular: '', carrera_id: '1' });
            } else {
                // Si Laravel rebota por validación (ej. CI duplicado), muestra su mensaje exacto (Regla 3)
                setMensaje({ texto: resultado.message || 'Error en los datos', esExitoso: false });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor backend', esExitoso: false });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                CU11: Registrar Postulante (CUP)
            </h2>

            {mensaje.texto && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                    mensaje.esExitoso ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {mensaje.texto}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula de Identidad (CI)</label>
                    <input type="text" name="ci" value={formData.ci} onChange={handleChange} required
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" placeholder="Ej. 8456123" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido</label>
                        <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Celular</label>
                    <input type="text" name="celular" value={formData.celular} onChange={handleChange}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" placeholder="Ej. 78012345" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Carrera Destino</label>
                    <select name="carrera_id" value={formData.carrera_id} onChange={handleChange}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white transition-all">
                        <option value="1">Ingeniería Informática</option>
                        <option value="2">Ingeniería de Sistemas</option>
                        <option value="3">Ingeniería en Redes y Telecomunicaciones</option>
                    </select>
                </div>

                <button type="submit" disabled={cargando}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg shadow-md transition-colors disabled:bg-gray-400">
                    {cargando ? 'Registrando...' : 'Guardar Postulante'}
                </button>
            </form>
        </div>
    );
}