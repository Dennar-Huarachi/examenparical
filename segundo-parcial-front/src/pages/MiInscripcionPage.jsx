import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY || 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX');

function RealStripeForm({ clientSecret, postulante, monto, onSuccess, onError, onCancel }) {
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
          billing_details: { name: postulante.nombres + ' ' + postulante.apellidos },
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
        const res = await api.post('/postulante-registro/pago-stripe', {
          payment_intent_id: paymentIntent.id,
          monto: paymentIntent.amount / 100,
        });
        if (res.data.success) {
          onSuccess(res.data);
        } else {
          onError(res.data.message || 'Error al registrar el pago');
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
      <PaymentElement />
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-bold mb-1">Tarjeta de prueba</p>
        <p>Número: <strong>4242 4242 4242 4242</strong></p>
        <p>Fecha: cualquier fecha futura | CVC: cualquier 3 dígitos</p>
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
      >
        {processing ? 'Procesando...' : 'Pagar ahora'}
      </button>
      <button onClick={onCancel} disabled={processing} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 cursor-pointer">
        Cancelar
      </button>
    </form>
  );
}

function StripeForm({ monto, postulante, onSuccess, onError, onCancel }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [intentError, setIntentError] = useState(null);
  const [mockMode, setMockMode] = useState(false);
  const [submittingMock, setSubmittingMock] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.post('/stripe/create-payment-intent', {
          ci: postulante.ci,
          monto: monto || 700,
          card_name: postulante.nombres + ' ' + postulante.apellidos,
        });
        if (res.data.success) {
          const secret = res.data.data.client_secret;
          if (secret && secret.startsWith('pi_') && !secret.startsWith('pi_XXXX') && !secret.includes('_secret_test')) {
            setClientSecret(secret);
          } else {
            setMockMode(true);
          }
        } else {
          setIntentError(res.data.message || 'Error al crear el pago');
        }
      } catch (err) {
        setIntentError(err.response?.data?.message || 'Error de conexión al crear el pago');
      }
    };
    init();
  }, []);

  const handleMockConfirm = async () => {
    setSubmittingMock(true);
    try {
      const testRes = await api.post('/stripe/test-confirm', {
        payment_intent_id: 'test_' + Date.now(),
        card_name: postulante.nombres + ' ' + postulante.apellidos,
        monto: monto || 700,
        descripcion: 'Pago inscripción CUP',
      });
      if (testRes.data.success) {
        const regRes = await api.post('/postulante-registro/pago-stripe', {
          payment_intent_id: testRes.data.data.numero_comprobante,
          monto: monto || 700,
        });
        if (regRes.data.success) {
          onSuccess(regRes.data);
        } else {
          onError(regRes.data.message);
        }
      } else {
        onError(testRes.data.message);
      }
    } catch (err) {
      onError(err.response?.data?.message || 'Error en simulación');
    } finally {
      setSubmittingMock(false);
    }
  };

  if (intentError) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{intentError}</div>;
  }

  if (!clientSecret && !mockMode) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function MockCardForm({ onMockConfirm, onCancel, processing }) {
    const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
    const [expiry, setExpiry] = useState('12/28');
    const [cvc, setCvc] = useState('123');

    return (
      <form onSubmit={(e) => { e.preventDefault(); onMockConfirm(); }} className="space-y-4">
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
            <input type="text" value={postulante.nombres + ' ' + postulante.apellidos} disabled
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

  if (mockMode) {
    return (
      <MockCardForm
        onMockConfirm={handleMockConfirm}
        onCancel={onCancel}
        processing={submittingMock}
      />
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <RealStripeForm
        clientSecret={clientSecret}
        postulante={postulante}
        monto={monto}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
}

function PagoCajaForm({ postulante, onSuccess, onError, onCancel }) {
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [monto, setMonto] = useState(700);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numeroComprobante.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/postulante-registro/pago-caja', {
        numero_comprobante: numeroComprobante.trim(),
        monto: monto,
      });
      if (res.data.success) {
        onSuccess(res.data);
      } else {
        onError(res.data.message || 'Error al registrar comprobante');
      }
    } catch (err) {
      onError(err.response?.data?.message || 'Error de conexión');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Número de comprobante</label>
        <input
          type="text"
          value={numeroComprobante}
          onChange={(e) => setNumeroComprobante(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Ingrese el número de comprobante"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Bs)</label>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          min="1"
          required
        />
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
        <p className="font-bold mb-1">Pago en caja</p>
        <p>Realice el depósito en caja y registre el número de comprobante. Un administrador verificará el pago antes de que pueda continuar.</p>
      </div>
      <button
        type="submit"
        disabled={submitting || !numeroComprobante.trim()}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 cursor-pointer"
      >
        {submitting ? 'Registrando...' : 'Registrar comprobante'}
      </button>
      <button onClick={onCancel} disabled={submitting} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 cursor-pointer">
        Cancelar
      </button>
    </form>
  );
}

function FormularioInscripcion({ postulante, onSuccess, onError }) {
  const [form, setForm] = useState({
    nombres: postulante.nombres || '',
    apellidos: postulante.apellidos || '',
    fecha_nacimiento: postulante.fecha_nacimiento || '',
    sexo: postulante.sexo || '',
    direccion: postulante.direccion || '',
    telefono: postulante.telefono || '',
    colegio_procedencia: postulante.colegio_procedencia || '',
    ciudad: postulante.ciudad || '',
    carrera_principal_id: postulante.carrera_principal_id || '',
    titulo_bachiller: postulante.titulo_bachiller || false,
    nota_titulo_bachiller: postulante.nota_titulo_bachiller || '',
    turno_preferido: postulante.turno_preferido || '',
    trabaja: postulante.trabaja || false,
    discapacidad: postulante.discapacidad || false,
    tipo_discapacidad: postulante.tipo_discapacidad || '',
  });
  const [carreras, setCarreras] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/carreras').then((res) => {
      if (res.data.success) setCarreras(res.data.data || []);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/postulante-registro/completar-formulario', form);
      if (res.data.success) {
        onSuccess(res.data);
      } else {
        onError(res.data.message || 'Error al guardar el formulario');
      }
    } catch (err) {
      onError(err.response?.data?.message || 'Error de conexión');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CI</label>
          <input type="text" value={postulante.ci || ''} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input type="text" value={postulante.correo || ''} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
          <input type="text" name="nombres" value={form.nombres} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
          <input type="text" name="apellidos" value={form.apellidos} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
          <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
          <select name="sexo" value={form.sexo} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Seleccione...</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
          <input type="text" name="direccion" value={form.direccion} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
          <input type="text" name="telefono" value={form.telefono} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Colegio de procedencia *</label>
          <input type="text" name="colegio_procedencia" value={form.colegio_procedencia} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
          <input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Carrera a la que postula *</label>
          <select name="carrera_principal_id" value={form.carrera_principal_id} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Seleccione...</option>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Turno preferido *</label>
          <select name="turno_preferido" value={form.turno_preferido} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Seleccione...</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" name="titulo_bachiller" checked={form.titulo_bachiller} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded border-gray-300" />
          <label className="text-sm font-medium text-gray-700">Título de bachiller</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota del título de bachiller</label>
          <input type="number" name="nota_titulo_bachiller" value={form.nota_titulo_bachiller} onChange={handleChange} step="0.01" min="0" max="100" className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" name="trabaja" checked={form.trabaja} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded border-gray-300" />
          <label className="text-sm font-medium text-gray-700">¿Trabaja actualmente?</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" name="discapacidad" checked={form.discapacidad} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded border-gray-300" />
          <label className="text-sm font-medium text-gray-700">¿Tiene alguna discapacidad?</label>
        </div>
        {form.discapacidad && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de discapacidad</label>
            <input type="text" name="tipo_discapacidad" value={form.tipo_discapacidad} onChange={handleChange} className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Describa el tipo de discapacidad" />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
          {submitting ? 'Guardando...' : 'Completar inscripción'}
        </button>
      </div>
    </form>
  );
}

function StepIndicator({ currentStep }) {
  const pasos = [
    { num: 1, label: 'Pago' },
    { num: 2, label: 'Formulario' },
    { num: 3, label: 'Completado' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {pasos.map((p, i) => (
        <React.Fragment key={p.num}>
          <div className={`flex items-center gap-2 ${p.num <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              p.num < currentStep ? 'bg-blue-600 text-white' :
              p.num === currentStep ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
              'bg-gray-200 text-gray-500'
            }`}>
              {p.num < currentStep ? '✓' : p.num}
            </div>
            <span className="text-sm font-medium hidden sm:block">{p.label}</span>
          </div>
          {i < pasos.length - 1 && (
            <div className={`flex-1 h-0.5 min-w-8 ${p.num < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function MiInscripcionPage() {
  const [loading, setLoading] = useState(true);
  const [postulante, setPostulante] = useState(null);
  const [paso, setPaso] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPagoOpciones, setShowPagoOpciones] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const cargarRegistro = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/postulante-registro/mi-registro');
      if (res.data.success) {
        setPostulante(res.data.data.postulante);
        setPaso(res.data.data.paso);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el registro');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarRegistro();
  }, [cargarRegistro]);

  const handlePaymentSuccess = (data) => {
    setSuccessMsg(data.message || 'Pago registrado correctamente');
    setShowPagoOpciones(false);
    setSelectedPayment(null);
    cargarRegistro();
  };

  const handleFormSuccess = (data) => {
    setSuccessMsg(data.message || 'Inscripción completada');
    cargarRegistro();
  };

  const handleError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !postulante) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sin registro</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const pasoActual = paso?.paso_actual || 1;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Mi inscripción</h1>
        <p className="text-sm text-gray-500 mt-1">Siga los pasos para completar su inscripción</p>
      </div>

      <StepIndicator currentStep={pasoActual} />

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {pasoActual === 1 && !showPagoOpciones && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pendiente de pago</h2>
            <p className="text-gray-500 text-sm mb-1">Debe realizar el pago para continuar con su inscripción.</p>
            <p className="text-gray-500 text-sm">Monto de inscripción: <strong>700 Bs</strong></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => { setSelectedPayment('stripe'); setShowPagoOpciones(true); }}
              className="p-6 border-2 border-blue-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center group cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Pagar con Stripe</h3>
              <p className="text-xs text-gray-500">Pago en línea con tarjeta de crédito/débito</p>
            </button>
            <button onClick={() => { setSelectedPayment('caja'); setShowPagoOpciones(true); }}
              className="p-6 border-2 border-green-200 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all text-center group cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Pago en caja</h3>
              <p className="text-xs text-gray-500">Registre su comprobante de depósito</p>
            </button>
          </div>
        </div>
      )}

      {pasoActual === 1 && showPagoOpciones && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => { setShowPagoOpciones(false); setSelectedPayment(null); }}
              className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {selectedPayment === 'stripe' ? 'Pagar con Stripe' : 'Registrar comprobante de caja'}
            </h2>
          </div>
          {selectedPayment === 'stripe' ? (
            <StripeForm
              monto={700}
              postulante={postulante}
              onSuccess={handlePaymentSuccess}
              onError={handleError}
              onCancel={() => { setShowPagoOpciones(false); setSelectedPayment(null); }}
            />
          ) : (
            <PagoCajaForm
              postulante={postulante}
              onSuccess={handlePaymentSuccess}
              onError={handleError}
              onCancel={() => { setShowPagoOpciones(false); setSelectedPayment(null); }}
            />
          )}
        </div>
      )}

      {pasoActual === 1 && postulante?.estado === 'pago_en_verificacion' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pago en verificación</h2>
          <p className="text-gray-500 text-sm">Su comprobante de pago está siendo verificado por el administrador.</p>
          <p className="text-gray-500 text-sm mt-1">Este proceso puede tomar algunos minutos. Vuelva a recargar la página más tarde.</p>
          <button onClick={cargarRegistro} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Verificar estado
          </button>
        </div>
      )}

      {pasoActual === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">Formulario de datos</h2>
            <p className="text-sm text-gray-500">Complete todos los campos obligatorios para finalizar su inscripción</p>
          </div>
          <FormularioInscripcion
            postulante={postulante}
            onSuccess={handleFormSuccess}
            onError={handleError}
          />
        </div>
      )}

      {pasoActual === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Inscripción completada!</h2>
          <p className="text-gray-500 text-sm mb-4">Su inscripción ha sido registrada exitosamente.</p>
          <div className="inline-block bg-gray-50 rounded-xl p-4 text-left border">
            <p className="text-sm text-gray-600"><strong>ID:</strong> {postulante?.id_postulante}</p>
            <p className="text-sm text-gray-600"><strong>CI:</strong> {postulante?.ci}</p>
            <p className="text-sm text-gray-600"><strong>Postulante:</strong> {postulante?.nombres} {postulante?.apellidos}</p>
          </div>
        </div>
      )}
    </div>
  );
}
