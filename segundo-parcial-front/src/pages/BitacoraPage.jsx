import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/authprovider';
import api from '../services/api';

const COLORES_ROL = {
  coordinador: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  autoridad: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  administrador: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  docente: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-300', badge: 'bg-green-100 text-green-700 border-green-200' },
};

function colorRol(rol) {
  const r = (rol || '').toLowerCase();
  return COLORES_ROL[r] || { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function colorAccion(accion) {
  if (['LOGIN', 'LOGOUT'].includes(accion)) return { dot: 'bg-blue-500', border: 'border-blue-300', bg: 'bg-blue-50' };
  if (accion === 'CREAR') return { dot: 'bg-green-500', border: 'border-green-300', bg: 'bg-green-50' };
  if (accion === 'EDITAR') return { dot: 'bg-yellow-500', border: 'border-yellow-300', bg: 'bg-yellow-50' };
  if (accion === 'ELIMINAR') return { dot: 'bg-red-500', border: 'border-red-300', bg: 'bg-red-50' };
  if (accion === 'MODIFICACION_NOTA') return { dot: 'bg-orange-500', border: 'border-orange-300', bg: 'bg-orange-50' };
  if (accion.startsWith('ASIGNACION')) return { dot: 'bg-purple-500', border: 'border-purple-300', bg: 'bg-purple-50' };
  if (accion.startsWith('IMPORTACION')) return { dot: 'bg-cyan-500', border: 'border-cyan-300', bg: 'bg-cyan-50' };
  if (accion.startsWith('EXPORTACION')) return { dot: 'bg-indigo-500', border: 'border-indigo-300', bg: 'bg-indigo-50' };
  return { dot: 'bg-slate-400', border: 'border-slate-300', bg: 'bg-slate-50' };
}

function iniciales(nombre, apellido) {
  return ((nombre || '')[0] + (apellido || '')[0]).toUpperCase() || '?';
}

function formatearDuracion(minutos) {
  if (minutos == null) return null;
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SkeletonAcciones() {
  return (
    <div className="space-y-3 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-slate-200 mt-1 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="h-3 bg-slate-200 rounded w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BitacoraPage() {
  const { user } = useContext(AuthContext);
  const esAutoridad = user?.rol && ['autoridad', 'administrador'].includes(user.rol.toLowerCase());

  if (!esAutoridad) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
          </svg>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-500">No tiene permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <BitacoraContent />;
}

function BitacoraContent() {
  const [stats, setStats] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pagina_actual: 1, ultima_pagina: 1 });
  const [pagina, setPagina] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filtros, setFiltros] = useState({ fecha_inicio: '', fecha_fin: '', usuario_id: '', rol_id: '' });
  const [expandidas, setExpandidas] = useState({});
  const [accionesCargadas, setAccionesCargadas] = useState({});

  const cargarStats = useCallback(async () => {
    try {
      const res = await api.get('/bitacora/estadisticas');
      if (res.data.success) setStats(res.data.data);
    } catch (e) { /* ignore */ }
  }, []);

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await api.get('/usuarios');
      if (res.data.success) setUsuarios(res.data.data || []);
    } catch (e) { /* ignore */ }
  }, []);

  const cargarSesiones = useCallback(async (pag = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pag };
      Object.entries(filtros).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/bitacora', { params });
      if (res.data.success) {
        setSesiones(res.data.data || []);
        setMeta(res.data.meta || { total: 0, pagina_actual: 1, ultima_pagina: 1 });
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargarStats(); cargarUsuarios(); }, []);
  useEffect(() => { cargarSesiones(pagina); }, [pagina]);

  const aplicarFiltros = () => {
    setPagina(1);
    cargarSesiones(1);
  };

  const limpiarFiltros = () => {
    setFiltros({ fecha_inicio: '', fecha_fin: '', usuario_id: '', rol_id: '' });
    setPagina(1);
    setTimeout(() => cargarSesiones(1), 0);
  };

  const shortcutFecha = (tipo) => {
    const hoy = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    let inicio = new Date();
    if (tipo === 'hoy') inicio = hoy;
    else if (tipo === 'semana') inicio.setDate(hoy.getDate() - 7);
    else if (tipo === 'mes') inicio.setMonth(hoy.getMonth() - 1);
    setFiltros((prev) => ({ ...prev, fecha_inicio: fmt(inicio), fecha_fin: fmt(hoy) }));
  };

  const toggleExpandir = async (sesionId) => {
    if (expandidas[sesionId]) {
      setExpandidas((prev) => ({ ...prev, [sesionId]: !prev[sesionId] }));
      return;
    }
    setExpandidas((prev) => ({ ...prev, [sesionId]: true }));
    try {
      const res = await api.get(`/bitacora/${sesionId}/acciones`);
      if (res.data.success) {
        setAccionesCargadas((prev) => ({ ...prev, [sesionId]: res.data.data || [] }));
      }
    } catch (e) {
      setAccionesCargadas((prev) => ({ ...prev, [sesionId]: [] }));
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bitácora del Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Registro de actividad por sesión de usuario</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm font-semibold text-red-700">{error}</div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.sesiones_hoy ?? 0}</p>
              <p className="text-xs text-slate-500 font-semibold">Sesiones hoy</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-green-600 flex items-center gap-2">
                {stats.sesiones_activas ?? 0}
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              </p>
              <p className="text-xs text-slate-500 font-semibold">Sesiones activas ahora</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.usuarios_distintos_hoy ?? 0}</p>
              <p className="text-xs text-slate-500 font-semibold">Usuarios distintos hoy</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Inicio</label>
            <input type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros((p) => ({ ...p, fecha_inicio: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Fin</label>
            <input type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros((p) => ({ ...p, fecha_fin: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white" />
          </div>
          <div className="flex items-end gap-1">
            {[
              { label: 'Hoy', key: 'hoy' },
              { label: 'Semana', key: 'semana' },
              { label: 'Mes', key: 'mes' },
            ].map((s) => (
              <button key={s.key} onClick={() => shortcutFecha(s.key)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors">
                {s.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Usuario</label>
            <select value={filtros.usuario_id} onChange={(e) => setFiltros((p) => ({ ...p, usuario_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Rol</label>
            <select value={filtros.rol_id} onChange={(e) => setFiltros((p) => ({ ...p, rol_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Todos</option>
              <option value="1">Administrador</option>
              <option value="3">Coordinador</option>
              <option value="4">Autoridad</option>
              <option value="2">Docente</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={aplicarFiltros}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-colors">
              Filtrar
            </button>
            <button onClick={limpiarFiltros}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-40" />
                    <div className="h-3 bg-slate-200 rounded w-24" />
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : sesiones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 font-semibold">No hay sesiones registradas</p>
          </div>
        ) : (
          sesiones.map((s) => {
            const cr = colorRol(s.usuario?.rol);
            const expandida = expandidas[s.id];
            const acciones = accionesCargadas[s.id];
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                <button onClick={() => toggleExpandir(s.id)}
                  className="w-full text-left p-5 cursor-pointer focus:outline-none">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${cr.bg} ${cr.text} flex items-center justify-center text-sm font-extrabold shrink-0 ring-2 ${cr.ring}`}>
                      {iniciales(s.usuario?.nombre, s.usuario?.apellido)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800">{s.usuario?.nombre_completo || 'Sistema'}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cr.badge}`}>{s.usuario?.rol || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        <span>{s.inicio ? new Date(s.inicio + 'Z').toLocaleString('es-BO') : '—'}</span>
                        <span className="hidden sm:inline">IP: {s.ip || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {s.cierre ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{formatearDuracion(s.duracion)}</p>
                          <p className="text-[10px] text-slate-400">Hasta {s.cierre ? new Date(s.cierre + 'Z').toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                          <span className="text-xs font-bold text-yellow-600">Sesión no cerrada</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{s.acciones_count ?? 0} acciones</p>
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandida ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${expandida ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="border-t border-slate-100 mx-5" />
                  <div className="px-5 pb-5">
                    {!acciones ? (
                      <SkeletonAcciones />
                    ) : acciones.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No hay acciones registradas en esta sesión.</p>
                    ) : (
                      <div className="relative pl-6 mt-4">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
                        <div className="space-y-4">
                          {acciones.map((a) => {
                            const ca = colorAccion(a.accion);
                            return (
                              <div key={a.id} className="relative flex gap-3">
                                <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full ${ca.dot} ring-2 ring-white shrink-0 z-10`} />
                                <div className={`flex-1 rounded-xl border ${ca.border} ${ca.bg} p-3`}>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-800">{a.accion}</span>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                      {a.fecha ? new Date(a.fecha + 'Z').toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600">{a.detalle || '—'}</p>
                                  {a.tabla_afectada && (
                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-600">{a.tabla_afectada}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {meta.ultima_pagina > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Anterior
          </button>
          <span className="text-sm text-slate-500 font-medium">
            Página {meta.pagina_actual} de {meta.ultima_pagina} — {meta.total} sesiones en total
          </span>
          <button onClick={() => setPagina(Math.min(meta.ultima_pagina, pagina + 1))} disabled={pagina >= meta.ultima_pagina}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
            Siguiente
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}