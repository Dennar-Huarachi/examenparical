import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { AuthContext } from '../context/authprovider';

export default function Login() {
    const { login } = useContext(AuthContext); 
    const navigate = useNavigate(); 
    
    const [credenciales, setCredenciales] = useState({ email: '', password: '' });
    const [error, setError] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleChange = (e) => {
        setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(credenciales.email.trim(), credenciales.password);
            navigate('/dashboard'); 
        } catch (err) {
            console.error("Error capturado en el formulario:", err);
            if (err.response && err.response.data) {
                setError(err.response.data.message || 'Credenciales incorrectas');
            } else {
                setError('Contraseña incorrecta o usuario no encontrado.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] overflow-hidden">
            {/* Círculos decorativos difuminados */}
            <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-cyan-500/5 blur-2xl" />

            {/* Animación de entrada */}
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-slide {
                    animation: fadeSlideUp 0.6s ease-out forwards;
                }
            `}</style>

            <div className="animate-fade-slide bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 sm:mx-0">
                {/* Encabezado con escudo */}
                <div className="pt-10 pb-4 px-8 flex flex-col items-center">
                    {!imgError ? (
                        <img
                            src="/escudo.png"
                            alt="Escudo FCyT"
                            className="w-[90px] h-[90px] object-contain drop-shadow-md"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-[90px] h-[90px] rounded-full bg-[#1e3a5f] flex items-center justify-center shadow-md">
                            <span className="text-white text-xl font-bold tracking-wide">FCyT</span>
                        </div>
                    )}

                    <h1 className="mt-4 text-lg font-bold text-[#1e3a5f] text-center leading-tight">
                        Facultad de Ciencias y Tecnología
                    </h1>
                    <p className="text-sm text-slate-500 text-center">
                        Universidad Autónoma Gabriel René Moreno
                    </p>

                    <div className="mt-4 text-center">
                        <p className="text-sm font-semibold text-slate-600">
                            Sistema de Admisión Universitaria
                        </p>
                        <p className="text-xs text-slate-400">
                            CUP - Curso de Preparación
                        </p>
                    </div>

                    <div className="w-3/4 h-px bg-slate-200 mt-4" />
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 transition-all duration-300">
                            <span className="text-red-500 text-sm">⚠</span>
                            <p className="text-red-600 text-xs font-semibold">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="tu@correo.com"
                            value={credenciales.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                placeholder="••••••••"
                                value={credenciales.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? (
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

                    {/* Recordarme + Olvidaste contraseña */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] accent-[#1e3a5f]"
                            />
                            <span className="text-xs text-slate-500 font-medium">Recordarme</span>
                        </label>
                        <Link to="/recuperar-password" className="text-xs text-[#1e3a5f] hover:text-[#0f172a] font-semibold transition-colors">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    {/* Botón Iniciar sesión */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        )}
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                {/* Footer */}
                <div className="pb-5 text-center">
                    <p className="text-[10px] text-slate-400">&copy; 2026 - Todos los derechos reservados</p>
                </div>
            </div>
        </div>
    );
}
