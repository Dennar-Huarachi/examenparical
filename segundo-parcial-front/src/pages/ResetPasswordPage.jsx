import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);

    const noCoinciden = passwordConfirm && password !== passwordConfirm;

    if (!token || !email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-700 text-sm font-semibold">Link inválido</p>
                        <p className="text-red-600 text-xs mt-1">El link de recuperación no es válido o está incompleto.</p>
                    </div>
                    <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase transition-all">
                        Ir al login
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        try {
            await api.post('/reset-password', {
                token,
                email,
                password,
                password_confirmation: passwordConfirm,
            });
            setExito(true);
        } catch (err) {
            const mensaje = err.response?.data?.message || 'Error al restablecer la contraseña.';
            setError(mensaje);
        } finally {
            setLoading(false);
        }
    };

    if (exito) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-green-700 text-sm font-semibold">
                            ✓ Contraseña actualizada correctamente.
                        </p>
                    </div>
                    <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase transition-all">
                        Ir al login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-4">
                <h2 className="text-xl font-black text-slate-800 text-center">Nueva contraseña</h2>
                <p className="text-xs text-slate-500 text-center">
                    Ingresa tu nueva contraseña.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-red-600 text-xs font-bold">{error}</p>
                        {error.includes('expirado') || error.includes('inválido') ? (
                            <Link to="/recuperar-password" className="text-xs text-blue-600 font-semibold mt-2 inline-block hover:underline">
                                Solicitar nuevo link
                            </Link>
                        ) : null}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                            placeholder="Repite la contraseña"
                            className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        {noCoinciden && (
                            <p className="text-red-500 text-xs mt-1 font-medium">Las contraseñas no coinciden</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || noCoinciden}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl text-xs uppercase cursor-pointer transition-all disabled:opacity-50"
                    >
                        {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <Link to="/login" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
