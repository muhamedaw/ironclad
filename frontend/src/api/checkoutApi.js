/**
 * src/api/checkoutApi.js
 * ─────────────────────────────────────────────────────────────────
 * Frontend API client — wires the React checkout flow to the backend.
 *
 * Usage:
 *   import { createCheckoutSession, createStripeIntent, ... } from './api/checkoutApi';
 */

const BASE = import.meta.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:4002';

// ── Core fetch wrapper ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const message = data.error || data.errors?.[0]?.msg || `HTTP ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, body: data });
  }
  return data;
}


// ─────────────────────────────────────────────────────────────────
// STEP 1: Create a checkout session (validates cart, locks prices)
// Called when the user clicks "Place Order" in the Review step.
//
// Returns: { sessionId, totals, expiresAt }
// ─────────────────────────────────────────────────────────────────
export async function createCheckoutSession({ cart, contact, shippingMethod, paymentMethod }) {
  return apiFetch('/api/checkout/session', {
    method: 'POST',
    body: JSON.stringify({ cart, contact, shippingMethod, paymentMethod }),
  });
}


// ─────────────────────────────────────────────────────────────────
// STEP 2a: Card — create Stripe PaymentIntent
// Returns: { clientSecret, publishableKey }
//
// Then load @stripe/stripe-js and confirm the payment on the client:
//
//   const stripe = await loadStripe(publishableKey);
//   const { error } = await stripe.confirmPayment({
//     elements,
//     clientSecret,
//     confirmParams: { return_url: window.location.href },
//   });
// ─────────────────────────────────────────────────────────────────
export async function createStripePaymentIntent(sessionId) {
  return apiFetch('/api/payment/card/intent', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}


// ─────────────────────────────────────────────────────────────────
// STEP 2b: PayPal — create PayPal order
// Returns: { paypalOrderId, approveUrl }
//
// Redirect user to approveUrl OR use PayPal JS SDK buttons:
//   paypal.Buttons({ createOrder: () => paypalOrderId, onApprove: ... }).render('#paypal-button');
// ─────────────────────────────────────────────────────────────────
export async function createPayPalOrder(sessionId) {
  return apiFetch('/api/payment/paypal/order', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function capturePayPalPayment(sessionId, paypalOrderId) {
  return apiFetch('/api/payment/paypal/capture', {
    method: 'POST',
    body: JSON.stringify({ sessionId, paypalOrderId }),
  });
}


// ─────────────────────────────────────────────────────────────────
// STEP 2c: Cash on Delivery — confirm the order
// Returns: { orderId, order }
// ─────────────────────────────────────────────────────────────────
export async function confirmCODOrder(sessionId) {
  return apiFetch('/api/payment/cod/confirm', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}


// ─────────────────────────────────────────────────────────────────
// Get order by ID (confirmation page)
// ─────────────────────────────────────────────────────────────────
export async function getOrder(orderId) {
  return apiFetch(`/api/orders/${orderId}`);
}


// ─────────────────────────────────────────────────────────────────
// Full payment flow helper — orchestrates everything from Review step
//
// Usage in ReviewStep component:
//   const { orderId, order } = await processPayment(checkoutState);
// ─────────────────────────────────────────────────────────────────
export async function processPayment(checkoutState) {
  const { cart, contact, shippingMethod, payment } = checkoutState;

  // 1. Create server session (validates + locks prices)
  const { sessionId, totals } = await createCheckoutSession({
    cart: cart.map(i => ({ id: i.id, qty: i.qty, price: i.price })),
    contact,
    shippingMethod,
    paymentMethod: payment.method,
  });

  // 2. Process payment based on method
  switch (payment.method) {
    case 'card': {
      // Get Stripe PaymentIntent client secret
      const { clientSecret, publishableKey } = await createStripePaymentIntent(sessionId);

      // Load Stripe.js dynamically
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(publishableKey);

      // In a real implementation, you'd use Stripe Elements here.
      // For the mock flow (no actual card), we simulate success:
      console.log('[Stripe] clientSecret ready:', clientSecret.slice(0, 20) + '...');

      // Mock: in production, call stripe.confirmCardPayment(clientSecret, { payment_method: {...} })
      return { sessionId, totals, method: 'card', mock: true };
    }

    case 'paypal': {
      const { paypalOrderId, approveUrl } = await createPayPalOrder(sessionId);

      // In production, redirect or render PayPal JS SDK buttons.
      // Here we simulate immediate capture for demo purposes:
      const { orderId, order } = await capturePayPalPayment(sessionId, paypalOrderId);
      return { orderId, order, method: 'paypal' };
    }

    case 'cod': {
      const { orderId, order } = await confirmCODOrder(sessionId);
      return { orderId, order, method: 'cod' };
    }

    default:
      throw new Error(`Unknown payment method: ${payment.method}`);
  }
}


// ─────────────────────────────────────────────────────────────────
// Mock processPayment (used when backend not available)
// Simulates the full flow with a configurable delay.
// ─────────────────────────────────────────────────────────────────
export async function mockProcessPayment(checkoutState, delayMs = 2000) {
  await new Promise(r => setTimeout(r, delayMs));

  const { cart, contact, shippingMethod, payment } = checkoutState;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingCost = { standard:0, express:12.99, overnight:29.99 }[shippingMethod] || 0;
  const tax = subtotal * 0.08;

  // Simulate random payment failure (10% chance for demo)
  if (payment.method === 'card' && Math.random() < 0.1) {
    throw new Error('Your card was declined. Please try a different payment method.');
  }

  return {
    orderId: `IC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    order: {
      id:             `IC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      contact,
      cart,
      shippingMethod,
      subtotal:       +subtotal.toFixed(2),
      shipping:       shippingCost,
      tax:            +tax.toFixed(2),
      total:          +(subtotal + shippingCost + tax).toFixed(2),
      payment:        { method: payment.method, status: payment.method === 'cod' ? 'pending' : 'paid' },
      placedAt:       new Date().toISOString(),
      estimatedDelivery: { standard:"5–7 business days", express:"2–3 business days", overnight:"Next business day" }[shippingMethod],
    },
  };
}
