import React, { useState } from 'react';
import { API_URL } from '../constants';

export default function PagoRegistro() {
    const [formData, setFormData] = useState({
        ci: '',
        monto: '350', // Por defecto arancel CUP
        cardName: '',
        cardNumber: '',
        cardExpiry: '',
        cardCvc: ''
    });
    
    const [mensaje, setMensaje] = useState({ texto: '', esExitoso: false });
    const [cargando, setCargando] = useState(false);

    // Formatear el número de tarjeta (xxxx xxxx xxxx xxxx)
    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 16) value = value.slice(0, 16);
        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        setFormData({ ...formData, cardNumber: formatted });
    };

    // Formatear la fecha de expiración (MM/AA)
    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        setFormData({ ...formData, cardExpiry: value });
    };

    // Formatear CVC (3 dígitos)
    const handleCvcChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 3) value = value.slice(0, 3);
        setFormData({ ...formData, cardCvc: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        setMensaje({ texto: '', esExitoso: false });

        try {
            // Ir a buscar al postulante por su CI para confirmar que existe (CU14)
            const searchResponse = await fetch(`${API_URL}/postulantes/${formData.ci}`);
            const searchRes = await searchResponse.json();

            if (!searchRes.success) {
                setMensaje({ 
                    texto: 'El postulante con el CI proporcionado no está registrado en el sistema.', 
                    esExitoso: false 
                });
                setCargando(false);
                return;
            }

            // Realizar pago seguro con Stripe
            const response = await fetch(`${API_URL}/pagos/stripe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ci: formData.ci,
                    monto: parseFloat(formData.monto),
                    card_name: formData.cardName
                })
            });

            const res = await response.json();

            if (res.success) {
                setMensaje({ 
                    texto: `¡Pago de ${formData.monto} Bs. procesado con Stripe correctamente! Transacción: ${res.data.numero_comprobante}`, 
                    esExitoso: true 
                });
                setFormData({ ci: '', monto: '350', cardName: '', cardNumber: '', cardExpiry: '', cardCvc: '' });
            } else {
                setMensaje({ texto: res.message || 'Error al procesar el pago con Stripe', esExitoso: false });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor', esExitoso: false });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Cabecera Stripe */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Stripe Checkout</h2>
                        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Pasarela de Pago Segura</p>
                    </div>
                    {/* Logotipo de Stripe */}
                    <div className="flex items-center gap-1 text-slate-100 font-extrabold text-lg select-none">
                        <span className="text-blue-500">stripe</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Alertas */}
                    {mensaje.texto && (
                        <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 border transition-all ${
                            mensaje.esExitoso 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                {mensaje.esExitoso ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                )}
                            </svg>
                            <span>{mensaje.texto}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CI del Postulante</label>
                                <input 
                                    required
                                    disabled={cargando}
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-semibold"
                                    placeholder="Ej. 1234567"
                                    value={formData.ci}
                                    onChange={(e) => setFormData({...formData, ci: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto (Bs.)</label>
                                <input 
                                    required
                                    disabled={cargando}
                                    type="number"
                                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-semibold"
                                    placeholder="Monto"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100"></div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-semibold text-slate-600">Nombre en la Tarjeta</label>
                            <input 
                                required
                                disabled={cargando}
                                type="text"
                                className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium"
                                placeholder="Ej. Juan Perez Rodriguez"
                                value={formData.cardName}
                                onChange={(e) => setFormData({...formData, cardName: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-semibold text-slate-600">Número de Tarjeta</label>
                            <div className="relative">
                                <input 
                                    required
                                    disabled={cargando}
                                    type="text"
                                    className="w-full p-2.5 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium tracking-widest"
                                    placeholder="4242 4242 4242 4242"
                                    value={formData.cardNumber}
                                    onChange={handleCardNumberChange}
                                />
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                    </svg>
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-semibold text-slate-600">Expiración</label>
                                <input 
                                    required
                                    disabled={cargando}
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium text-center"
                                    placeholder="MM/AA"
                                    value={formData.cardExpiry}
                                    onChange={handleExpiryChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-semibold text-slate-600">CVC</label>
                                <input 
                                    required
                                    disabled={cargando}
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium text-center"
                                    placeholder="123"
                                    value={formData.cardCvc}
                                    onChange={handleCvcChange}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={cargando}
                            className="w-full bg-slate-900 hover:bg-slate-950 disabled:bg-gray-400 active:scale-98 text-white font-extrabold p-3.5 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 mt-4"
                        >
                            {cargando ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Procesando pago seguro...</span>
                                </>
                            ) : (
                                <span>Pagar ahora con Stripe</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}