import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/authprovider';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

const TABS_PRINCIPALES = [
    { id: 'postulantes', label: 'Postulantes' },
    { id: 'grupos', label: 'Grupos' },
];

const COLORS_PASTEL = { admitido: '#7C3AED', aprobado: '#22C55E', reprobado: '#EF4444', inscrito: '#F59E0B', pendiente: '#94A3B8' };

const ESTADOS_POSTULANTE = ['', 'pendiente', 'inscrito', 'aprobado', 'reprobado', 'admitido'];

function descargarArchivo(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function BadgeEstado({ estado }) {
    const colores = {
        admitido: 'bg-purple-100 text-purple-800',
        aprobado: 'bg-green-100 text-green-800',
        reprobado: 'bg-red-100 text-red-800',
        inscrito: 'bg-yellow-100 text-yellow-800',
        pendiente: 'bg-slate-100 text-slate-600',
    };
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${colores[estado] || 'bg-slate-100 text-slate-600'}`}>
            {estado}
        </span>
    );
}

export default function ReportesPage() {
    const { user } = useContext(AuthContext);
    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const [tab, setTab] = useState('postulantes');
    const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });
    const [loading, setLoading] = useState(false);

    const [carreras, setCarreras] = useState([]);
    const [gestiones, setGestiones] = useState([]);
    const [turnos, setTurnos] = useState([]);

    const chartsRef = useRef(null);

    const mostrarToast = (texto, tipo) => {
        setToast({ visible: true, texto, tipo });
        setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
    };

    useEffect(() => {
        api.get('/carreras', authHeaders()).then(r => { if (r.data.success) setCarreras(r.data.data.carreras || []); }).catch(() => {});
        api.get('/gestiones', authHeaders()).then(r => { if (r.data.success) setGestiones(r.data.data || []); }).catch(() => {});
        api.get('/turnos', authHeaders()).then(r => { if (r.data.success) setTurnos(r.data.data || []); }).catch(() => {});
    }, []);

    const getAuthHeadersForBlob = () => ({
        headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
        responseType: 'blob',
    });

    const exportarExcel = async (tipo, modo, filtros = {}) => {
        try {
            const body = { tipo, modo, filtros };
            const res = await api.post('/reportes/exportar/excel', body, {
                ...getAuthHeadersForBlob(),
                responseType: 'blob',
            });
            descargarArchivo(res.data, `reporte_${tipo}_${modo}_${new Date().toISOString().slice(0,10)}.xlsx`);
            mostrarToast('Excel descargado correctamente.', 'success');
        } catch (e) {
            mostrarToast('Error al exportar Excel.', 'error');
        }
    };

    const exportarPDF = async (tipo, modo, filtros = {}) => {
        try {
            const body = { tipo, modo, filtros };
            const res = await api.post('/reportes/exportar/pdf', body, {
                ...getAuthHeadersForBlob(),
                responseType: 'blob',
            });
            descargarArchivo(res.data, `reporte_${tipo}_${modo}_${new Date().toISOString().slice(0,10)}.pdf`);
            mostrarToast('PDF descargado correctamente.', 'success');
        } catch (e) {
            mostrarToast('Error al exportar PDF.', 'error');
        }
    };

    const exportarSVG = (nombre) => {
        const svgEl = chartsRef.current?.querySelector('svg');
        if (!svgEl) { mostrarToast('No hay gráficos para exportar.', 'error'); return; }
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        descargarArchivo(blob, `${nombre}-${new Date().toISOString().slice(0,10)}.svg`);
        mostrarToast('Gráfico SVG descargado.', 'success');
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reportes</h1>
                    <p className="text-sm text-slate-500 mt-1">CU28 / CU29 / CU30 - Reportes de postulantes, grupos y exportaciones</p>
                </div>
            </div>

            {toast.visible && (
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${
                    toast.tipo === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>{toast.texto}</div>
            )}

            <div className="flex gap-1 border-b border-slate-200">
                {TABS_PRINCIPALES.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-5 py-3 text-sm font-bold transition-colors cursor-pointer border-b-2 -mb-px ${
                            tab === t.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}>{t.label}</button>
                ))}
            </div>

            {tab === 'postulantes' && (
                <TabPostulantes
                    carreras={carreras}
                    gestiones={gestiones}
                    authHeaders={authHeaders}
                    mostrarToast={mostrarToast}
                    loading={loading}
                    setLoading={setLoading}
                    exportarExcel={exportarExcel}
                    exportarPDF={exportarPDF}
                    exportarSVG={exportarSVG}
                    chartsRef={chartsRef}
                />
            )}

            {tab === 'grupos' && (
                <TabGrupos
                    turnos={turnos}
                    gestiones={gestiones}
                    authHeaders={authHeaders}
                    mostrarToast={mostrarToast}
                    loading={loading}
                    setLoading={setLoading}
                    exportarExcel={exportarExcel}
                    exportarPDF={exportarPDF}
                    exportarSVG={exportarSVG}
                    chartsRef={chartsRef}
                />
            )}
        </div>
    );
}

function TabPostulantes({ carreras, gestiones, authHeaders, mostrarToast, loading, setLoading, exportarExcel, exportarPDF, exportarSVG, chartsRef }) {
    const [dataEstatico, setDataEstatico] = useState(null);
    const [dataDinamico, setDataDinamico] = useState(null);
    const [showFiltros, setShowFiltros] = useState(false);

    const [filtros, setFiltros] = useState({
        estado: '', carrera_principal_id: '', carrera_admitida_id: '', turno_preferido: '',
        nota_min: '', nota_max: '', gestion_id: '',
    });
    const [columnas, setColumnas] = useState({
        incluir_notas_materia: false, incluir_carrera_secundaria: false,
        incluir_turno: false, incluir_colegio: false,
    });

    const cargarEstatico = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reportes/postulantes/estatico', authHeaders());
            if (res.data.success) setDataEstatico(res.data.data);
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar reporte estático.', 'error');
        } finally { setLoading(false); }
    };

    const cargarDinamico = async () => {
        setLoading(true);
        try {
            const params = { ...filtros, ...columnas };
            Object.keys(params).forEach(k => { if (!params[k] && params[k] !== false && params[k] !== 0) delete params[k]; });
            const res = await api.get('/reportes/postulantes/dinamico', { ...authHeaders(), params });
            if (res.data.success) setDataDinamico(res.data.data);
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar reporte dinámico.', 'error');
        } finally { setLoading(false); }
    };

    const postulantes = dataDinamico?.postulantes || dataEstatico?.postulantes || [];
    const resumen = dataEstatico?.resumen;

    const datosPie = [];
    if (postulantes.length > 0) {
        const conteo = {};
        postulantes.forEach(p => { conteo[p.estado] = (conteo[p.estado] || 0) + 1; });
        Object.entries(conteo).forEach(([k, v]) => {
            datosPie.push({ name: k, value: v, color: COLORS_PASTEL[k] || '#94A3B8' });
        });
    }

    const carrerasConteo = {};
    postulantes.forEach(p => {
        const nom = p.carrera_principal || 'Sin carrera';
        carrerasConteo[nom] = (carrerasConteo[nom] || 0) + 1;
    });
    const datosBarrasCarreras = Object.entries(carrerasConteo)
        .map(([k, v]) => ({ name: k.length > 15 ? k.slice(0, 15) + '...' : k, value: v }))
        .sort((a, b) => b.value - a.value);

    const columnasDinamicas = Object.keys(columnas).filter(k => columnas[k]);

    return (
        <div className="space-y-6">
            {/* SECCIÓN A: Reporte Estático */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Reporte Estático</h2>
                        <p className="text-sm text-slate-500">Datos fijos de todos los postulantes de la gestión activa</p>
                    </div>
                    <button onClick={cargarEstatico} disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                        {loading ? 'Cargando...' : 'Cargar Reporte'}
                    </button>
                </div>

                {dataEstatico && (
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <span className="text-sm font-semibold text-slate-700">Total: <strong>{resumen?.total || 0}</strong></span>
                            <span className="text-sm font-semibold text-green-700">Admitidos: <strong>{resumen?.admitidos || 0}</strong></span>
                            <span className="text-sm font-semibold text-red-700">Reprobados: <strong>{resumen?.reprobados || 0}</strong></span>
                        </div>

                        <TablaPostulantes data={dataEstatico.postulantes} columnasExtra={[]} />

                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                            <BotonExportar label="Excel" color="green" onClick={() => exportarExcel('postulantes', 'estatico')} />
                            <BotonExportar label="PDF" color="red" onClick={() => exportarPDF('postulantes', 'estatico')} />
                            <BotonExportar label="SVG" color="purple" onClick={() => exportarSVG('reporte-postulantes')} />
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN B: Reporte Dinámico */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Reporte Dinámico</h2>
                        <p className="text-sm text-slate-500">Filtros y columnas personalizables</p>
                    </div>
                    <button onClick={() => setShowFiltros(!showFiltros)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                        {showFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </button>
                </div>

                {showFiltros && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todos</option>
                                    {ESTADOS_POSTULANTE.filter(Boolean).map(e => (
                                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Carrera Principal</label>
                                <select value={filtros.carrera_principal_id} onChange={e => setFiltros(p => ({ ...p, carrera_principal_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todas</option>
                                    {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Carrera Admitida</label>
                                <select value={filtros.carrera_admitida_id} onChange={e => setFiltros(p => ({ ...p, carrera_admitida_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todas</option>
                                    {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Turno Preferido</label>
                                <input type="text" value={filtros.turno_preferido} onChange={e => setFiltros(p => ({ ...p, turno_preferido: e.target.value }))}
                                    placeholder="Ej: mañana, tarde" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nota Mínima</label>
                                <input type="number" step="0.01" min="0" max="100" value={filtros.nota_min}
                                    onChange={e => setFiltros(p => ({ ...p, nota_min: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nota Máxima</label>
                                <input type="number" step="0.01" min="0" max="100" value={filtros.nota_max}
                                    onChange={e => setFiltros(p => ({ ...p, nota_max: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Gestión</label>
                                <select value={filtros.gestion_id} onChange={e => setFiltros(p => ({ ...p, gestion_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Gestión activa</option>
                                    {gestiones.map(g => <option key={g.id} value={g.id}>{g.codigo}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2">Columnas adicionales</p>
                            <div className="flex flex-wrap gap-4">
                                {Object.entries(columnas).map(([k, v]) => (
                                    <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={v} onChange={e => setColumnas(p => ({ ...p, [k]: e.target.checked }))}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        {k === 'incluir_notas_materia' ? 'Notas por materia' :
                                         k === 'incluir_carrera_secundaria' ? 'Carrera secundaria' :
                                         k === 'incluir_turno' ? 'Turno preferido' : 'Colegio de procedencia'}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button onClick={cargarDinamico} disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400">
                            {loading ? 'Cargando...' : 'Aplicar filtros y cargar'}
                        </button>
                    </div>
                )}

                {dataDinamico && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 font-semibold">Resultados: <strong>{dataDinamico.total}</strong> postulantes</p>
                        <TablaPostulantes data={dataDinamico.postulantes} columnasExtra={columnasDinamicas} />
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                            <BotonExportar label="Excel" color="green" onClick={() => exportarExcel('postulantes', 'dinamico', { ...filtros, ...columnas })} />
                            <BotonExportar label="PDF" color="red" onClick={() => exportarPDF('postulantes', 'dinamico', { ...filtros, ...columnas })} />
                            <BotonExportar label="SVG" color="purple" onClick={() => exportarSVG('reporte-postulantes')} />
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN C: Gráficos */}
            {postulantes.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6" ref={chartsRef}>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Gráficos Estadísticos</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Distribución por Estado</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={datosPie} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {datosPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Postulantes por Carrera Principal</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={datosBarrasCarreras}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <BotonExportar label="Exportar Gráficos SVG" color="purple" onClick={() => exportarSVG('reporte-postulantes')} />
                    </div>
                </div>
            )}
        </div>
    );
}

function TablaPostulantes({ data = [], columnasExtra = [] }) {
    const tieneNotasMateria = columnasExtra.includes('incluir_notas_materia');
    const notasKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k.startsWith('nota_') && !['nota_final'].includes(k)) : [];

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left hidden sm:table-cell">CI</th>
                        <th className="px-3 py-2 text-left">Nombres</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">Apellidos</th>
                        <th className="px-3 py-2 text-center">Nota Final</th>
                        <th className="px-3 py-2 text-center">Estado</th>
                        <th className="px-3 py-2 text-left">Carrera Admitida</th>
                        {columnasExtra.includes('incluir_carrera_secundaria') && <th className="px-3 py-2 text-left hidden lg:table-cell">Carrera Sec.</th>}
                        {columnasExtra.includes('incluir_turno') && <th className="px-3 py-2 text-left hidden lg:table-cell">Turno</th>}
                        {columnasExtra.includes('incluir_colegio') && <th className="px-3 py-2 text-left hidden lg:table-cell">Colegio</th>}
                        {tieneNotasMateria && <th className="px-3 py-2 text-left hidden lg:table-cell">Notas</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {data.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-medium text-slate-700">{p.id_postulante}</td>
                            <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.ci}</td>
                            <td className="px-3 py-2.5 text-slate-700">{p.nombres}</td>
                            <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{p.apellidos}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700">{p.nota_final ?? '-'}</td>
                            <td className="px-3 py-2.5 text-center"><BadgeEstado estado={p.estado} /></td>
                            <td className="px-3 py-2.5 text-slate-500">{p.carrera_admitida || '-'}</td>
                            {columnasExtra.includes('incluir_carrera_secundaria') && <td className="px-3 py-2.5 text-slate-500 hidden lg:table-cell">{p.carrera_secundaria || '-'}</td>}
                            {columnasExtra.includes('incluir_turno') && <td className="px-3 py-2.5 text-slate-500 hidden lg:table-cell">{p.turno_preferido || '-'}</td>}
                            {columnasExtra.includes('incluir_colegio') && <td className="px-3 py-2.5 text-slate-500 hidden lg:table-cell">{p.colegio_procedencia || '-'}</td>}
                            {tieneNotasMateria && <td className="px-3 py-2.5 text-slate-500 hidden lg:table-cell">Ver</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm font-semibold">No hay postulantes para mostrar.</p>
            )}
        </div>
    );
}

function TabGrupos({ turnos, gestiones, authHeaders, mostrarToast, loading, setLoading, exportarExcel, exportarPDF, exportarSVG, chartsRef }) {
    const [dataEstatico, setDataEstatico] = useState(null);
    const [dataDinamico, setDataDinamico] = useState(null);
    const [showFiltros, setShowFiltros] = useState(false);
    const [expandido, setExpandido] = useState(null);

    const [filtros, setFiltros] = useState({ turno_id: '', modalidad: '', estado: '', gestion_id: '' });
    const [columnas, setColumnas] = useState({ incluir_postulantes: false, incluir_horarios: false, incluir_estadisticas_notas: false });

    const cargarEstatico = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reportes/grupos/estatico', authHeaders());
            if (res.data.success) setDataEstatico(res.data.data);
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar reporte estático.', 'error');
        } finally { setLoading(false); }
    };

    const cargarDinamico = async () => {
        setLoading(true);
        try {
            const params = { ...filtros, ...columnas };
            Object.keys(params).forEach(k => { if (!params[k] && params[k] !== false) delete params[k]; });
            const res = await api.get('/reportes/grupos/dinamico', { ...authHeaders(), params });
            if (res.data.success) setDataDinamico(res.data.data);
        } catch (e) {
            mostrarToast(e.response?.data?.message || 'Error al cargar reporte dinámico.', 'error');
        } finally { setLoading(false); }
    };

    const grupos = dataDinamico?.grupos || dataEstatico?.grupos || [];

    const datosOcupacion = grupos.map(g => ({
        name: g.nombre,
        inscritos: g.total_inscritos,
        capacidad: g.capacidad_maxima,
    }));

    const datosPromedio = grupos.map(g => ({
        name: g.nombre,
        promedio: g.promedio_notas ?? 0,
    }));

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Reporte Estático de Grupos</h2>
                        <p className="text-sm text-slate-500">Todos los grupos activos con estadísticas</p>
                    </div>
                    <button onClick={cargarEstatico} disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                        {loading ? 'Cargando...' : 'Cargar Reporte'}
                    </button>
                </div>

                {dataEstatico && (
                    <div className="mt-6 space-y-4">
                        <TablaGrupos grupos={dataEstatico.grupos} expandido={expandido} setExpandido={setExpandido} />
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                            <BotonExportar label="Excel" color="green" onClick={() => exportarExcel('grupos', 'estatico')} />
                            <BotonExportar label="PDF" color="red" onClick={() => exportarPDF('grupos', 'estatico')} />
                            <BotonExportar label="SVG" color="purple" onClick={() => exportarSVG('reporte-grupos')} />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Reporte Dinámico de Grupos</h2>
                        <p className="text-sm text-slate-500">Filtros y columnas personalizables</p>
                    </div>
                    <button onClick={() => setShowFiltros(!showFiltros)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                        {showFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </button>
                </div>

                {showFiltros && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Turno</label>
                                <select value={filtros.turno_id} onChange={e => setFiltros(p => ({ ...p, turno_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todos</option>
                                    {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Modalidad</label>
                                <select value={filtros.modalidad} onChange={e => setFiltros(p => ({ ...p, modalidad: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todas</option>
                                    <option value="presencial">Presencial</option>
                                    <option value="virtual">Virtual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Todos</option>
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Gestión</label>
                                <select value={filtros.gestion_id} onChange={e => setFiltros(p => ({ ...p, gestion_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                                    <option value="">Gestión activa</option>
                                    {gestiones.map(g => <option key={g.id} value={g.id}>{g.codigo}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2">Columnas adicionales</p>
                            <div className="flex flex-wrap gap-4">
                                {Object.entries(columnas).map(([k, v]) => (
                                    <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={v} onChange={e => setColumnas(p => ({ ...p, [k]: e.target.checked }))}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        {k === 'incluir_postulantes' ? 'Lista de postulantes' :
                                         k === 'incluir_horarios' ? 'Detalle de horarios' : 'Estadísticas de notas'}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button onClick={cargarDinamico} disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400">
                            {loading ? 'Cargando...' : 'Aplicar filtros y cargar'}
                        </button>
                    </div>
                )}

                {dataDinamico && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 font-semibold">Resultados: <strong>{dataDinamico.total}</strong> grupos</p>
                        <TablaGrupos grupos={dataDinamico.grupos} expandido={expandido} setExpandido={setExpandido} columnas={columnas} />
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                            <BotonExportar label="Excel" color="green" onClick={() => exportarExcel('grupos', 'dinamico', { ...filtros, ...columnas })} />
                            <BotonExportar label="PDF" color="red" onClick={() => exportarPDF('grupos', 'dinamico', { ...filtros, ...columnas })} />
                            <BotonExportar label="SVG" color="purple" onClick={() => exportarSVG('reporte-grupos')} />
                        </div>
                    </div>
                )}
            </div>

            {grupos.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6" ref={chartsRef}>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Gráficos de Grupos</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Ocupación por Grupo</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={datosOcupacion}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="inscritos" fill="#3B82F6" name="Inscritos" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="capacidad" fill="#CBD5E1" name="Capacidad" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Promedio de Notas por Grupo</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={datosPromedio}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <ReferenceLine y={60} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Mín 60', position: 'right', fontSize: 10 }} />
                                    <Bar dataKey="promedio" fill="#22C55E" name="Promedio" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <BotonExportar label="Exportar Gráficos SVG" color="purple" onClick={() => exportarSVG('reporte-grupos')} />
                    </div>
                </div>
            )}
        </div>
    );
}

function TablaGrupos({ grupos = [], expandido, setExpandido, columnas = {} }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-3 py-2 text-left">Grupo</th>
                        <th className="px-3 py-2 text-left">Turno</th>
                        <th className="px-3 py-2 text-left">Modalidad</th>
                        <th className="px-3 py-2 text-center">Inscritos</th>
                        <th className="px-3 py-2 text-center hidden sm:table-cell">Capacidad</th>
                        <th className="px-3 py-2 text-center">Ocupación %</th>
                        {columnas.incluir_estadisticas_notas && <th className="px-3 py-2 text-center hidden md:table-cell">Promedio</th>}
                        {columnas.incluir_estadisticas_notas && <th className="px-3 py-2 text-center hidden lg:table-cell">Nota Máx</th>}
                        {columnas.incluir_estadisticas_notas && <th className="px-3 py-2 text-center hidden lg:table-cell">Nota Mín</th>}
                        <th className="px-3 py-2 text-left hidden lg:table-cell">Docentes</th>
                        {columnas.incluir_horarios && <th className="px-3 py-2 text-left hidden lg:table-cell">Horarios</th>}
                        {columnas.incluir_postulantes && <th className="px-3 py-2 text-center">Postulantes</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {grupos.map((g, i) => {
                        const sinDocentes = g.docentes_asignados?.length === 0 && g.tiene_docentes !== undefined && !g.tiene_docentes;
                        const ocupacionAlta = g.ocupacion_porcentaje > 95;
                        const tienePostulantes = columnas.incluir_postulantes && g.postulantes?.length > 0;
                        const tieneHorarios = columnas.incluir_horarios && g.horarios?.length > 0;
                        return (
                            <React.Fragment key={g.id || i}>
                                <tr className={`hover:bg-slate-50 ${ocupacionAlta ? 'bg-red-50' : ''} ${sinDocentes ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-3 py-2.5 font-medium text-slate-700">{g.nombre}</td>
                                    <td className="px-3 py-2.5"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{g.turno || '-'}</span></td>
                                    <td className="px-3 py-2.5"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">{g.modalidad}</span></td>
                                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">{g.total_inscritos}</td>
                                    <td className="px-3 py-2.5 text-center text-slate-500 hidden sm:table-cell">{g.capacidad_maxima}</td>
                                    <td className={`px-3 py-2.5 text-center font-bold ${ocupacionAlta ? 'text-red-600' : 'text-slate-700'}`}>{g.ocupacion_porcentaje}%</td>
                                    {columnas.incluir_estadisticas_notas && <td className="px-3 py-2.5 text-center text-slate-700 hidden md:table-cell">{g.promedio_notas ?? '-'}</td>}
                                    {columnas.incluir_estadisticas_notas && <td className="px-3 py-2.5 text-center text-slate-500 hidden lg:table-cell">{g.nota_maxima ?? '-'}</td>}
                                    {columnas.incluir_estadisticas_notas && <td className="px-3 py-2.5 text-center text-slate-500 hidden lg:table-cell">{g.nota_minima ?? '-'}</td>}
                                    <td className="px-3 py-2.5 text-slate-500 hidden lg:table-cell max-w-[200px] truncate">
                                        {g.docentes_asignados?.map(d => `${d.nombres} ${d.apellidos} (${d.materia})`).join(', ') || 'Sin docentes'}
                                    </td>
                                    {columnas.incluir_horarios && <td className="px-3 py-2.5 text-center hidden lg:table-cell">{tieneHorarios ? g.horarios.length : 0}</td>}
                                    {columnas.incluir_postulantes && (
                                        <td className="px-3 py-2.5 text-center">
                                            <button onClick={() => setExpandido(expandido === g.id ? null : g.id)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer">
                                                {expandido === g.id ? 'Ocultar' : `${g.postulantes?.length || 0} ver`}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                                {expandido === g.id && g.postulantes?.length > 0 && (
                                    <tr>
                                        <td colSpan="99" className="px-4 py-3 bg-slate-50">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-xs">
                                                    <thead><tr className="text-slate-500 uppercase tracking-wider">
                                                        <th className="px-2 py-1 text-left">CI</th>
                                                        <th className="px-2 py-1 text-left">Nombres</th>
                                                        <th className="px-2 py-1 text-left">Apellidos</th>
                                                        <th className="px-2 py-1 text-center">Nota</th>
                                                        <th className="px-2 py-1 text-center">Estado</th>
                                                    </tr></thead>
                                                    <tbody className="divide-y divide-slate-200">
                                                        {g.postulantes.map(p => (
                                                            <tr key={p.id} className="hover:bg-white">
                                                                <td className="px-2 py-1.5">{p.ci}</td>
                                                                <td className="px-2 py-1.5">{p.nombres}</td>
                                                                <td className="px-2 py-1.5">{p.apellidos}</td>
                                                                <td className="px-2 py-1.5 text-center font-bold">{p.nota_final ?? '-'}</td>
                                                                <td className="px-2 py-1.5 text-center"><BadgeEstado estado={p.estado} /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
            {grupos.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm font-semibold">No hay grupos para mostrar.</p>
            )}
        </div>
    );
}

function BotonExportar({ label, color, onClick }) {
    const colores = {
        green: 'bg-green-600 hover:bg-green-700 shadow-green-600/20',
        red: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
        purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
    };
    return (
        <button onClick={onClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg ${colores[color] || colores.green}`}>
            {label}
        </button>
    );
}
