import React, { useState } from 'react';
import TurnosPage from './TurnosPage';
import HorariosPage from './HorariosPage';

const TABS = [
    { key: 'turnos', label: 'Turnos', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'horarios', label: 'Horarios', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

export default function TurnosYHorariosPage() {
    const [tab, setTab] = useState('turnos');

    return (
        <div>
            <div className="max-w-7xl mx-auto mt-6 px-4">
                <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
                    {TABS.map(t => {
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                                    active
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                                </svg>
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            {tab === 'turnos' && <TurnosPage />}
            {tab === 'horarios' && <HorariosPage />}
        </div>
    );
}
