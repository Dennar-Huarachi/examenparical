import React, { useState } from 'react';
import api from '../services/api';

const REQUISITOS = [
    { key: 'min8', label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
    { key: 'mayuscula', label: 'Al menos una letra mayúscula (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'minuscula', label: 'Al menos una letra minúscula (a-z)', test: (p) => /[a-z]/.test(p) },
    { key: 'numero', label: 'Al menos un número (0-9)', test: (p) => /[0-9]/.test(p) },
    { key: 'especial', label: 'Al menos un carácter especial (!@#$%^&*...)', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?\/`~]/.test(p) },
];

function calcularFortaleza(pass) {
    if (!pass) return { nivel: '', clase: 'bg-gray-200', ancho: '0%', texto: '' };
    const cumplidos = REQUISITOS.filter(r => r.test(pass)).length;
    if (cumplidos <= 1) return { nivel: 'Muy débil', clase: 'bg-red-500', ancho: '25%', texto: 'Muy débil' };
    if (cumplidos <= 3) return { nivel: 'Débil', clase: 'bg-orange-500', ancho: '50%', texto: 'Débil' };
    if (cumplidos === 4) return { nivel: 'Aceptable', clase: 'bg-yellow-500', ancho: '75%', texto: 'Aceptable' };
    return { nivel: 'Segura', clase: 'bg-green-500', ancho: '100%', texto: 'Segura ✓' };
}

export default function CambiarPasswordPage() {
    const [passwordActual, setPasswordActual] = useState('');
    const [passwordNueva, setPasswordNueva] = useState('');
    const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
    const [showActual, setShowActual] = useState(false);
    const [showNueva, setShowNueva] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    const fortaleza = calcularFortaleza(passwordNueva);
    const requisitosCumplidos = REQUISITOS.filter(r => r.test(passwordNueva)).length;
    const todosRequisitos = requisitosCumplidos === REQUISITOS.length;
    const noCoinciden = passwordConfirmacion.length > 0 && passwordNueva !== passwordConfirmacion;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setExito('');

        if (!todosRequisitos) return;
        if (noCoinciden) return;

        setLoading(true);
        try {
            const res = await api.post('/cambiar-password', {
                password_actual: passwordActual,
                password_nueva: passwordNueva,
                password_nueva_confirmation: passwordConfirmacion,
            });
            if (res.data.success) {
                setExito('✓ Contraseña actualizada correctamente');
                setPasswordActual('');
                setPasswordNueva('');
                setPasswordConfirmacion('');
                setTimeout(() => setExito(''), 5000);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al cambiar la contraseña.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-8 px-4">
            <div className="w-full max-w-[480px]">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-800">🔑 Cambiar contraseña</h1>
                        <p className="text-sm text-slate-500 mt-1">Actualiza tu contraseña de acceso al sistema</p>
                    </div>

                    {exito && (
                        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-bold text-green-800">{exito}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-sm font-bold text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Contraseña actual
                            </label>
                            <div className="relative">
                                <input
                                    type={showActual ? 'text' : 'password'}
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    required
                                    placeholder="Ingresa tu contraseña actual"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 pr-11 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowActual(!showActual)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                                    tabIndex={-1}
                                >
                                    {showActual ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Contraseña nueva
                            </label>
                            <div className="relative">
                                <input
                                    type={showNueva ? 'text' : 'password'}
                                    value={passwordNueva}
                                    onChange={(e) => setPasswordNueva(e.target.value)}
                                    required
                                    placeholder="Ingresa tu nueva contraseña"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 pr-11 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNueva(!showNueva)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                                    tabIndex={-1}
                                >
                                    {showNueva ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {passwordNueva.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <div className="space-y-1.5">
                                        {REQUISITOS.map((r) => {
                                            const ok = r.test(passwordNueva);
                                            return (
                                                <div key={r.key} className="flex items-center gap-2 text-xs">
                                                    <span className={`flex-shrink-0 font-bold ${ok ? 'text-green-600' : 'text-red-500'}`}>
                                                        {ok ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`${ok ? 'text-green-700' : 'text-slate-500'}`}>
                                                        {r.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-1">
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${fortaleza.clase}`}
                                                style={{ width: fortaleza.ancho }}
                                            />
                                        </div>
                                        <p className={`text-xs font-bold mt-1 ${
                                            fortaleza.nivel === 'Segura' ? 'text-green-600' :
                                            fortaleza.nivel === 'Aceptable' ? 'text-yellow-600' :
                                            fortaleza.nivel === 'Débil' ? 'text-orange-600' :
                                            fortaleza.nivel === 'Muy débil' ? 'text-red-600' : ''
                                        }`}>
                                            {fortaleza.texto}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Confirmar contraseña nueva
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={passwordConfirmacion}
                                    onChange={(e) => setPasswordConfirmacion(e.target.value)}
                                    required
                                    placeholder="Repite tu nueva contraseña"
                                    className={`w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-sm font-semibold placeholder-slate-400 pr-11 transition-all ${
                                        passwordConfirmacion.length === 0
                                            ? 'border-slate-200 focus:ring-blue-500 focus:border-blue-400 text-slate-800'
                                            : noCoinciden
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-400 text-red-800 bg-red-50'
                                                : 'border-green-300 focus:ring-green-500 focus:border-green-400 text-green-800 bg-green-50'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                                    tabIndex={-1}
                                >
                                    {showConfirm ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {passwordConfirmacion.length > 0 && (
                                <p className={`text-xs font-bold mt-1.5 flex items-center gap-1 ${
                                    noCoinciden ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {noCoinciden ? (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Las contraseñas no coinciden
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Las contraseñas coinciden ✓
                                        </>
                                    )}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!todosRequisitos || noCoinciden || loading || !passwordActual}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Actualizando...
                                </>
                            ) : 'Actualizar contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
