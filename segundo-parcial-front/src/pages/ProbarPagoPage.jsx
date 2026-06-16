import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_KEY || 'pk_test_XXXXXXXXXX';
const stripePromise = loadStripe(stripeKey);

function MockCardForm({ monto, descripcion, cardName, postulante, onSuccess, onError, onCancel }) {
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await api.post('/stripe/test-confirm', {
        payment_intent_id: 'test_' + Date.now(),
        card_name: cardName,
        monto: parseFloat(monto),
        descripcion,
      });
      if (res.data.success) {
        if (postulante) {
          try {
            await api.post('/postulante-registro/pago-stripe', {
              payment_intent_id: res.data.data.numero_comprobante,
              monto: parseFloat(monto),
            });
          } catch (linkErr) {
            console.warn('No se pudo vincular el pago al postulante', linkErr);
          }
        }
        onSuccess(res.data, !!postulante);
      } else {
        onError(res.data.message || 'Error al registrar el pago');
      }
    } catch (err) {
      onError(err.response?.data?.message || 'Error de conexión');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Datos de la tarjeta</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Número de tarjeta</label>
          <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
            <input type="text" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="MM/AA" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CVC</label>
            <input type="text" value={cvc} onChange={(e) => setCvc(e.target.value)}
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
        <button type="button" onClick={onCancel} disabled={processing}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm cursor-pointer disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={processing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {processing ? (
            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando...</>
          ) : 'Pagar ahora'}
        </button>
      </div>
    </form>
  );
}

function RealPaymentForm({ monto, descripcion, cardName, postulante, onSuccess, onError, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: { name: cardName },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Error al procesar el pago');
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        const res = await api.post('/stripe/test-confirm', {
          payment_intent_id: paymentIntent.id,
          card_name: cardName,
          monto,
          descripcion,
        });
        if (res.data.success) {
          if (postulante) {
            try {
              await api.post('/postulante-registro/pago-stripe', {
                payment_intent_id: paymentIntent.id,
                monto,
              });
            } catch (linkErr) {
              console.warn('No se pudo vincular el pago al postulante', linkErr);
            }
          }
          onSuccess(res.data, !!postulante);
        } else {
          onError(res.data.message || 'Error al registrar el pago de prueba');
        }
      } catch (err) {
        onError(err.response?.data?.message || 'Error de conexión al confirmar el pago');
      }
    } else {
      onError('El pago no fue completado. Estado: ' + (paymentIntent?.status || 'desconocido'));
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1 mb-2">
        <p className="font-bold text-slate-800 text-sm mb-2">Resumen del pago</p>
        <p>Concepto: <strong className="text-slate-800">{descripcion}</strong></p>
        <p>Monto: <strong className="text-slate-800">{monto} Bs</strong></p>
        <p>Titular: <strong className="text-slate-800">{cardName}</strong></p>
      </div>
      <PaymentElement />
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-bold mb-1">Modo de prueba</p>
        <p>Tarjeta: <strong>4242 4242 4242 4242</strong></p>
        <p>Fecha: cualquier fecha futura | CVC: cualquier 3 dígitos</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={processing}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm cursor-pointer disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={!stripe || processing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {processing ? (
            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando...</>
          ) : 'Pagar ahora'}
        </button>
      </div>
    </form>
  );
}

export default function ProbarPagoPage() {
  const [monto, setMonto] = useState('700');
  const [descripcion, setDescripcion] = useState('Inscripción CUP - Pago de prueba');
  const [cardName, setCardName] = useState('');
  const [postulante, setPostulante] = useState(null);
  const [loadingPostulante, setLoadingPostulante] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', esExitoso: false });
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState('form');
  const [clientSecret, setClientSecret] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [vinculado, setVinculado] = useState(false);

  useEffect(() => {
    api.get('/postulante-registro/mi-registro').then((res) => {
      if (res.data.success && res.data.data.postulante) {
        setPostulante(res.data.data.postulante);
        setCardName(res.data.data.postulante.nombres + ' ' + res.data.data.postulante.apellidos);
        setDescripcion('Inscripción CUP - ' + res.data.data.postulante.ci);
      }
    }).catch(() => {}).finally(() => setLoadingPostulante(false));
  }, []);

  const handleInitPayment = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', esExitoso: false });

    try {
      const res = await api.post('/stripe/test-payment-intent', {
        monto: parseFloat(monto),
        descripcion,
      });

      if (res.data.success) {
        setClientSecret(res.data.data.client_secret);
        const mockMode = !res.data.data.client_secret || res.data.data.client_secret.includes('_secret_test');
        setIsMock(mockMode);
        setPaso('payment');
      } else {
        setMensaje({ texto: res.data.message || 'Error al iniciar el pago de prueba', esExitoso: false });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error de conexión con el servidor';
      console.error('Error completo:', err.response?.data || err);
      setMensaje({ texto: msg, esExitoso: false });
    } finally {
      setCargando(false);
    }
  };

  const handleSuccess = (data, vinculadoExitoso) => {
    setVinculado(!!vinculadoExitoso);
    setMensaje({
      texto: `¡Pago de prueba exitoso! Transacción: ${data.data?.numero_comprobante || data.data?.id || '—'}`,
      esExitoso: true,
    });
    setPaso('success');
  };

  const handleError = (msg) => {
    setMensaje({ texto: msg, esExitoso: false });
  };

  const handleCancel = () => {
    setPaso('form');
    setClientSecret(null);
    setIsMock(false);
  };

  const alertClass = mensaje.esExitoso
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';
  const alertIcon = mensaje.esExitoso
    ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';

  return (
    <div className="max-w-lg mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Probar Pago</h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                Pasarela de Pago Segura — Modo Prueba
              </p>
            </div>
            <div className="flex items-center gap-1 text-slate-100 font-extrabold text-lg select-none">
              <span className="text-blue-400">stripe</span>
              <span className="bg-yellow-500 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">TEST</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 border transition-all ${alertClass}`}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={alertIcon} />
              </svg>
              <span>{mensaje.texto}</span>
            </div>
          )}

          {paso === 'form' && (
            <form onSubmit={handleInitPayment} className="space-y-4">
              {postulante && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 space-y-0.5">
                  <p className="font-semibold">Postulante detectado</p>
                  <p>{postulante.nombres} {postulante.apellidos} — CI: {postulante.ci}</p>
                  <p>Estado actual: <span className="font-medium">{postulante.estado}</span></p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Monto <span className="text-blue-600 font-black">*</span>
                </label>
                <div className="relative">
                  <input required disabled={cargando} type="number" step="0.01" min="1"
                    className="w-full p-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-semibold"
                    placeholder="350.00" value={monto}
                    onChange={(e) => setMonto(e.target.value)} />
                  <span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">Bs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Concepto / Descripción <span className="text-blue-600 font-black">*</span>
                </label>
                <input required disabled={cargando} type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all text-sm font-medium"
                  placeholder="Ej. Matrícula CUP - Prueba" value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nombre del titular <span className="text-blue-600 font-black">*</span>
                </label>
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
              <MockCardForm
                monto={monto}
                descripcion={descripcion}
                cardName={cardName}
                postulante={postulante}
                onSuccess={handleSuccess}
                onError={handleError}
                onCancel={handleCancel}
              />
            ) : (
              clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <RealPaymentForm
                    monto={monto}
                    descripcion={descripcion}
                    cardName={cardName}
                    postulante={postulante}
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
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">El pago de prueba se registró correctamente. Puedes revisarlo en el dashboard de pagos.</p>
              {vinculado && (
                <p className="text-xs text-green-700 font-semibold">
                  Tu pago fue vinculado a tu inscripción. Ahora puedes completar el formulario.
                </p>
              )}
              {vinculado ? (
                <a href="/perfil/mi-inscripcion"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl text-sm cursor-pointer">
                  Ir a Mi Inscripción
                </a>
              ) : (
                <button onClick={handleCancel}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl text-sm cursor-pointer">
                  Realizar otro pago de prueba
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
