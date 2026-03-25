/**
 * checkout-service/index.js
 * ─────────────────────────────────────────────────────────────────
 * Ironclad Checkout & Payment Backend
 *
 * Stack: Node.js + Express + Stripe + PayPal SDK
 *
 * Endpoints:
 *   POST /api/checkout/session        Create a checkout session (validates cart)
 *   POST /api/payment/card/intent     Create Stripe PaymentIntent
 *   POST /api/payment/paypal/order    Create PayPal order
 *   POST /api/payment/paypal/capture  Capture PayPal payment
 *   POST /api/payment/cod/confirm     Confirm cash-on-delivery order
 *   POST /api/payment/webhook         Stripe webhook handler
 *   GET  /api/orders/:id              Get order details
 *
 * Install: npm install express stripe @paypal/checkout-server-sdk
 *          dotenv cors helmet express-rate-limit express-validator
 */

'use strict';

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Stripe       = require('stripe');
const paypal       = require('@paypal/checkout-server-sdk');
const crypto       = require('crypto');

const app  = express();
const PORT = process.env.PORT || 4002;

// ── Stripe & PayPal clients ───────────────────────────────────────
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2024-04-10',
  telemetry: false,
});

function paypalClient() {
  const env = process.env.PAYPAL_ENV === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID || 'sb-id', process.env.PAYPAL_CLIENT_SECRET || 'sb-secret');
  return new paypal.core.PayPalHttpClient(env);
}

// ── In-memory order store (swap for MySQL in production) ──────────
const orderStore = new Map();
function genOrderId() {
  return `IC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } }));

// Raw body needed for Stripe webhooks
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '64kb' }));

// ── Logger ────────────────────────────────────────────────────────
const log = {
  info:  (msg, meta={}) => console.log (`[INFO]  ${new Date().toISOString()} ${msg}`, meta),
  error: (msg, meta={}) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta),
};

// ── Validation helpers ────────────────────────────────────────────
const contactRules = [
  body('contact.email').isEmail().normalizeEmail(),
  body('contact.firstName').isLength({ min:1, max:80 }).trim(),
  body('contact.lastName').isLength({ min:1, max:80 }).trim(),
  body('contact.phone').isMobilePhone('any'),
  body('contact.address').isLength({ min:3, max:200 }).trim(),
  body('contact.city').isLength({ min:1, max:100 }).trim(),
  body('contact.state').isLength({ min:1, max:50 }).trim(),
  body('contact.zip').isPostalCode('any'),
  body('contact.country').isISO31661Alpha2(),
];

const cartRules = [
  body('cart').isArray({ min: 1, max: 50 }),
  body('cart.*.id').isString().isLength({ max:50 }),
  body('cart.*.qty').isInt({ min:1, max:99 }),
  body('cart.*.price').isFloat({ min:0 }),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ── Price catalogue (server-authoritative, prevents price tampering) ──
const PRODUCT_PRICES = {
  'p001': 89.99, 'p019': 24.99, 'p011': 149.99,
  'p002': 189.99, 'p003': 249.99, 'p004': 159.99,
  'p005': 289.99, 'p006': 119.99, 'p007': 59.99,
};

const SHIPPING_PRICES = { standard: 0, express: 12.99, overnight: 29.99 };
const TAX_RATE = 0.08;
const CURRENCY = 'usd';

function computeOrderTotals(cart, shippingMethod) {
  // Always recompute from server-side prices to prevent client tampering
  const lineItems = cart.map(item => {
    const serverPrice = PRODUCT_PRICES[item.id];
    if (!serverPrice) throw new Error(`Unknown product: ${item.id}`);
    return { ...item, price: serverPrice, lineTotal: +(serverPrice * item.qty).toFixed(2) };
  });
  const subtotal  = +lineItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
  const shipping  = +(SHIPPING_PRICES[shippingMethod] ?? SHIPPING_PRICES.standard).toFixed(2);
  const tax       = +(subtotal * TAX_RATE).toFixed(2);
  const total     = +(subtotal + shipping + tax).toFixed(2);
  return { lineItems, subtotal, shipping, tax, total };
}


// ═════════════════════════════════════════════════════════════════
// ROUTE 1: Create checkout session
// POST /api/checkout/session
// Validates cart, returns server-computed totals and a session token
// ═════════════════════════════════════════════════════════════════
app.post('/api/checkout/session',
  [...contactRules, ...cartRules,
   body('shippingMethod').isIn(['standard','express','overnight']),
   body('paymentMethod').isIn(['card','paypal','cod']),
  ],
  validate,
  async (req, res) => {
    try {
      const { cart, contact, shippingMethod, paymentMethod } = req.body;
      const totals = computeOrderTotals(cart, shippingMethod);

      // Create pending order record
      const sessionId = crypto.randomBytes(16).toString('hex');
      const session = {
        id: sessionId,
        contact, cart: totals.lineItems,
        shippingMethod, paymentMethod,
        ...totals,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      };

      orderStore.set(sessionId, session);
      log.info(`Checkout session created`, { sessionId, total: totals.total, method: paymentMethod });

      return res.json({
        success: true,
        sessionId,
        totals,
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      log.error('Session creation failed', { error: err.message });
      return res.status(400).json({ success: false, error: err.message });
    }
  }
);


// ═════════════════════════════════════════════════════════════════
// ROUTE 2: Stripe — Create PaymentIntent
// POST /api/payment/card/intent
// ═════════════════════════════════════════════════════════════════
app.post('/api/payment/card/intent',
  [body('sessionId').isString().isLength({ min:32, max:64 })],
  validate,
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const session = orderStore.get(sessionId);

      if (!session) return res.status(404).json({ success:false, error:'Session not found or expired' });
      if (new Date(session.expiresAt) < new Date()) return res.status(410).json({ success:false, error:'Session expired' });
      if (session.paymentMethod !== 'card') return res.status(400).json({ success:false, error:'Wrong payment method' });

      const amountInCents = Math.round(session.total * 100);

      const intent = await stripe.paymentIntents.create({
        amount:   amountInCents,
        currency: CURRENCY,
        metadata: {
          sessionId,
          customerEmail: session.contact.email,
          orderItems: session.cart.map(i => `${i.id}×${i.qty}`).join(','),
        },
        description: `Ironclad order — ${session.cart.length} item(s)`,
        receipt_email: session.contact.email,
        automatic_payment_methods: { enabled: true },
      });

      // Attach Stripe intent ID to session
      session.stripeIntentId = intent.id;
      session.status = 'awaiting_payment';
      orderStore.set(sessionId, session);

      log.info('PaymentIntent created', { intentId: intent.id, amount: amountInCents });

      return res.json({
        success: true,
        clientSecret: intent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
      });
    } catch (err) {
      log.error('PaymentIntent creation failed', { error: err.message });
      if (err.type === 'StripeCardError') return res.status(402).json({ success:false, error: err.message });
      return res.status(500).json({ success:false, error:'Payment service error' });
    }
  }
);


// ═════════════════════════════════════════════════════════════════
// ROUTE 3: PayPal — Create Order
// POST /api/payment/paypal/order
// ═════════════════════════════════════════════════════════════════
app.post('/api/payment/paypal/order',
  [body('sessionId').isString().isLength({ min:32, max:64 })],
  validate,
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const session = orderStore.get(sessionId);

      if (!session) return res.status(404).json({ success:false, error:'Session not found' });
      if (session.paymentMethod !== 'paypal') return res.status(400).json({ success:false, error:'Wrong payment method' });

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: CURRENCY.toUpperCase(),
            value: session.total.toFixed(2),
            breakdown: {
              item_total:        { currency_code: CURRENCY.toUpperCase(), value: session.subtotal.toFixed(2) },
              shipping:          { currency_code: CURRENCY.toUpperCase(), value: session.shipping.toFixed(2) },
              tax_total:         { currency_code: CURRENCY.toUpperCase(), value: session.tax.toFixed(2) },
            },
          },
          items: session.cart.map(item => ({
            name:        item.name,
            sku:         item.id,
            unit_amount: { currency_code: CURRENCY.toUpperCase(), value: item.price.toFixed(2) },
            quantity:    String(item.qty),
            category:    'PHYSICAL_GOODS',
          })),
          shipping: {
            address: {
              address_line_1: session.contact.address,
              admin_area_2:   session.contact.city,
              admin_area_1:   session.contact.state,
              postal_code:    session.contact.zip,
              country_code:   session.contact.country,
            },
          },
        }],
        application_context: {
          brand_name: 'Ironclad Auto Parts',
          locale: 'en-US',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_ORIGIN}/checkout/success?sessionId=${sessionId}`,
          cancel_url:  `${process.env.FRONTEND_ORIGIN}/checkout/cancelled`,
        },
      });

      const ppClient = paypalClient();
      const order = await ppClient.execute(request);

      session.paypalOrderId = order.result.id;
      session.status = 'awaiting_payment';
      orderStore.set(sessionId, session);

      log.info('PayPal order created', { paypalOrderId: order.result.id });

      return res.json({
        success: true,
        paypalOrderId: order.result.id,
        approveUrl: order.result.links.find(l => l.rel === 'approve')?.href,
      });
    } catch (err) {
      log.error('PayPal order creation failed', { error: err.message });
      return res.status(500).json({ success:false, error:'PayPal service error' });
    }
  }
);


// ═════════════════════════════════════════════════════════════════
// ROUTE 4: PayPal — Capture Payment
// POST /api/payment/paypal/capture
// ═════════════════════════════════════════════════════════════════
app.post('/api/payment/paypal/capture',
  [body('sessionId').isString(), body('paypalOrderId').isString()],
  validate,
  async (req, res) => {
    try {
      const { sessionId, paypalOrderId } = req.body;
      const session = orderStore.get(sessionId);

      if (!session || session.paypalOrderId !== paypalOrderId) {
        return res.status(400).json({ success:false, error:'Invalid session or PayPal order mismatch' });
      }

      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.requestBody({});

      const ppClient = paypalClient();
      const capture  = await ppClient.execute(request);

      if (capture.result.status !== 'COMPLETED') {
        return res.status(402).json({ success:false, error:`PayPal capture status: ${capture.result.status}` });
      }

      const orderId = genOrderId();
      const order   = await finaliseOrder(session, orderId, {
        method:     'paypal',
        transactionId: capture.result.purchase_units[0]?.payments?.captures?.[0]?.id,
        status:     'paid',
        capturedAt: new Date().toISOString(),
      });

      log.info('PayPal payment captured', { orderId, paypalOrderId });

      return res.json({ success:true, orderId, order });
    } catch (err) {
      log.error('PayPal capture failed', { error: err.message });
      return res.status(500).json({ success:false, error:'PayPal capture failed' });
    }
  }
);


// ═════════════════════════════════════════════════════════════════
// ROUTE 5: Cash on Delivery — Confirm Order
// POST /api/payment/cod/confirm
// ═════════════════════════════════════════════════════════════════
app.post('/api/payment/cod/confirm',
  [body('sessionId').isString().isLength({ min:32, max:64 })],
  validate,
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const session = orderStore.get(sessionId);

      if (!session) return res.status(404).json({ success:false, error:'Session not found' });
      if (session.paymentMethod !== 'cod') return res.status(400).json({ success:false, error:'Not a COD order' });

      const orderId = genOrderId();
      const order   = await finaliseOrder(session, orderId, {
        method:  'cod',
        status:  'pending_collection',
        note:    'Payment due on delivery',
      });

      log.info('COD order confirmed', { orderId });

      return res.json({ success:true, orderId, order });
    } catch (err) {
      log.error('COD confirmation failed', { error: err.message });
      return res.status(500).json({ success:false, error:'Order confirmation failed' });
    }
  }
);


// ═════════════════════════════════════════════════════════════════
// ROUTE 6: Stripe Webhook
// POST /api/payment/webhook
// Handles: payment_intent.succeeded, payment_intent.payment_failed
// ═════════════════════════════════════════════════════════════════
app.post('/api/payment/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    log.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const sessionId = intent.metadata.sessionId;
      const session   = orderStore.get(sessionId);

      if (session && !session.completedOrderId) {
        const orderId = genOrderId();
        await finaliseOrder(session, orderId, {
          method:        'card',
          transactionId: intent.id,
          status:        'paid',
          capturedAt:    new Date().toISOString(),
        });
        log.info('Card payment confirmed via webhook', { orderId, intentId: intent.id });
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      const sessionId = intent.metadata.sessionId;
      const session   = orderStore.get(sessionId);
      if (session) {
        session.status = 'payment_failed';
        orderStore.set(sessionId, session);
        log.error('Card payment failed', { sessionId, reason: intent.last_payment_error?.message });
      }
      break;
    }
  }

  res.json({ received: true });
});


// ═════════════════════════════════════════════════════════════════
// ROUTE 7: Get Order
// GET /api/orders/:id
// ═════════════════════════════════════════════════════════════════
app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  // Find order by orderId (not sessionId)
  for (const session of orderStore.values()) {
    if (session.completedOrderId === id) {
      const { contact, cart, shippingMethod, subtotal, shipping, tax, total, paymentRecord, completedOrderId, completedAt } = session;
      return res.json({
        success: true,
        order: {
          id: completedOrderId,
          contact: { ...contact, phone: contact.phone }, // redact nothing in demo
          cart, shippingMethod, subtotal, shipping, tax, total,
          payment: paymentRecord,
          placedAt: completedAt,
        },
      });
    }
  }
  return res.status(404).json({ success:false, error:'Order not found' });
});


// ─── Finalise order helper ────────────────────────────────────────
async function finaliseOrder(session, orderId, paymentRecord) {
  session.status           = 'confirmed';
  session.completedOrderId = orderId;
  session.completedAt      = new Date().toISOString();
  session.paymentRecord    = paymentRecord;
  orderStore.set(session.id, session);

  // TODO: In production, persist to MySQL:
  //   await db.query('INSERT INTO orders SET ?', { id: orderId, ...session });
  //   await sendConfirmationEmail(session.contact.email, orderId);

  return {
    id:               orderId,
    contact:          session.contact,
    cart:             session.cart,
    shippingMethod:   session.shippingMethod,
    subtotal:         session.subtotal,
    shipping:         session.shipping,
    tax:              session.tax,
    total:            session.total,
    payment:          paymentRecord,
    placedAt:         session.completedAt,
  };
}


// ─── Error handler ────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  log.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success:false, error:'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log.info(`Checkout service running on :${PORT}`);
  log.info(`Stripe: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'test mode'}`);
  log.info(`PayPal: ${process.env.PAYPAL_ENV || 'sandbox'} environment`);
});

module.exports = app;
