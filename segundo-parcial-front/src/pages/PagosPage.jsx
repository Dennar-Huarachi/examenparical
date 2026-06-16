import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const badgeEstado = (estado) => {
  const map = {
    pendiente:  'bg-yellow-100 text-yellow-800 border-yellow-300',
    verificado: 'bg-green-100 text-green-800 border-green-300',
    confirmado: 'bg-blue-100 text-blue-800 border-blue-300',
    rechazado:  'bg-red-100 text-red-800 border-red-300',
  };
  return `px-3 py-1 rounded-full text-xs font-bold border ${map[estado] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
};

const statusLabel = (estado) => {
  const map = {
    pendiente:  'Pendiente',
    verificado: 'Pagado',
    confirmado: 'Confirmado (Stripe)',
    rechazado:  'Rechazado',
  };
  return map[estado] || estado;
};

export default function PagosPage() {
  const [pagos, setPagos] = useState([]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [conteos, setConteos] = useState({ pendiente: 0, verificado: 0, confirmado: 0, rechazado: 0 });
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [errorGlobal, setErrorGlobal] = useState('');

  const [toast, setToast] = useState({ visible: false, texto: '', tipo: '' });

  const mostrarToast = useCallback((texto, tipo) => {
    setToast({ visible: true, texto, tipo });
    setTimeout(() => setToast({ visible: false, texto: '', tipo: '' }), 5000);
  }, []);

  const obtenerPagos = useCallback(async () => {
    setLoading(true);
    setErrorGlobal('');
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (busqueda) params.ci_pagador = busqueda;
      const res = await api.get('/pagos', { params });
      if (res.data && res.data.success) {
        const dataPagos = Array.isArray(res.data.data) ? res.data.data : [];
        setPagos(dataPagos);
        setTotalRecaudado(typeof res.data.total_recaudado === 'number' ? res.data.total_recaudado : 0);
        setConteos(res.data.conteos && typeof res.data.conteos === 'object'
          ? {
              pendiente:  Number(res.data.conteos.pendiente) || 0,
              verificado: Number(res.data.conteos.verificado) || 0,
              confirmado: Number(res.data.conteos.confirmado) || 0,
              rechazado:  Number(res.data.conteos.rechazado) || 0,
            }
          : { pendiente: 0, verificado: 0, confirmado: 0, rechazado: 0 }
        );
      }
    } catch (error) {
      mostrarToast(error.response?.data?.message || 'Error al cargar pagos', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, busqueda, mostrarToast]);

  useEffect(() => {
    obtenerPagos();
  }, [obtenerPagos]);

  const handleConfirmar = async (id) => {
    try {
      const res = await api.patch(`/pagos/${id}/confirmar`);
      if (res.data && res.data.success) {
        mostrarToast('Pago verificado correctamente', 'exito');
        obtenerPagos();
      }
    } catch (error) {
      mostrarToast(error.response?.data?.message || 'Error al confirmar pago', 'error');
    }
  };

  const handleRechazar = async (id) => {
    if (!window.confirm('¿Rechazar este pago?')) return;
    try {
      const res = await api.patch(`/pagos/${id}/rechazar`);
      if (res.data && res.data.success) {
        mostrarToast('Pago rechazado', 'exito');
        obtenerPagos();
      }
    } catch (error) {
      mostrarToast(error.response?.data?.message || 'Error al rechazar pago', 'error');
    }
  };

  if (errorGlobal) {
    return (
      <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-bold text-lg">Error al cargar el panel</p>
          <p className="text-red-500 text-sm mt-1">{errorGlobal}</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard de Pagos</h1>
        <p className="text-slate-500 mt-1 text-sm">Panel unificado con pagos de caja y Stripe.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total recaudado</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{Number(totalRecaudado || 0).toFixed(2)} Bs</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-extrabold text-yellow-600 mt-1">{Number(conteos.pendiente) || 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pagados / Verificados</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{(Number(conteos.verificado) || 0) + (Number(conteos.confirmado) || 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rechazados</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{Number(conteos.rechazado) || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar por CI del pagador..."
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="verificado">Pagado</option>
            <option value="confirmado">Confirmado (Stripe)</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : !Array.isArray(pagos) || pagos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium">No hay pagos registrados en la gestión activa.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Comprobante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">CI Pagador</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Monto</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagos.map((pago) => {
                  if (!pago || typeof pago !== 'object') return null;
                  const postulante = pago.postulante;
                  const nombrePostulante = postulante && typeof postulante === 'object'
                    ? [postulante.nombres, postulante.apellidos].filter(Boolean).join(' ')
                    : null;
                  return (
                    <tr key={pago.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 text-xs sm:text-sm max-w-[120px] truncate" title={pago.numero_comprobante || ''}>
                        {pago.numero_comprobante || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs sm:text-sm">{pago.ci_pagador || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs sm:text-sm font-medium">
                        {nombrePostulante || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">
                        {pago.monto != null ? `${pago.monto} Bs` : '—'}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-slate-500 text-xs sm:text-sm">{pago.fecha_pago || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={badgeEstado(pago.estado)}>{statusLabel(pago.estado)}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {pago.estado === 'pendiente' && (
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleConfirmar(pago.id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                              title="Confirmar / Verificar pago"
                            >✓ Verificar</button>
                            <button
                              onClick={() => handleRechazar(pago.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                              title="Rechazar pago"
                            >✗</button>
                          </div>
                        )}
                        {pago.estado === 'confirmado' && (
                          <button
                            onClick={() => handleConfirmar(pago.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                            title="Marcar como verificado"
                          >Marcar verificado</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
