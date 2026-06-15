import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ============================================================
// Paleta de colores asignada por índice a cada materia
// ============================================================
const PALETA_COLORES = [
    { barra: 'bg-blue-500',   fondo: 'bg-blue-50',   texto: 'text-blue-700',   borde: 'border-blue-200',   hex: '#3b82f6' },
    { barra: 'bg-green-500',  fondo: 'bg-green-50',  texto: 'text-green-700',  borde: 'border-green-200',  hex: '#22c55e' },
    { barra: 'bg-amber-500',  fondo: 'bg-amber-50',  texto: 'text-amber-700',  borde: 'border-amber-200',  hex: '#f59e0b' },
    { barra: 'bg-purple-500', fondo: 'bg-purple-50', texto: 'text-purple-700', borde: 'border-purple-200', hex: '#a855f7' },
    { barra: 'bg-rose-500',   fondo: 'bg-rose-50',   texto: 'text-rose-700',   borde: 'border-rose-200',   hex: '#f43f5e' },
    { barra: 'bg-cyan-500',   fondo: 'bg-cyan-50',   texto: 'text-cyan-700',   borde: 'border-cyan-200',   hex: '#06b6d4' },
];

// ============================================================
// COMPONENTE PRINCIPAL: CU08 — Materias y Pesos
// ============================================================
export default function MateriasPage() {
    // ── Estado de datos ──────────────────────────────────────
    const [materias, setMaterias]       = useState([]);
    const [totalPeso, setTotalPeso]     = useState(0);
    const [balanceado, setBalanceado]   = useState(false);

    // ── Estado de UI ─────────────────────────────────────────
    const [loading, setLoading]           = useState(false);
    const [guardando, setGuardando]       = useState(false);
    const [modalOpen, setModalOpen]       = useState(false);
    const [editingMateria, setEditingMateria] = useState(null); // null = crear | {...} = editar

    // ── Formulario ────────────────────────────────────────────
    const [formData, setFormData] = useState({ nombre: '', peso: '' });

    // ── Toast de notificaciones ───────────────────────────────
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '', advertencia: null });

    // ────────────────────────────────────────────────────────
    // Cargar datos al montar el componente
    // ────────────────────────────────────────────────────────
    useEffect(() => {
        cargarMaterias();
    }, []);

    /**
     * Obtiene la lista de materias desde el backend y actualiza el estado.
     */
    const cargarMaterias = useCallback(async () => {
        setLoading(true);
        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const res = await api.get('/materias', config);
            if (res.data.success) {
                setMaterias(res.data.data.materias || []);
                setTotalPeso(res.data.data.total_peso || 0);
                setBalanceado(res.data.data.balanceado || false);
            } else {
                mostrarToast('No se pudieron cargar las materias.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error de conexión con el servidor.';
            mostrarToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Muestra un toast de notificación con desaparición automática a los 6 segundos.
     */
    const mostrarToast = (texto, tipo, advertencia = null) => {
        setToast({ visible: true, texto, tipo, advertencia });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '', advertencia: null }), 6000);
    };

    // ────────────────────────────────────────────────────────
    // Acciones de Modal
    // ────────────────────────────────────────────────────────
    const abrirCrearModal = () => {
        setEditingMateria(null);
        setFormData({ nombre: '', peso: '' });
        setModalOpen(true);
    };

    const abrirEditarModal = (materia) => {
        setEditingMateria(materia);
        setFormData({ nombre: materia.nombre, peso: materia.peso });
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setEditingMateria(null);
    };

    // ────────────────────────────────────────────────────────
    // Cálculo del preview de suma en el modal
    // ────────────────────────────────────────────────────────
    const calcularPreviewSuma = () => {
        const nuevoPeso = parseInt(formData.peso) || 0;
        if (editingMateria) {
            // En edición: suma de las otras + nuevo valor
            const sumaOtros = materias
                .filter(m => m.id !== editingMateria.id)
                .reduce((s, m) => s + m.peso, 0);
            return { sumaOtros, total: sumaOtros + nuevoPeso };
        } else {
            // En creación: suma actual + nuevo valor
            return { sumaOtros: totalPeso, total: totalPeso + nuevoPeso };
        }
    };

    const preview = calcularPreviewSuma();

    // ────────────────────────────────────────────────────────
    // Operación: Crear / Editar Materia
    // ────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones en el cliente
        if (!formData.nombre.trim()) {
            mostrarToast('El nombre de la materia es obligatorio.', 'error');
            return;
        }
        const pesoNum = parseInt(formData.peso);
        if (!pesoNum || pesoNum < 1 || pesoNum > 100) {
            mostrarToast('El peso debe ser un número entre 1 y 100.', 'error');
            return;
        }

        setGuardando(true);
        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            let response;
            if (editingMateria) {
                response = await api.put(`/materias/${editingMateria.id}`, formData, config);
            } else {
                response = await api.post('/materias', formData, config);
            }

            if (response.data.success) {
                mostrarToast(
                    response.data.message || 'Materia guardada con éxito.',
                    'exito',
                    response.data.advertencia || null
                );
                cerrarModal();
                cargarMaterias();
            } else {
                mostrarToast(response.data.message || 'Error al guardar la materia.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al procesar la solicitud.';
            mostrarToast(msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    // ────────────────────────────────────────────────────────
    // Operación: Eliminar Materia
    // ────────────────────────────────────────────────────────
    const eliminarMateria = async (id, nombre) => {
        if (!window.confirm(
            `¿Seguro que deseas eliminar la materia "${nombre}"?\n\n⚠️ ADVERTENCIA: Los pesos del resto de materias quedarán desbalanceados y deberás ajustarlos manualmente para que sumen 100%.`
        )) return;

        const token = localStorage.getItem('token');
        try {
            const res = await api.delete(`/materias/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                mostrarToast(
                    res.data.message || `Materia "${nombre}" eliminada.`,
                    'exito',
                    res.data.advertencia || null
                );
                cargarMaterias();
            } else {
                mostrarToast(res.data.message || 'Error al eliminar la materia.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al eliminar la materia.';
            mostrarToast(msg, 'error');
        }
    };

    // ────────────────────────────────────────────────────────
    // Operación: Cargar materias por defecto
    // ────────────────────────────────────────────────────────
    const cargarMateriasDefault = async () => {
        if (!window.confirm(
            '¿Cargar las 4 materias por defecto del sistema?\n\nSe insertarán:\n• Matemáticas: 35%\n• Física: 35%\n• Inglés: 15%\n• Computación: 15%\n\nTotal: 100%'
        )) return;

        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const res = await api.post('/materias/cargar-default', {}, config);
            if (res.data.success) {
                mostrarToast(res.data.message || 'Materias por defecto cargadas.', 'exito');
                cargarMaterias();
            } else {
                mostrarToast(res.data.message || 'Error al cargar materias.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al cargar materias por defecto.';
            mostrarToast(msg, 'error');
        }
    };

    // ────────────────────────────────────────────────────────
    // Helper: color por índice de materia
    // ────────────────────────────────────────────────────────
    const getColor = (index) => PALETA_COLORES[index % PALETA_COLORES.length];

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <div className="max-w-5xl mx-auto mt-6 px-4 pb-10">

            {/* ── Cabecera ────────────────────────────────── */}
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        CU08: Materias y Pesos
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm max-w-xl">
                        Configura las materias del examen de admisión y sus pesos porcentuales.
                        La fórmula de nota final es: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">Σ(promedio_materia × peso / 100)</code>
                    </p>
                </div>
                <button
                    id="btn-nueva-materia"
                    onClick={abrirCrearModal}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nueva Materia
                </button>
            </div>

            {/* ── Indicador grande de suma total ──────────── */}
            <IndicadorPeso totalPeso={totalPeso} balanceado={balanceado} materias={materias} getColor={getColor} />

            {/* ── Toast de notificación ───────────────────── */}
            {toast.visible && (
                <div className={`mb-5 rounded-xl border shadow-md overflow-hidden transition-all`}>
                    <div className={`p-4 text-sm font-semibold flex items-start gap-3 ${
                        toast.tipo === 'exito'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {toast.tipo === 'exito' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            )}
                        </svg>
                        <div className="flex-1">
                            <p>{toast.texto}</p>
                            {toast.advertencia && (
                                <p className="mt-1 text-xs font-normal opacity-80 flex items-start gap-1">
                                    <span>⚠️</span>
                                    <span>{toast.advertencia}</span>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setToast({ visible: false, texto: '', tipo: '', advertencia: null })}
                            className="opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Panel principal con tabla ────────────────── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100">

                {/* Estado: cargando */}
                {loading && materias.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                        <p className="text-sm text-slate-400 font-medium">Cargando materias...</p>
                    </div>
                ) : materias.length === 0 ? (
                    /* Estado: lista vacía */
                    <div className="flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-slate-700 font-bold text-base">No hay materias registradas</p>
                            <p className="text-slate-400 text-sm mt-1 max-w-sm">
                                Puedes cargar las 4 materias base del sistema o crear las tuyas manualmente.
                            </p>
                        </div>
                        <button
                            id="btn-cargar-default"
                            onClick={cargarMateriasDefault}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Cargar materias por defecto
                        </button>
                        <p className="text-[11px] text-slate-400">
                            Matemáticas 35% · Física 35% · Inglés 15% · Computación 15% = 100%
                        </p>
                    </div>
                ) : (
                    /* Tabla de materias */
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Materia</th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Peso (%)</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Proporción visual</th>
                                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-sm">
                                {materias.map((m, idx) => {
                                    const color = getColor(idx);
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors group">

                                            {/* Número de fila */}
                                            <td className="px-6 py-4 text-slate-400 font-bold text-xs">{idx + 1}</td>

                                            {/* Nombre con badge de color */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color.barra}`} />
                                                    <span className="font-bold text-slate-900">{m.nombre}</span>
                                                </div>
                                            </td>

                                            {/* Peso numérico con badge */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black border ${color.fondo} ${color.texto} ${color.borde}`}>
                                                    {m.peso}%
                                                </span>
                                            </td>

                                            {/* Barra de peso proporcional al valor */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden max-w-xs">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${color.barra}`}
                                                            style={{ width: `${m.peso}%` }}
                                                            title={`${m.peso}% del examen de admisión`}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-400 w-8 text-right">
                                                        {m.peso}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        id={`btn-editar-materia-${m.id}`}
                                                        onClick={() => abrirEditarModal(m)}
                                                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                        title={`Editar "${m.nombre}"`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Editar
                                                    </button>
                                                    <button
                                                        id={`btn-eliminar-materia-${m.id}`}
                                                        onClick={() => eliminarMateria(m.id, m.nombre)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                        title={`Eliminar "${m.nombre}"`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Fila de totales */}
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td colSpan={2} className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        TOTAL
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black border ${
                                            balanceado
                                                ? 'bg-green-100 text-green-800 border-green-300'
                                                : 'bg-red-100 text-red-800 border-red-300'
                                        }`}>
                                            {totalPeso}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden max-w-xs flex">
                                                {/* Barras apiladas de todas las materias */}
                                                {materias.map((m, idx) => (
                                                    <div
                                                        key={m.id}
                                                        className={`h-full transition-all duration-500 ${getColor(idx).barra}`}
                                                        style={{ width: `${m.peso}%` }}
                                                        title={`${m.nombre}: ${m.peso}%`}
                                                    />
                                                ))}
                                            </div>
                                            <span className={`text-[11px] font-black w-8 text-right ${balanceado ? 'text-green-600' : 'text-red-500'}`}>
                                                {totalPeso}%
                                            </span>
                                        </div>
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>

                        {/* Pie de tabla */}
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-medium">
                                {materias.length} materia{materias.length !== 1 ? 's' : ''} registrada{materias.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={cargarMaterias}
                                disabled={loading}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Actualizar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Nota explicativa sobre la fórmula ──────── */}
            {materias.length > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
                    <p className="font-bold mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Fórmula de Nota Final Ponderada
                    </p>
                    <p className="font-mono text-xs bg-blue-100 rounded-lg px-3 py-2 border border-blue-200">
                        Nota Final = {materias.map(m => `(${m.nombre} × ${m.peso}/100)`).join(' + ')}
                    </p>
                    <p className="text-[11px] mt-2 text-blue-600 font-medium">
                        {balanceado
                            ? '✅ Los pesos suman exactamente 100%. El cálculo de la nota final es correcto.'
                            : `⚠️ Los pesos suman ${totalPeso}%. Ajusta los pesos para garantizar el cálculo correcto.`}
                    </p>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                MODAL: Crear / Editar Materia
            ══════════════════════════════════════════════ */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">

                        {/* Cabecera del modal */}
                        <div className={`px-6 py-5 flex justify-between items-center text-white ${
                            editingMateria
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">
                                    {editingMateria ? 'Editar Materia' : 'Registrar Nueva Materia'}
                                </h2>
                                {editingMateria && (
                                    <p className="text-xs opacity-80 mt-0.5">{editingMateria.nombre}</p>
                                )}
                            </div>
                            <button
                                id="btn-cerrar-modal-materia"
                                onClick={cerrarModal}
                                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* Campo: Nombre */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Nombre de la Materia <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="campo-nombre-materia"
                                    required
                                    type="text"
                                    placeholder="Ej. Matemáticas"
                                    maxLength={100}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>

                            {/* Campo: Peso */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Peso (%) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="campo-peso-materia"
                                        required
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="Ej. 35"
                                        className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                        value={formData.peso}
                                        onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                                </div>

                                {/* Barra de preview del peso ingresado */}
                                {formData.peso > 0 && (
                                    <div className="mt-2">
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, parseInt(formData.peso) || 0)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preview de suma total */}
                            <div className={`rounded-xl px-4 py-3 border text-sm font-semibold ${
                                preview.total === 100
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : preview.total > 100
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <span>
                                        {preview.total === 100 ? '✅' : preview.total > 100 ? '🚫' : '⚠️'}
                                    </span>
                                    <span>
                                        Suma actual: <strong>{preview.sumaOtros}%</strong>
                                        {formData.peso ? (
                                            <> + nuevo: <strong>{parseInt(formData.peso) || 0}%</strong> = <strong>{preview.total}% / 100%</strong></>
                                        ) : (
                                            <> / 100%</>
                                        )}
                                    </span>
                                </div>
                                {preview.total > 100 && (
                                    <p className="text-xs mt-1 opacity-80">El peso excede el límite disponible de {100 - preview.sumaOtros}%.</p>
                                )}
                                {preview.total < 100 && formData.peso > 0 && (
                                    <p className="text-xs mt-1 opacity-80">Quedarán {100 - preview.total}% sin asignar tras guardar.</p>
                                )}
                            </div>

                            {/* Botones del formulario */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    id="btn-cancelar-materia"
                                    onClick={cerrarModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    id="btn-guardar-materia"
                                    disabled={guardando || preview.total > 100}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingMateria
                                            ? 'bg-amber-500 hover:bg-amber-600'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {guardando ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Guardando...
                                        </span>
                                    ) : editingMateria ? 'Actualizar Materia' : 'Registrar Materia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// COMPONENTE AUXILIAR: Indicador grande de suma de pesos
// ============================================================
function IndicadorPeso({ totalPeso, balanceado, materias, getColor }) {
    const estaVacio = materias.length === 0;

    return (
        <div className={`mb-6 rounded-2xl border-2 p-5 transition-all ${
            estaVacio
                ? 'bg-slate-50 border-slate-200'
                : balanceado
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
        }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">

                {/* Texto principal del indicador */}
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md ${
                        estaVacio
                            ? 'bg-slate-100 text-slate-400'
                            : balanceado
                            ? 'bg-green-500 text-white shadow-green-200'
                            : 'bg-red-500 text-white shadow-red-200'
                    }`}>
                        {estaVacio ? '—' : balanceado ? '✓' : '!'}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            Total de Pesos Asignados
                        </p>
                        <p className={`text-4xl font-black leading-none ${
                            estaVacio ? 'text-slate-400' : balanceado ? 'text-green-700' : 'text-red-600'
                        }`}>
                            {totalPeso}
                            <span className="text-xl font-bold opacity-60 ml-1">/ 100</span>
                        </p>
                        <p className={`text-sm font-bold mt-1 ${
                            estaVacio
                                ? 'text-slate-400'
                                : balanceado
                                ? 'text-green-600'
                                : 'text-red-600'
                        }`}>
                            {estaVacio
                                ? 'Sin materias configuradas'
                                : balanceado
                                ? '✅ Los pesos suman exactamente 100%. Cálculo de notas correcto.'
                                : `⚠️ Los pesos deben sumar exactamente 100% para el cálculo correcto de notas finales. Diferencia: ${100 - totalPeso > 0 ? '+' : ''}${100 - totalPeso}%`}
                        </p>
                    </div>
                </div>

                {/* Mini gráfico de distribución */}
                {materias.length > 0 && (
                    <div className="flex flex-col items-end gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribución</p>
                        <div className="flex items-end gap-1.5 h-12">
                            {materias.map((m, idx) => {
                                const color = getColor(idx);
                                const alturaPorc = Math.max(8, (m.peso / 100) * 48);
                                return (
                                    <div key={m.id} className="flex flex-col items-center gap-1" title={`${m.nombre}: ${m.peso}%`}>
                                        <span className="text-[9px] font-bold text-slate-500">{m.peso}%</span>
                                        <div
                                            className={`w-6 rounded-t-sm ${color.barra} transition-all duration-500`}
                                            style={{ height: `${alturaPorc}px` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Barra de progreso global */}
            {materias.length > 0 && (
                <div className="mt-4">
                    <div className="w-full bg-white/60 h-3 rounded-full overflow-hidden flex border border-white/80 shadow-inner">
                        {materias.map((m, idx) => (
                            <div
                                key={m.id}
                                className={`h-full transition-all duration-500 ${getColor(idx).barra}`}
                                style={{ width: `${m.peso}%` }}
                                title={`${m.nombre}: ${m.peso}%`}
                            />
                        ))}
                        {/* Espacio vacío si no suma 100 */}
                        {totalPeso < 100 && (
                            <div
                                className="h-full bg-slate-200"
                                style={{ width: `${100 - totalPeso}%` }}
                                title={`Sin asignar: ${100 - totalPeso}%`}
                            />
                        )}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] font-bold text-slate-400">
                        <span>0%</span>
                        {materias.map((m, idx) => (
                            <span key={m.id} className={`${getColor(idx).texto}`}>{m.nombre}</span>
                        ))}
                        <span>100%</span>
                    </div>
                </div>
            )}
        </div>
    );
}
