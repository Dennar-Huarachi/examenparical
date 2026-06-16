import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/StripePaymentForm';

const stripeKey = import.meta.env.VITE_STRIPE_KEY || 'pk_test_XXXXXXXXXX';
const stripePromise = loadStripe(stripeKey);

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export default function PagoRegistro() {
  const [ci, setCi] = useState('');
  const [monto, setMonto] = useState('350');
  const [cardName, setCardName] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', esExitoso: false });
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState('form'); // form | payment | success
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [isMock, setIsMock] = useState(false);

  const handleInitPayment = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', esExitoso: false });

    try {
      const res = await fetch(`${apiUrl}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ci, monto: parseFloat(monto) }),
      });
      const data = await res.json();

      if (data.success) {
        const secret = data.data.client_secret;
        const mock = !secret || secret.includes('_secret_test');
        setIsMock(mock);
        setClientSecret(secret);
        setPaymentIntentId(data.data.payment_intent_id);
        setPaso('payment');
      } else {
        setMensaje({ texto: data.message || 'Error al iniciar el pago', esExitoso: false });
      }
    } catch (err) {
      setMensaje({ texto: 'Error de conexión con el servidor', esExitoso: false });
    } finally {
      setCargando(false);
    }
  };

  const handleMockConfirm = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/stripe/test-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: 'test_' + Date.now(),
          card_name: cardName,
          monto: parseFloat(monto),
          descripcion: 'Pago manual - CI: ' + ci,
        }),
      });
      const data = await res.json();
      if (data.success) {
        handleSuccess(data);
      } else {
        setMensaje({ texto: data.message || 'Error en pago simulado', esExitoso: false });
      }
    } catch (err) {
      setMensaje({ texto: 'Error de conexión en simulación', esExitoso: false });
    } finally {
      setCargando(false);
    }
  };

  const handleSuccess = (data) => {
    setMensaje({
      texto: `¡Pago de ${monto} Bs. procesado con Stripe correctamente! Transacción: ${data.data.numero_comprobante}`,
      esExitoso: true,
    });
    setPaso('success');
    setCi('');
    setMonto('350');
    setCardName('');
  };

  const handleError = (msg) => {
    setMensaje({ texto: msg, esExitoso: false });
  };

  const handleCancel = () => {
    setPaso('form');
    setClientSecret(null);
    setPaymentIntentId(null);
    setIsMock(false);
  };

  const alertClass = mensaje.esExitoso
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';
  const alertIcon = mensaje.esExitoso
    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Stripe Checkout</h2>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Pasarela de Pago Segura</p>
          </div>
          <div className="flex items-center gap-1 text-slate-100 font-extrabold text-lg select-none">
            <span className="text-blue-500">stripe</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 border transition-all ${alertClass}`}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {alertIcon}
              </svg>
              <span>{mensaje.texto}</span>
            </div>
          )}

          {paso === 'form' && (
            <form onSubmit={handleInitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CI del Postulante</label>
                <input required disabled={cargando} type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-semibold"
                  placeholder="Ej. 1234567" value={ci}
                  onChange={(e) => setCi(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto (Bs.)</label>
                <input required disabled={cargando} type="number"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-semibold"
                  placeholder="350" value={monto}
                  onChange={(e) => setMonto(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre en la Tarjeta</label>
                <input required disabled={cargando} type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium"
                  placeholder="Ej. Juan Perez" value={cardName}
                  onChange={(e) => setCardName(e.target.value)} />
              </div>

              <button type="submit" disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold p-3.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 mt-4">
                {cargando ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Iniciando pago...</>
                ) : 'Continuar al pago'}
              </button>
            </form>
          )}

          {paso === 'payment' && (
            isMock ? (
              <form onSubmit={(e) => { e.preventDefault(); handleMockConfirm(); }} className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Datos de la tarjeta</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Número de tarjeta</label>
                    <input type="text" defaultValue="4242 4242 4242 4242"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
                      <input type="text" defaultValue="12/28"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="MM/AA" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">CVC</label>
                      <input type="text" defaultValue="123"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="123" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Titular de la tarjeta</label>
                    <input type="text" value={cardName} disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-bold mb-1">Modo de prueba (simulado)</p>
                  <p>Tarjeta: <strong>4242 4242 4242 4242</strong></p>
                  <p>Fecha: cualquier fecha futura | CVC: cualquier 3 dígitos</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCancel} disabled={cargando}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm cursor-pointer disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={cargando}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {cargando ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando...</>
                    ) : 'Pagar ahora'}
                  </button>
                </div>
              </form>
            ) : (
              clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId}
                    ci={ci}
                    cardName={cardName}
                    monto={monto}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onCancel={handleCancel}
                  />
                </Elements>
              )
            )
          )}

          {paso === 'success' && (
            <div className="text-center space-y-4 pt-2">
              <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500">El pago se registró correctamente. Puedes cerrar esta página.</p>
              <button onClick={handleCancel}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl text-sm cursor-pointer">
                Realizar otro pago
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
