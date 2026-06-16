import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function StripePaymentForm({ clientSecret, paymentIntentId, ci, cardName, monto, onSuccess, onError, onCancel }) {
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
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
        const res = await fetch(`${apiUrl}/stripe/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentIntent.id, ci, card_name: cardName }),
        });
        const data = await res.json();
        if (data.success) {
          onSuccess(data);
        } else {
          onError(data.message || 'Error al registrar el pago');
        }
      } catch (err) {
        onError('Error de conexión al confirmar el pago');
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
        <p>Fecha: cualquier fecha futura &nbsp;|&nbsp; CVC: cualquier 3 dígitos</p>
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
          ) : (
            'Pagar ahora'
          )}
        </button>
      </div>
    </form>
  );
}
