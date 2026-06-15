import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/authprovider';
import api from '../services/api';

export default function CambiarPasswordPage() {
    const { user } = useContext(AuthContext);

    const [passwordActual, setPasswordActual] = useState('');
    const [passwordNuevo, setPasswordNuevo] = useState('');
    const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
    const [showActual, setShowActual] = useState(false);
    const [showNuevo, setShowNuevo] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);
    const [erroresCampo, setErroresCampo] = useState({});

    const noCoinciden = passwordConfirmacion && passwordNuevo !== passwordConfirmacion;

    const calcularFortaleza = (pass) => {
        if (!pass) return { nivel: '', clase: '', ancho: '0%' };
        if (pass.length < 8) return { nivel: 'Débil', clase: 'bg-red-500', ancho: '33%' };
        const tieneMayuscula = /[A-Z]/.test(pass);
        const tieneMinuscula = /[a-z]/.test(pass);
        const tieneNumero = /[0-9]/.test(pass);
        if (tieneMayuscula && tieneMinuscula && tieneNumero) return { nivel: 'Fuerte', clase: 'bg-green-500', ancho: '100%' };
        return { nivel: 'Media', clase: 'bg-yellow-500', ancho: '66%' };
    };

    const fortaleza = calcularFortaleza(passwordNuevo);

    const obtenerIniciales = (nombre, apellido) => {
        return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErroresCampo({});

        if (passwordNuevo !== passwordConfirmacion) {
            setErroresCampo({ password_confirmacion: 'Las contraseñas no coinciden' });
            return;
        }

        setLoading(true);

        try {
            await api.post('/cambiar-password', {
                password_actual: passwordActual,
                password_nuevo: passwordNuevo,
                password_confirmacion: passwordConfirmacion,
            });
            setExito(true);
            setPasswordActual('');
            setPasswordNuevo('');
            setPasswordConfirmacion('');
            setTimeout(() => setExito(false), 5000);
        } catch (err) {
            const mensaje = err.response?.data?.message || 'Error al cambiar la contraseña.';
            if (err.response?.status === 422) {
                setError(mensaje);
            } else {
                setError(mensaje);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-lg mx-auto px-4">
                <Link to="/dashboard" className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-block mb-4">
                    ← Volver al dashboard
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Cambiar contraseña</h2>
                        <p className="text-xs text-slate-500 mt-1">Por seguridad ingresa tu contraseña actual.</p>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                                {obtenerIniciales(user.nombre, user.apellido)}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {user.nombre} {user.apellido}
                                </p>
                                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                                    {user.rol}
                                </span>
                            </div>
                        </div>
                    )}

                    {exito && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                            <p className="text-green-700 text-xs font-semibold">
                                ✓ Contraseña cambiada correctamente
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-red-600 text-xs font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña actual</label>
                            <div className="relative">
                                <input
                                    type={showActual ? 'text' : 'password'}
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    required
                                    className="w-full p-2.5 border rounded-xl text-sm pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowActual(!showActual)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    {showActual ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva contraseña</label>
                            <div className="relative">
                                <input
                                    type={showNuevo ? 'text' : 'password'}
                                    value={passwordNuevo}
                                    onChange={(e) => setPasswordNuevo(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full p-2.5 border rounded-xl text-sm pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNuevo(!showNuevo)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    {showNuevo ? '🙈' : '👁'}
                                </button>
                            </div>
                            {passwordNuevo && (
                                <div className="mt-2">
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ${fortaleza.clase}`} style={{ width: fortaleza.ancho }}></div>
                                    </div>
                                    <p className={`text-xs mt-1 font-medium ${
                                        fortaleza.nivel === 'Fuerte' ? 'text-green-600' :
                                        fortaleza.nivel === 'Media' ? 'text-yellow-600' :
                                        fortaleza.nivel === 'Débil' ? 'text-red-600' : ''
                                    }`}>
                                        {fortaleza.nivel === 'Fuerte' ? '✓ Contraseña fuerte' :
                                         fortaleza.nivel === 'Media' ? '⚡ Contraseña media' :
                                         fortaleza.nivel === 'Débil' ? '✗ Contraseña débil' : ''}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar nueva contraseña</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={passwordConfirmacion}
                                    onChange={(e) => setPasswordConfirmacion(e.target.value)}
                                    required
                                    className="w-full p-2.5 border rounded-xl text-sm pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    {showConfirm ? '🙈' : '👁'}
                                </button>
                            </div>
                            {noCoinciden && (
                                <p className="text-red-500 text-xs mt-1 font-medium">Las contraseñas no coinciden</p>
                            )}
                            {erroresCampo.password_confirmacion && (
                                <p className="text-red-500 text-xs mt-1 font-medium">{erroresCampo.password_confirmacion}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || noCoinciden || !passwordActual || !passwordNuevo || !passwordConfirmacion}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl text-xs uppercase cursor-pointer transition-all disabled:opacity-50"
                        >
                            {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
