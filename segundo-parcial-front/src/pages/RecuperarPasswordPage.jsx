import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function RecuperarPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/recuperar-password', { email: email.trim() });
            setExito(true);
        } catch (err) {
            const mensaje = err.response?.data?.message || 'Error al enviar la solicitud. Intenta nuevamente.';
            setError(mensaje);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-4">
                {!exito ? (
                    <>
                        <h2 className="text-xl font-black text-slate-800 text-center">Recuperar contraseña</h2>
                        <p className="text-xs text-slate-500 text-center">
                            Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
                        </p>

                        {error && (
                            <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="tu@correo.com"
                                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl text-xs uppercase cursor-pointer transition-all disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="text-green-700 text-sm font-semibold">
                                ✓ Si el correo existe en el sistema, recibirás un email con instrucciones.
                            </p>
                            <p className="text-green-600 text-xs mt-2">
                                Revisa tu bandeja de entrada y carpeta de spam.
                            </p>
                        </div>
                    </div>
                )}

                <div className="text-center pt-2">
                    <Link to="/login" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
