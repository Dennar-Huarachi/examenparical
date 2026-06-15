import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ============================================================
// COMPONENTE PRINCIPAL: CU07 — Carreras y Cupos
// ============================================================
export default function CarrerasPage() {
    // ── Estado de datos ──────────────────────────────────────
    const [carreras, setCarreras]           = useState([]);
    const [gestionActiva, setGestionActiva] = useState(null);

    // ── Estado de UI ─────────────────────────────────────────
    const [loading, setLoading]       = useState(false);
    const [modalOpen, setModalOpen]   = useState(false);
    const [editingCarrera, setEditingCarrera] = useState(null); // null = Crear | {...} = Editar

    // ── Filtros ───────────────────────────────────────────────
    const [filtroModalidad, setFiltroModalidad] = useState('Todas'); // 'Todas' | 'presencial' | 'virtual'
    const [filtroEstado, setFiltroEstado]       = useState('Todas'); // 'Todas' | 'Activas' | 'Inactivas'

    // ── Formulario ────────────────────────────────────────────
    const [formData, setFormData] = useState({
        nombre:      '',
        modalidad:   'presencial',
        cupo_maximo: 50,
        activo:      true,
    });
    const [guardando, setGuardando] = useState(false);

    // ── Toast de notificaciones ───────────────────────────────
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' }); // tipo: 'exito' | 'error'

    // ────────────────────────────────────────────────────────
    // Cargar módulo al montar el componente
    // ────────────────────────────────────────────────────────
    useEffect(() => {
        cargarModulo();
    }, []);

    /**
     * Obtiene la gestión activa y luego carga todas las carreras con sus cupos.
     */
    const cargarModulo = useCallback(async () => {
        setLoading(true);
        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // 1. Obtener la gestión activa desde el endpoint de gestiones
            const resGestiones = await api.get('/gestiones', config);
            let gestion = null;
            if (resGestiones.data.success) {
                gestion = resGestiones.data.data.find(g => g.estado === 'activo') || null;
                setGestionActiva(gestion);
            }

            // 2. Cargar las carreras con sus cupos para la gestión activa
            const resCarreras = await api.get('/carreras', config);
            if (resCarreras.data.success) {
                setCarreras(resCarreras.data.data.carreras || []);
            } else {
                mostrarToast('No se pudieron cargar las carreras.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error de conexión con el servidor.';
            mostrarToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Muestra un toast de notificación que desaparece automáticamente.
     */
    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    // ────────────────────────────────────────────────────────
    // Acciones de Modal
    // ────────────────────────────────────────────────────────
    const abrirCrearModal = () => {
        setEditingCarrera(null);
        setFormData({ nombre: '', modalidad: 'presencial', cupo_maximo: 50, activo: true });
        setModalOpen(true);
    };

    const abrirEditarModal = (carrera) => {
        setEditingCarrera(carrera);
        setFormData({
            nombre:      carrera.nombre,
            modalidad:   carrera.modalidad,
            cupo_maximo: carrera.cupo_maximo,
            activo:      carrera.activo,
        });
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setEditingCarrera(null);
    };

    // ────────────────────────────────────────────────────────
    // Operación: Crear / Editar Carrera
    // ────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones en el cliente
        if (!formData.nombre.trim()) {
            mostrarToast('El nombre de la carrera es obligatorio.', 'error');
            return;
        }
        if (formData.cupo_maximo < 0) {
            mostrarToast('El cupo máximo no puede ser negativo.', 'error');
            return;
        }

        setGuardando(true);
        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            let response;
            if (editingCarrera) {
                // Editar carrera existente (PUT incluye cupo_maximo para actualizar cupos en el backend)
                response = await api.put(`/carreras/${editingCarrera.id}`, formData, config);
            } else {
                // Crear nueva carrera (el backend crea el registro en cupos_carrera automáticamente)
                response = await api.post('/carreras', formData, config);
            }

            if (response.data.success) {
                mostrarToast(response.data.message || 'Carrera guardada con éxito.', 'exito');
                cerrarModal();
                cargarModulo();
            } else {
                mostrarToast(response.data.message || 'Error al guardar la carrera.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al procesar la solicitud.';
            mostrarToast(msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    // ────────────────────────────────────────────────────────
    // Operación: Toggle Activo / Inactivo
    // ────────────────────────────────────────────────────────
    const toggleActivo = async (carrera) => {
        const token  = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const response = await api.put(`/carreras/${carrera.id}`, {
                nombre:      carrera.nombre,
                modalidad:   carrera.modalidad,
                activo:      !carrera.activo,
                cupo_maximo: carrera.cupo_maximo,
            }, config);

            if (response.data.success) {
                const nuevoEstado = !carrera.activo ? 'activada' : 'desactivada';
                mostrarToast(`Carrera "${carrera.nombre}" ${nuevoEstado} correctamente.`, 'exito');
                cargarModulo();
            } else {
                mostrarToast(response.data.message || 'Error al actualizar el estado.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error de comunicación con el servidor.';
            mostrarToast(msg, 'error');
        }
    };

    // ────────────────────────────────────────────────────────
    // Operación: Eliminar Carrera
    // ────────────────────────────────────────────────────────
    const eliminarCarrera = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar la carrera "${nombre}"?\nEsta acción no se puede deshacer.`)) return;

        const token = localStorage.getItem('token');
        try {
            const response = await api.delete(`/carreras/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.success) {
                mostrarToast(response.data.message || `Carrera "${nombre}" eliminada con éxito.`, 'exito');
                cargarModulo();
            } else {
                mostrarToast(response.data.message || 'Error al eliminar la carrera.', 'error');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al eliminar la carrera.';
            mostrarToast(msg, 'error');
        }
    };

    // ────────────────────────────────────────────────────────
    // Filtrado en memoria
    // ────────────────────────────────────────────────────────
    const carrerasFiltradas = carreras.filter((c) => {
        // Filtrar por modalidad
        if (filtroModalidad !== 'Todas' && c.modalidad !== filtroModalidad) return false;
        // Filtrar por estado activo
        if (filtroEstado === 'Activas'   && !c.activo) return false;
        if (filtroEstado === 'Inactivas' &&  c.activo) return false;
        return true;
    });

    // ────────────────────────────────────────────────────────
    // Estadísticas de resumen para las tarjetas superiores
    // ────────────────────────────────────────────────────────
    const totalCarreras    = carreras.length;
    const totalActivas     = carreras.filter(c => c.activo).length;
    const totalCupos       = carreras.reduce((s, c) => s + (c.cupo_maximo || 0), 0);
    const totalOcupados    = carreras.reduce((s, c) => s + (c.cupos_ocupados || 0), 0);
    const totalDisponibles = totalCupos - totalOcupados;

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">

            {/* ── Cabecera principal ─────────────────────────── */}
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        CU07: Carreras y Cupos
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm max-w-xl">
                        Administra las carreras universitarias y controla el límite de vacantes para el periodo académico vigente.
                    </p>

                    {/* Badge de gestión activa */}
                    {gestionActiva ? (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <span>Gestión Activa:</span>
                            <span className="font-black">{gestionActiva.codigo}</span>
                            <span className="text-blue-400 font-normal">
                                ({gestionActiva.fecha_inicio} — {gestionActiva.fecha_fin})
                            </span>
                        </div>
                    ) : (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            ⚠️ No hay ninguna gestión activa en el sistema.
                        </div>
                    )}
                </div>

                {/* Botón Nueva Carrera */}
                <button
                    id="btn-nueva-carrera"
                    onClick={abrirCrearModal}
                    disabled={!gestionActiva || loading}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all text-white font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                    title={!gestionActiva ? 'Debe existir una gestión activa para crear carreras' : 'Crear nueva carrera'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nueva Carrera
                </button>
            </div>

            {/* ── Tarjetas de resumen estadístico ───────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Total Carreras"
                    valor={totalCarreras}
                    color="blue"
                    icono={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
                />
                <StatCard
                    label="Activas"
                    valor={totalActivas}
                    color="green"
                    icono={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                />
                <StatCard
                    label="Cupos Totales"
                    valor={totalCupos}
                    color="purple"
                    icono={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
                />
                <StatCard
                    label="Disponibles"
                    valor={totalDisponibles}
                    color={totalDisponibles <= 0 && totalCupos > 0 ? 'red' : 'teal'}
                    icono={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />}
                />
            </div>

            {/* ── Toast de notificación ─────────────────────── */}
            {toast.visible && (
                <div
                    className={`mb-5 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-md border transition-all animate-pulse-once ${
                        toast.tipo === 'exito'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                    role="alert"
                >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {toast.tipo === 'exito' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        )}
                    </svg>
                    <span className="flex-1">{toast.texto}</span>
                    <button
                        onClick={() => setToast({ visible: false, texto: '', tipo: '' })}
                        className="ml-auto opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label="Cerrar notificación"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Panel principal con tabla ──────────────────── */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">

                {/* Barra de filtros */}
                <div className="flex gap-4 flex-wrap items-center bg-slate-50 px-5 py-4 border-b border-slate-100 rounded-t-2xl">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Modalidad
                        </label>
                        <select
                            id="filtro-modalidad"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={filtroModalidad}
                            onChange={(e) => setFiltroModalidad(e.target.value)}
                        >
                            <option value="Todas">Todas las modalidades</option>
                            <option value="presencial">Presencial</option>
                            <option value="virtual">Virtual</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Estado
                        </label>
                        <select
                            id="filtro-estado"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="Todas">Todos los estados</option>
                            <option value="Activas">Solo activas</option>
                            <option value="Inactivas">Solo inactivas</option>
                        </select>
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 font-bold self-end pb-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        {carrerasFiltradas.length} de {totalCarreras} carreras
                    </div>
                </div>

                {/* Tabla de carreras */}
                {loading && carreras.length === 0 ? (
                    // Estado de carga inicial
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600" />
                        <p className="text-sm text-slate-400 font-medium">Cargando carreras...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Carrera
                                    </th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Modalidad
                                    </th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Cupo Máx.
                                    </th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Ocupados
                                    </th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Disponibles
                                    </th>
                                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-sm">
                                {carrerasFiltradas.length === 0 ? (
                                    // Estado de lista vacía
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <p className="text-slate-400 font-medium">No se encontraron carreras con los filtros aplicados.</p>
                                                {(filtroModalidad !== 'Todas' || filtroEstado !== 'Todas') && (
                                                    <button
                                                        onClick={() => { setFiltroModalidad('Todas'); setFiltroEstado('Todas'); }}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold underline cursor-pointer"
                                                    >
                                                        Limpiar filtros
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    carrerasFiltradas.map((c) => {
                                        // Calcular métricas de ocupación para la barra de progreso
                                        const disponibles  = c.cupo_maximo - c.cupos_ocupados;
                                        const porcentaje   = c.cupo_maximo > 0
                                            ? Math.min(100, Math.round((c.cupos_ocupados / c.cupo_maximo) * 100))
                                            : 0;
                                        const estaLleno   = disponibles <= 0 && c.cupo_maximo > 0;
                                        const casiLleno   = porcentaje >= 80 && !estaLleno;

                                        return (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-slate-50/60 transition-colors group"
                                            >
                                                {/* ── Columna: Nombre + Barra de Progreso ── */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{c.nombre}</div>
                                                    {/* Barra de progreso visual de ocupación */}
                                                    {c.cupo_maximo > 0 ? (
                                                        <div className="mt-2 w-44">
                                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                                                <span>Ocupación</span>
                                                                <span className={estaLleno ? 'text-red-500' : casiLleno ? 'text-amber-500' : 'text-green-600'}>
                                                                    {porcentaje}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                <div
                                                                    style={{ width: `${porcentaje}%` }}
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        estaLleno  ? 'bg-red-500' :
                                                                        casiLleno  ? 'bg-amber-400' :
                                                                                     'bg-green-500'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic mt-1 block">
                                                            Sin cupos configurados
                                                        </span>
                                                    )}
                                                </td>

                                                {/* ── Columna: Modalidad Badge ── */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                                        c.modalidad === 'presencial'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-purple-50 text-purple-700 border-purple-200'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                            c.modalidad === 'presencial' ? 'bg-blue-500' : 'bg-purple-500'
                                                        }`} />
                                                        {c.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
                                                    </span>
                                                </td>

                                                {/* ── Columna: Estado (Toggle activo/inactivo) ── */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        id={`toggle-activo-${c.id}`}
                                                        onClick={() => toggleActivo(c)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:shadow-sm active:scale-95 ${
                                                            c.activo
                                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                        title={c.activo ? 'Clic para desactivar' : 'Clic para activar'}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${c.activo ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                        {c.activo ? 'Activo' : 'Inactivo'}
                                                    </button>
                                                </td>

                                                {/* ── Columna: Cupo Máximo ── */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="font-bold text-slate-700">{c.cupo_maximo}</span>
                                                </td>

                                                {/* ── Columna: Cupos Ocupados ── */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="font-semibold text-slate-600">{c.cupos_ocupados}</span>
                                                </td>

                                                {/* ── Columna: Disponibles ── */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`font-bold text-base ${
                                                        estaLleno  ? 'text-red-600' :
                                                        casiLleno  ? 'text-amber-600' :
                                                                     'text-green-600'
                                                    }`}>
                                                        {disponibles}
                                                    </span>
                                                </td>

                                                {/* ── Columna: Acciones ── */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Botón Editar */}
                                                        <button
                                                            id={`btn-editar-${c.id}`}
                                                            onClick={() => abrirEditarModal(c)}
                                                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                            title={`Editar carrera "${c.nombre}"`}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Editar
                                                        </button>

                                                        {/* Botón Eliminar */}
                                                        <button
                                                            id={`btn-eliminar-${c.id}`}
                                                            onClick={() => eliminarCarrera(c.id, c.nombre)}
                                                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                                            title={`Eliminar carrera "${c.nombre}"`}
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pie de tabla con indicador de recarga */}
                {!loading && carreras.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-medium">
                            Mostrando {carrerasFiltradas.length} de {totalCarreras} carreras registradas
                        </span>
                        <button
                            onClick={cargarModulo}
                            disabled={loading}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Recargar datos"
                        >
                            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Actualizar
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                MODAL: Crear / Editar Carrera
            ══════════════════════════════════════════════ */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={editingCarrera ? 'Editar carrera' : 'Crear nueva carrera'}
                >
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">

                        {/* Cabecera del modal */}
                        <div className={`px-6 py-5 flex justify-between items-center text-white ${
                            editingCarrera ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                        }`}>
                            <div>
                                <h2 className="font-extrabold text-lg leading-tight">
                                    {editingCarrera ? 'Editar Carrera' : 'Registrar Nueva Carrera'}
                                </h2>
                                {editingCarrera && (
                                    <p className="text-xs font-medium opacity-80 mt-0.5">{editingCarrera.nombre}</p>
                                )}
                            </div>
                            <button
                                id="btn-cerrar-modal"
                                onClick={cerrarModal}
                                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                                aria-label="Cerrar modal"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Cuerpo del formulario */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* Campo: Nombre */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Nombre de la Carrera <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="campo-nombre"
                                    required
                                    type="text"
                                    placeholder="Ej. Ingeniería Informática"
                                    maxLength={200}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>

                            {/* Campo: Modalidad */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Modalidad <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['presencial', 'virtual'].map((mod) => (
                                        <label
                                            key={mod}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                formData.modalidad === mod
                                                    ? mod === 'presencial'
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="modalidad"
                                                value={mod}
                                                className="sr-only"
                                                checked={formData.modalidad === mod}
                                                onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                                            />
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                formData.modalidad === mod
                                                    ? mod === 'presencial' ? 'bg-blue-500' : 'bg-purple-500'
                                                    : 'bg-slate-300'
                                            }`} />
                                            <span className="font-bold text-sm capitalize">{mod}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Campo: Cupo Máximo */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Cupo Máximo
                                    {gestionActiva && (
                                        <span className="ml-1.5 font-normal normal-case text-slate-400">
                                            (Gestión <strong className="text-blue-600">{gestionActiva.codigo}</strong>)
                                        </span>
                                    )}
                                </label>
                                <input
                                    id="campo-cupo-maximo"
                                    type="number"
                                    min="0"
                                    max="9999"
                                    placeholder="Ej. 80"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 transition-all"
                                    value={formData.cupo_maximo}
                                    onChange={(e) => setFormData({ ...formData, cupo_maximo: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Ingresa 0 para configurar cupos más tarde.</p>
                            </div>

                            {/* Campo: Activo (Toggle visual) */}
                            <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                                formData.activo ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Carrera Habilitada</p>
                                    <p className="text-[11px] text-slate-400">
                                        {formData.activo
                                            ? 'Visible y disponible para postulaciones'
                                            : 'Oculta en el proceso de admisión'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    id="toggle-activo-modal"
                                    onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                        formData.activo ? 'bg-green-500' : 'bg-slate-300'
                                    }`}
                                    role="switch"
                                    aria-checked={formData.activo}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                        formData.activo ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            {/* Botones de acción del formulario */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    id="btn-cancelar"
                                    onClick={cerrarModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    id="btn-guardar"
                                    disabled={guardando}
                                    className={`text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                                        editingCarrera
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
                                    ) : (
                                        editingCarrera ? 'Actualizar Carrera' : 'Registrar Carrera'
                                    )}
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
// COMPONENTE AUXILIAR: Tarjeta de estadística
// ============================================================
function StatCard({ label, valor, color, icono }) {
    const colores = {
        blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-400',   border: 'border-blue-100'   },
        green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-400',  border: 'border-green-100'  },
        purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-400', border: 'border-purple-100' },
        teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-400',   border: 'border-teal-100'   },
        red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-400',    border: 'border-red-100'    },
    };
    const c = colores[color] || colores.blue;

    return (
        <div className={`${c.bg} border ${c.border} rounded-xl px-4 py-3.5 flex items-center gap-3`}>
            <svg className={`w-8 h-8 ${c.icon} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icono}
            </svg>
            <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none">{label}</p>
                <p className={`text-2xl font-black ${c.text} leading-tight mt-0.5`}>{valor}</p>
            </div>
        </div>
    );
}
