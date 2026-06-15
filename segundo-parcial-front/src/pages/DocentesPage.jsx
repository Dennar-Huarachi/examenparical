import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DISPO_BADGE = {
    mañana: 'bg-amber-100 text-amber-700 border-amber-200',
    tarde: 'bg-orange-100 text-orange-700 border-orange-200',
    noche: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completo: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function DocentesPage() {
    const [docentes, setDocentes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
    const [filtroMateria, setFiltroMateria] = useState('');
    const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('');

    const [cargaModal, setCargaModal] = useState(null);
    const [cargaValor, setCargaValor] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    const obtenerDocentes = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const params = {};
            if (filtroEspecialidad) params.especialidad = filtroEspecialidad;
            if (filtroMateria) params.materia_preferida = filtroMateria;
            if (filtroDisponibilidad) params.disponibilidad_horaria = filtroDisponibilidad;
            const res = await api.get('/docentes', { params, headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setDocentes(res.data.data);
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al cargar docentes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { obtenerDocentes(); }, [filtroEspecialidad, filtroMateria, filtroDisponibilidad]);

    const abrirCargaModal = (docente) => {
        setCargaModal(docente);
        setCargaValor(docente.carga_horaria_maxima?.toString() || '');
    };

    const handleGuardarCarga = async () => {
        if (!cargaValor || parseInt(cargaValor) < 1 || parseInt(cargaValor) > 40) {
            mostrarToast('La carga horaria debe ser entre 1 y 40 horas', 'error');
            return;
        }
        setGuardando(true);
        const token = localStorage.getItem('token');
        try {
            const res = await api.patch(`/docentes/${cargaModal.id}/carga-horaria`, { carga_horaria_maxima: parseInt(cargaValor) }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                mostrarToast('Carga horaria asignada correctamente', 'exito');
                setCargaModal(null);
                obtenerDocentes();
            }
        } catch (error) {
            mostrarToast(error.response?.data?.message || 'Error al asignar carga', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const totalDocentes = docentes.length;
    const conCarga = docentes.filter(d => d.carga_horaria_maxima > 0).length;
    const sinCarga = docentes.filter(d => !d.carga_horaria_maxima).length;
    const promedioHoras = totalDocentes > 0 ? (docentes.reduce((s, d) => s + (d.carga_horaria_maxima || 0), 0) / totalDocentes).toFixed(1) : 0;

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
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU20: Carga Horaria de Docentes</h1>
                <p className="text-slate-500 mt-1 text-sm">Administra la carga horaria máxima de los docentes contratados.</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-slate-900">{totalDocentes}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total docentes</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-green-600">{conCarga}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Con carga asignada</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-slate-400">{sinCarga}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Sin carga asignada</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{promedioHoras}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Promedio hrs/sem</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <input type="text" placeholder="Filtrar por especialidad..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)} />
                    <input type="text" placeholder="Filtrar por materia..." className="p-2.5 border border-slate-200 rounded-xl text-sm flex-1 min-w-[150px]" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} />
                    <select className="p-2.5 border border-slate-200 rounded-xl text-sm" value={filtroDisponibilidad} onChange={e => setFiltroDisponibilidad(e.target.value)}>
                        <option value="">Toda disponibilidad</option>
                        <option value="mañana">Mañana</option>
                        <option value="tarde">Tarde</option>
                        <option value="noche">Noche</option>
                        <option value="completo">Completo</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : docentes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-400 font-medium">No hay docentes contratados en la gestión activa.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Especialidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Materia</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Disponibilidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Carga máx</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Asignadas</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Libres</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Progreso</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {docentes.map(d => {
                                    const pd = d.postulante_docente || {};
                                    const pct = d.carga_horaria_maxima > 0 ? Math.min(100, Math.round((d.horas_asignadas / d.carga_horaria_maxima) * 100)) : 0;
                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{pd.ci || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{pd.nombres} {pd.apellidos}</td>
                                            <td className="px-4 py-3 text-slate-600">{pd.especialidad || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{pd.materia_preferida || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${DISPO_BADGE[pd.disponibilidad_horaria] || 'bg-slate-100 text-slate-600'}`}>
                                                    {pd.disponibilidad_horaria || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-900">{d.carga_horaria_maxima || 0}</td>
                                            <td className="px-4 py-3 font-bold">{d.horas_asignadas ?? 0}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${d.horas_disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>{d.horas_disponibles}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => abrirCargaModal(d)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                                    Asignar carga
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {cargaModal && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Asignar carga horaria</h3>
                        <p className="text-sm text-slate-600 mb-2">Docente: <strong>{cargaModal.postulante_docente?.nombres} {cargaModal.postulante_docente?.apellidos}</strong></p>
                        <p className="text-xs text-slate-400 mb-4">Horas actualmente asignadas en horarios: <strong>{cargaModal.horas_asignadas ?? 0} hrs/sem</strong></p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Carga horaria máxima semanal</label>
                            <input type="number" min={1} max={40} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" value={cargaValor} onChange={e => setCargaValor(e.target.value)} />
                            <p className="text-xs text-slate-400 mt-1">Valor entre 1 y 40 horas por semana.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCargaModal(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer">Cancelar</button>
                            <button onClick={handleGuardarCarga} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-md text-sm cursor-pointer">
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
