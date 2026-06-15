import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORA_BASE = 7;
const TOTAL_HORAS = 17;
const TOTAL_MINUTOS = TOTAL_HORAS * 60;

const COLORES_MATERIA = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', bar: 'bg-blue-500' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', bar: 'bg-emerald-500' },
    { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', bar: 'bg-violet-500' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', bar: 'bg-rose-500' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', bar: 'bg-cyan-500' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', bar: 'bg-amber-500' },
];

const TURNO_RANGOS = {
    Mañana: { inicio: '07:00', fin: '12:15' },
    Tarde: { inicio: '14:00', fin: '18:30' },
    Noche: { inicio: '19:00', fin: '23:30' },
};

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function getTop(time) {
    return ((timeToMinutes(time) - HORA_BASE * 60) / TOTAL_MINUTOS) * 100;
}

function getHeight(inicio, fin) {
    return ((timeToMinutes(fin) - timeToMinutes(inicio)) / TOTAL_MINUTOS) * 100;
}

function getColor(materiaId, index) {
    return COLORES_MATERIA[(materiaId + (index || 0)) % COLORES_MATERIA.length];
}

function formatHora(t) {
    return t ? t.slice(0, 5) : '—';
}

function horasDelDia() {
    const horas = [];
    for (let h = HORA_BASE; h < HORA_BASE + TOTAL_HORAS; h++) {
        horas.push(`${String(h).padStart(2, '0')}:00`);
    }
    return horas;
}

export default function MiCargaPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarMiCarga();
    }, []);

    const cargarMiCarga = async () => {
        setLoading(true);
        try {
            const res = await api.get('/docentes/mi-carga');
            if (res.data.success) setData(res.data.data);
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al cargar información';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-400 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { postulante, docente, horarios, total_horas_semanales, carga_horaria_maxima, horas_disponibles } = data;
    const pct = carga_horaria_maxima > 0 ? Math.min(100, Math.round((total_horas_semanales / carga_horaria_maxima) * 100)) : 0;

    const horariosPorDia = {};
    DIAS.forEach(d => { horariosPorDia[d] = []; });
    (horarios || []).forEach(h => {
        if (horariosPorDia[h.dia_semana]) horariosPorDia[h.dia_semana].push(h);
    });

    return (
        <div className="max-w-7xl mx-auto mt-6 px-4 pb-10">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CU21: Mi Carga Horaria</h1>
                <p className="text-slate-500 mt-1 text-sm">Vista personal de tus horarios y carga horaria asignada.</p>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 sm:p-6 text-white shadow-lg mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-black break-words">{postulante?.nombres} {postulante?.apellidos}</h2>
                        <p className="text-blue-200 text-xs sm:text-sm font-semibold">{postulante?.especialidad || 'Sin especialidad'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-slate-900">{carga_horaria_maxima || 0}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Carga máxima</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{total_horas_semanales ?? 0}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Horas asignadas</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className={`text-2xl font-black ${horas_disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>{horas_disponibles}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Horas disponibles</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col justify-center">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>Progreso</span>
                        <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                        <div className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                </div>
            </div>

            {(!horarios || horarios.length === 0) ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-bold text-base">No tienes horarios asignados</p>
                    <p className="text-slate-400 text-sm">Los horarios aparecerán aquí cuando sean asignados por el coordinador.</p>
                </div>
            ) : (
                <>
                    <h3 className="font-bold text-slate-800 text-lg mb-3">Grilla Semanal</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                        <div className="overflow-x-auto">
                            <div className="min-w-[900px]">
                                <div className="grid" style={{ gridTemplateColumns: '70px repeat(6, 1fr)' }}>
                                    <div className="bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sticky left-0">
                                        Hora
                                    </div>
                                    {DIAS.map(dia => (
                                        <div key={dia} className="bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                            {dia}
                                        </div>
                                    ))}

                                    <div className="bg-white border-r border-slate-100 relative" style={{ height: '900px' }}>
                                        {horasDelDia().map((h, i) => (
                                            <div key={h} className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'} flex items-start px-1.5`}
                                                style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}
                                            >
                                                <span className="text-[10px] font-bold text-slate-400 -mt-2 sticky left-0">{h}</span>
                                            </div>
                                        ))}
                                        {Object.entries(TURNO_RANGOS).map(([, r]) => {
                                            const top = getTop(r.inicio);
                                            const height = getHeight(r.inicio, r.fin);
                                            return (
                                                <div key={r.inicio}
                                                    className="absolute left-0 right-0 border-t border-dashed border-slate-200 pointer-events-none"
                                                    style={{ top: `${top}%`, height: `${height}%` }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {DIAS.map(dia => (
                                        <div key={dia} className="bg-white border-r border-slate-100 relative" style={{ height: '900px' }}>
                                            {horasDelDia().map((h, i) => (
                                                <div key={h} className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-transparent' : 'border-slate-100'}`}
                                                    style={{ top: `${(i / TOTAL_HORAS) * 100}%`, height: `${(1 / TOTAL_HORAS) * 100}%` }}
                                                />
                                            ))}
                                            {horariosPorDia[dia].map((h, idx) => {
                                                const color = getColor(h.materia_id, idx);
                                                return (
                                                    <div key={h.id}
                                                        className={`absolute left-1 right-1 ${color.bg} ${color.border} border rounded-lg overflow-hidden z-10`}
                                                        style={{ top: `${getTop(h.hora_inicio)}%`, height: `${getHeight(h.hora_inicio, h.hora_fin)}%`, minHeight: '40px' }}
                                                    >
                                                        <div className={`h-1 ${color.bar} rounded-t-lg`} />
                                                        <div className="px-2 py-1 text-[10px] leading-tight">
                                                            <p className={`font-extrabold ${color.text} truncate`}>{h.materia?.nombre || '—'}</p>
                                                            <p className="font-semibold text-slate-600 truncate">{h.grupo?.nombre || '—'}</p>
                                                            <p className="text-slate-500 truncate">{h.aula ? `${h.aula.edificio} - ${h.aula.numero}` : '—'}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}</p>
                                                            {h.turno && (
                                                                <span className="inline-block mt-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-white/60 text-slate-600">
                                                                    {h.turno.nombre}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-800 text-lg mb-3">Detalle de Horarios</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Día</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Hora</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Turno</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Materia</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Grupo</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Aula</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Duración</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {horarios.map(h => (
                                        <tr key={h.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{h.dia_semana}</td>
                                            <td className="px-4 py-3 text-slate-700 font-mono">{formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}</td>
                                            <td className="px-4 py-3">
                                                {h.turno ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                                        {h.turno.nombre}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{h.materia?.nombre || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{h.grupo?.nombre || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{h.aula ? `${h.aula.edificio} - ${h.aula.numero}` : '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{((timeToMinutes(h.hora_fin) - timeToMinutes(h.hora_inicio)) / 60).toFixed(1)} hrs</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
