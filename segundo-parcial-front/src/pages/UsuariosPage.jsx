import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const TABS = [
    { id: 'postulantes', label: 'Cargar Postulantes' },
    { id: 'docentes', label: 'Cargar Docentes' },
    { id: 'usuarios', label: 'Coordinadores y Autoridades' },
];

export default function UsuariosPage() {
    const [tabActivo, setTabActivo] = useState('postulantes');

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Usuarios del Sistema
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Gestión de usuarios, carga masiva de postulantes y docentes.
                </p>
            </div>

            <div className="border-b border-slate-200 mb-6">
                <div className="flex gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            onClick={() => setTabActivo(tab.id)}
                            className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all cursor-pointer ${
                                tabActivo === tab.id
                                    ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm -mb-px'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {tabActivo === 'postulantes' && <TabImportarPostulantes />}
            {tabActivo === 'docentes' && <TabImportarDocentes />}
            {tabActivo === 'usuarios' && <TabUsuarios />}
        </div>
    );
}

function TabImportarPostulantes() {
    const [archivo, setArchivo] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const descargarPlantilla = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/usuarios/plantilla-postulantes', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla-postulantes.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            mostrarToast('Error al descargar la plantilla.', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls'].includes(ext)) {
                mostrarToast('Solo se aceptan archivos .xlsx o .xls.', 'error');
                e.target.value = '';
                return;
            }
            setArchivo(file);
            setResultado(null);
        }
    };

    const handleImport = async () => {
        if (!archivo) { mostrarToast('Selecciona un archivo primero.', 'error'); return; }
        setProcesando(true);
        setResultado(null);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('archivo', archivo);

        try {
            const res = await api.post('/usuarios/importar-postulantes', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) {
                setResultado(res.data);
                mostrarToast(res.data.message, 'exito');
            } else {
                mostrarToast(res.data.message, 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al importar.';
            mostrarToast(msg, 'error');
        } finally {
            setProcesando(false);
        }
    };

    const exportarErrores = async () => {
        if (!resultado?.errores?.length) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/usuarios/exportar-errores', { errores: resultado.errores }, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'errores-postulantes.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            mostrarToast('Error al exportar errores.', 'error');
        }
    };

    return (
        <div>
            {toast.visible && <ToastNotificacion toast={toast} setToast={setToast} />}

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6 text-sm text-blue-800">
                <p className="font-bold mb-1">Instrucciones</p>
                <p>Sube un archivo Excel con los datos de los postulantes.
                   Descarga la plantilla para ver el formato correcto.
                   Las columnas obligatorias son: ci, nombres, apellidos, correo.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <button
                        id="btn-descargar-plantilla-postulantes"
                        onClick={descargarPlantilla}
                        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Plantilla Excel
                    </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                    <input
                        id="file-input-postulantes"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
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
                            <button
                                onClick={() => { setArchivo(null); document.getElementById('file-input-postulantes').value = ''; }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                            >
                                Quitar archivo
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer block" htmlFor="file-input-postulantes">
                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-bold text-slate-600">
                                Haz clic para seleccionar o arrastra un archivo aquí
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Solo .xlsx o .xls</p>
                        </label>
                    )}
                </div>

                {archivo && (
                    <button
                        id="btn-importar-postulantes"
                        onClick={handleImport}
                        disabled={procesando}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-bold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-sm"
                    >
                        {procesando ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Procesando archivo, por favor espere...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Importar Postulantes
                            </>
                        )}
                    </button>
                )}
            </div>

            {resultado && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-extrabold text-slate-900 text-lg mb-4">Resultado de la Importación</h3>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                            <p className="text-2xl font-black text-green-700">{resultado.total_exitosos}</p>
                            <p className="text-xs font-bold text-green-600">Postulantes importados</p>
                        </div>
                        <div className={`${resultado.total_errores > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                            <p className={`text-2xl font-black ${resultado.total_errores > 0 ? 'text-red-700' : 'text-slate-400'}`}>{resultado.total_errores}</p>
                            <p className={`text-xs font-bold ${resultado.total_errores > 0 ? 'text-red-600' : 'text-slate-400'}`}>Filas con errores</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <p className="text-2xl font-black text-slate-700">{resultado.total_procesados}</p>
                            <p className="text-xs font-bold text-slate-500">Total procesadas</p>
                        </div>
                    </div>

                    {resultado.errores?.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-sm text-red-700">Detalle de errores</h4>
                                <button
                                    id="btn-exportar-errores"
                                    onClick={exportarErrores}
                                    className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Exportar errores
                                </button>
                            </div>
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
                                        {resultado.errores.map((err, i) => (
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
    );
}

function TabImportarDocentes() {
    const [archivo, setArchivo] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const descargarPlantilla = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/usuarios/plantilla-docentes', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla-docentes.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            mostrarToast('Error al descargar la plantilla.', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls'].includes(ext)) { mostrarToast('Solo se aceptan .xlsx o .xls.', 'error'); e.target.value = ''; return; }
            setArchivo(file);
            setResultado(null);
        }
    };

    const handleImport = async () => {
        if (!archivo) { mostrarToast('Selecciona un archivo primero.', 'error'); return; }
        setProcesando(true);
        setResultado(null);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('archivo', archivo);
        try {
            const res = await api.post('/usuarios/importar-docentes', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) { setResultado(res.data); mostrarToast(res.data.message, 'exito'); }
            else { mostrarToast(res.data.message, 'error'); }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al importar.', 'error');
        } finally { setProcesando(false); }
    };

    const exportarErrores = async () => {
        if (!resultado?.errores?.length) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.post('/usuarios/exportar-errores-docentes', { errores: resultado.errores }, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.download = 'errores-docentes.xlsx'; a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) { mostrarToast('Error al exportar errores.', 'error'); }
    };

    return (
        <div>
            {toast.visible && <ToastNotificacion toast={toast} setToast={setToast} />}
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 mb-6 text-sm text-purple-800">
                <p className="font-bold mb-1">Instrucciones</p>
                <p>Sube un archivo Excel con los datos de los postulantes a docentes.
                   Descarga la plantilla para ver el formato correcto.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <button
                    id="btn-descargar-plantilla-docentes"
                    onClick={descargarPlantilla}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-sm mb-4"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar Plantilla Excel
                </button>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors bg-slate-50/50">
                    <input id="file-input-docentes" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                    {archivo ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-3">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-bold text-slate-700">{archivo.name}</span>
                                <span className="text-xs text-slate-400">({(archivo.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button onClick={() => { setArchivo(null); document.getElementById('file-input-docentes').value = ''; }} className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer">Quitar archivo</button>
                        </div>
                    ) : (
                        <label className="cursor-pointer block" htmlFor="file-input-docentes">
                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-bold text-slate-600">Haz clic para seleccionar un archivo</p>
                            <p className="text-xs text-slate-400 mt-1">Solo .xlsx o .xls</p>
                        </label>
                    )}
                </div>
                {archivo && (
                    <button
                        id="btn-importar-docentes"
                        onClick={handleImport}
                        disabled={procesando}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-bold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-sm"
                    >
                        {procesando ? (
                            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Procesando archivo...</>
                        ) : (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Importar Docentes</>
                        )}
                    </button>
                )}
            </div>
            {resultado && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-extrabold text-slate-900 text-lg mb-4">Resultado de la Importación</h3>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                            <p className="text-2xl font-black text-green-700">{resultado.total_exitosos}</p>
                            <p className="text-xs font-bold text-green-600">Docentes importados</p>
                        </div>
                        <div className={`${resultado.total_errores > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                            <p className={`text-2xl font-black ${resultado.total_errores > 0 ? 'text-red-700' : 'text-slate-400'}`}>{resultado.total_errores}</p>
                            <p className={`text-xs font-bold ${resultado.total_errores > 0 ? 'text-red-600' : 'text-slate-400'}`}>Filas con errores</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <p className="text-2xl font-black text-slate-700">{resultado.total_procesados}</p>
                            <p className="text-xs font-bold text-slate-500">Total procesadas</p>
                        </div>
                    </div>
                    {resultado.errores?.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-sm text-red-700">Detalle de errores</h4>
                                <button onClick={exportarErrores} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Exportar errores
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-red-100">
                                <table className="min-w-full divide-y divide-red-100 text-sm">
                                    <thead className="bg-red-50"><tr><th className="px-4 py-2 text-left text-xs font-bold text-red-700">Fila</th><th className="px-4 py-2 text-left text-xs font-bold text-red-700">CI</th><th className="px-4 py-2 text-left text-xs font-bold text-red-700">Motivo</th></tr></thead>
                                    <tbody className="divide-y divide-red-50">
                                        {resultado.errores.map((err, i) => (
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
    );
}

function TabUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [modalPassword, setModalPassword] = useState(null);
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroActivo, setFiltroActivo] = useState('');
    const [formData, setFormData] = useState({ nombre: '', apellido: '', email: '', password: '', password_confirmation: '', rol_id: '' });
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    useEffect(() => { cargarRoles(); cargarUsuarios(); }, []);

    const cargarRoles = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get('/roles', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setRoles((res.data.data || []).filter(r => ['coordinador', 'autoridad', 'administrador', 'Coordinador', 'Autoridad', 'Administrador'].includes(r.nombre)));
            }
        } catch (e) {}
    };

    const cargarUsuarios = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const params = {};
        if (filtroRol) params.rol_id = filtroRol;
        if (filtroActivo === 'activos') params.activo = '1';
        else if (filtroActivo === 'inactivos') params.activo = '0';
        try {
            const res = await api.get('/usuarios', { headers: { Authorization: `Bearer ${token}` }, params });
            if (res.data.success) setUsuarios(res.data.data || []);
        } catch (error) {
            mostrarToast('Error al cargar usuarios.', 'error');
        } finally { setLoading(false); }
    }, [filtroRol, filtroActivo]);

    const abrirCrearModal = () => {
        setEditingUsuario(null);
        setFormData({ nombre: '', apellido: '', email: '', password: '', password_confirmation: '', rol_id: '' });
        setModalOpen(true);
    };

    const abrirEditarModal = (u) => {
        setEditingUsuario(u);
        setFormData({ nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', password_confirmation: '', rol_id: u.rol_id });
        setModalOpen(true);
    };

    const cerrarModal = () => { setModalOpen(false); setEditingUsuario(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim() || !formData.rol_id) {
            mostrarToast('Todos los campos obligatorios deben estar completos.', 'error'); return;
        }
        if (!editingUsuario && formData.password.length < 8) { mostrarToast('La contraseña debe tener al menos 8 caracteres.', 'error'); return; }
        if (!editingUsuario && formData.password !== formData.password_confirmation) { mostrarToast('Las contraseñas no coinciden.', 'error'); return; }

        setGuardando(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            let response;
            const payload = { nombre: formData.nombre.trim(), apellido: formData.apellido.trim(), email: formData.email.trim(), rol_id: formData.rol_id };
            if (editingUsuario) {
                response = await api.put(`/usuarios/${editingUsuario.id}`, { ...payload, activo: editingUsuario.activo }, config);
            } else {
                response = await api.post('/usuarios', { ...payload, password: formData.password, password_confirmation: formData.password }, config);
            }
            if (response.data.success) { mostrarToast(response.data.message, 'exito'); cerrarModal(); cargarUsuarios(); }
            else { mostrarToast(response.data.message, 'error'); }
        } catch (error) { mostrarToast(error.response?.data?.message || 'Error', 'error'); }
        finally { setGuardando(false); }
    };

    const toggleActivo = async (usuario) => {
        const token = localStorage.getItem('token');
        const nuevoEstado = !usuario.activo;
        try {
            const res = await api.put(`/usuarios/${usuario.id}`, {
                nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol_id: usuario.rol_id, activo: nuevoEstado,
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarUsuarios(); }
            else { mostrarToast(res.data.message, 'error'); }
        } catch (error) { mostrarToast(error.response?.data?.message || 'Error', 'error'); }
    };

    const resetPassword = async (usuario) => {
        if (!window.confirm(`¿Resetear la contraseña de "${usuario.nombre} ${usuario.apellido}"?`)) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/usuarios/${usuario.id}/reset-password`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setModalPassword(res.data.data);
                mostrarToast(res.data.message, 'exito');
            } else { mostrarToast(res.data.message, 'error'); }
        } catch (error) { mostrarToast(error.response?.data?.message || 'Error', 'error'); }
    };

    const eliminarUsuario = async (usuario) => {
        if (!window.confirm(`¿Seguro que deseas eliminar a "${usuario.nombre} ${usuario.apellido}"?`)) return;
        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/usuarios/${usuario.id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) { mostrarToast(res.data.message, 'exito'); cargarUsuarios(); }
            else { mostrarToast(res.data.message, 'error'); }
        } catch (error) { mostrarToast(error.response?.data?.message || 'Error', 'error'); }
    };

    const copiarPassword = () => {
        if (modalPassword?.nueva_password) {
            navigator.clipboard.writeText(modalPassword.nueva_password);
            mostrarToast('Contraseña copiada al portapapeles.', 'exito');
        }
    };

    return (
        <div>
            {toast.visible && <ToastNotificacion toast={toast} setToast={setToast} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={filtroRol}
                        onChange={(e) => setFiltroRol(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="">Todos los roles</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                    <select
                        value={filtroActivo}
                        onChange={(e) => setFiltroActivo(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="">Todos los estados</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
                <button
                    id="btn-nuevo-usuario"
                    onClick={abrirCrearModal}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                {loading && usuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                        <p className="text-sm text-slate-400 font-medium">Cargando usuarios...</p>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <p className="text-slate-700 font-bold text-base">No hay usuarios registrados</p>
                        <p className="text-slate-400 text-sm">Crea un nuevo usuario usando el botón superior.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Último Acceso</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-sm">
                                {usuarios.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-5 py-4 font-bold text-slate-900">{u.nombre} {u.apellido}</td>
                                        <td className="px-5 py-4 text-slate-600">{u.email}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                u.rol?.nombre === 'Coordinador' || u.rol?.nombre === 'coordinador'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }`}>
                                                {u.rol?.nombre || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                u.activo ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                            }`}>
                                                {u.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center text-xs text-slate-400">
                                            {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-BO') : '—'}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => toggleActivo(u)}
                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                        u.activo ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-green-50 hover:bg-green-100 text-green-600'
                                                    }`}
                                                    title={u.activo ? 'Desactivar' : 'Activar'}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={u.activo ? "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                                    </svg>
                                                </button>
                                                <button onClick={() => resetPassword(u)}
                                                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Resetear contraseña"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => abrirEditarModal(u)}
                                                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Editar usuario"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => eliminarUsuario(u)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Eliminar usuario"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
                        <div className={`px-6 py-5 flex justify-between items-center text-white ${
                            editingUsuario ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <h2 className="font-extrabold text-lg">{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={cerrarModal} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre <span className="text-red-500">*</span></label>
                                    <input required type="text" maxLength={100} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Apellido <span className="text-red-500">*</span></label>
                                    <input required type="text" maxLength={100} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email <span className="text-red-500">*</span></label>
                                <input required type="email" maxLength={150} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            {!editingUsuario && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña <span className="text-red-500">*</span></label>
                                        <input required type="password" minLength={8} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar <span className="text-red-500">*</span></label>
                                        <input required type="password" minLength={8} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                            value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rol <span className="text-red-500">*</span></label>
                                <select required value={formData.rol_id} onChange={(e) => setFormData({ ...formData, rol_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white transition-all">
                                    <option value="">Seleccionar rol</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={cerrarModal} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">Cancelar</button>
                                <button type="submit" disabled={guardando}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingUsuario ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}>
                                    {guardando ? 'Guardando...' : editingUsuario ? 'Actualizar' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalPassword && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) setModalPassword(null); }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 mb-1">Contraseña Restablecida</h3>
                        <p className="text-sm text-slate-500 mb-1">Usuario: <strong>{modalPassword.nombre}</strong></p>
                        <p className="text-xs text-slate-400 mb-4">Nueva contraseña generada:</p>
                        <div className="bg-slate-100 rounded-xl px-4 py-3 font-mono font-bold text-lg text-slate-800 mb-4 select-all border border-slate-200">
                            {modalPassword.nueva_password}
                        </div>
                        <div className="flex justify-center gap-3">
                            <button onClick={copiarPassword}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer text-sm transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar Contraseña
                            </button>
                            <button onClick={() => setModalPassword(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl cursor-pointer text-sm transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ToastNotificacion({ toast, setToast }) {
    return (
        <div className="mb-5 rounded-xl border shadow-md overflow-hidden">
            <div className={`p-4 text-sm font-semibold flex items-start gap-3 ${
                toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}>
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {toast.tipo === 'exito' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    )}
                </svg>
                <div className="flex-1"><p>{toast.texto}</p></div>
                <button onClick={() => setToast({ visible: false, texto: '', tipo: '' })} className="opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
