import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, useToast } from '../context/AppContext';
import { Button, Input, Divider } from '../components/ui/index';
import { useScrollReveal } from '../hooks';

const STEPS = ['Shipping', 'Payment', 'Review'];

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  useScrollReveal();

  const [shipping, setShipping] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'US',
  });
  const [payment, setPayment] = useState({
    cardName: '', cardNumber: '', expiry: '', cvv: '',
  });

  const shippingCost = total >= 99 ? 0 : 12.99;
  const tax = total * 0.08;
  const orderTotal = total + shippingCost + tax;

  function handleField(setter) {
    return (e) => setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function formatCard(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  function formatExpiry(val) {
    const v = val.replace(/\D/g, '').slice(0, 4);
    return v.length >= 3 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
  }

  async function handlePlaceOrder() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800)); // simulate API
    clearCart();
    setPlaced(true);
    setLoading(false);
  }

  if (items.length === 0 && !placed) {
    navigate('/cart');
    return null;
  }

  // ── Success screen ─────────────────────────────────────
  if (placed) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center py-16 animate-scale-in">
          <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h1 className="font-display font-black text-4xl tracking-wider uppercase text-charcoal-900 mb-3">
            Order Placed!
          </h1>
          <p className="font-serif font-light text-steel-600 text-lg mb-2">
            Thank you for your order.
          </p>
          <p className="font-mono text-sm text-steel-400 mb-8">
            Order #{Math.random().toString(36).slice(2, 10).toUpperCase()} · Confirmation sent to {shipping.email || 'your email'}
          </p>
          <Button variant="amber" size="lg" onClick={() => navigate('/')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-screen-lg mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/cart" className="text-steel-400 hover:text-charcoal-900 transition-colors">
            <BackIcon />
          </Link>
          <h1 className="font-display font-black text-3xl tracking-wider uppercase text-charcoal-900">
            Checkout
          </h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-bold tracking-widest uppercase transition-all
                ${i === step ? 'bg-charcoal-900 text-amber-400' : i < step ? 'bg-amber-400/20 text-amber-700' : 'text-steel-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black
                  ${i < step ? 'bg-amber-400 text-charcoal-900' : i === step ? 'bg-amber-400 text-charcoal-900' : 'bg-cream-200 text-steel-500'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < step ? 'bg-amber-400' : 'bg-cream-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">

            {/* ── Step 0: Shipping ─────────────── */}
            {step === 0 && (
              <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 animate-fade-up space-y-5">
                <h2 className="font-display font-bold text-lg tracking-widest uppercase text-charcoal-900">
                  Shipping Address
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="First Name" name="firstName" value={shipping.firstName}
                    onChange={handleField(setShipping)} placeholder="John" required />
                  <Input label="Last Name" name="lastName" value={shipping.lastName}
                    onChange={handleField(setShipping)} placeholder="Doe" required />
                </div>
                <Input label="Email" name="email" type="email" value={shipping.email}
                  onChange={handleField(setShipping)} placeholder="john@example.com" required />
                <Input label="Phone" name="phone" type="tel" value={shipping.phone}
                  onChange={handleField(setShipping)} placeholder="+1 (555) 000-0000" />
                <Input label="Street Address" name="address" value={shipping.address}
                  onChange={handleField(setShipping)} placeholder="123 Main St" required />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input label="City" name="city" value={shipping.city}
                    onChange={handleField(setShipping)} placeholder="New York" className="sm:col-span-1" required />
                  <Input label="State" name="state" value={shipping.state}
                    onChange={handleField(setShipping)} placeholder="NY" required />
                  <Input label="ZIP" name="zip" value={shipping.zip}
                    onChange={handleField(setShipping)} placeholder="10001" required />
                </div>

                <Divider label="Delivery method" />
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { id: 'standard', label: 'Standard', sub: '3–5 business days', price: shippingCost === 0 ? 'FREE' : '$12.99' },
                    { id: 'express', label: 'Express', sub: '1–2 business days', price: '$24.99' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 border border-cream-200 rounded-xl cursor-pointer hover:border-amber-400 transition-colors">
                      <input type="radio" name="delivery" defaultChecked={opt.id === 'standard'} className="custom-check" />
                      <div className="flex-1">
                        <p className="text-sm font-display font-semibold tracking-wide text-charcoal-900">{opt.label}</p>
                        <p className="text-xs font-mono text-steel-400">{opt.sub}</p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-amber-600">{opt.price}</span>
                    </label>
                  ))}
                </div>

                <Button variant="primary" size="lg" className="w-full" onClick={() => setStep(1)}>
                  Continue to Payment →
                </Button>
              </div>
            )}

            {/* ── Step 1: Payment ──────────────── */}
            {step === 1 && (
              <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 animate-fade-up space-y-5">
                <h2 className="font-display font-bold text-lg tracking-widest uppercase text-charcoal-900">
                  Payment Details
                </h2>
                <div className="flex gap-2 mb-2">
                  {['VISA', 'MC', 'AMEX', 'PayPal'].map(p => (
                    <span key={p} className="px-2.5 py-1 bg-cream-200 text-steel-600 text-xs font-mono rounded">{p}</span>
                  ))}
                </div>
                <Input label="Name on Card" name="cardName" value={payment.cardName}
                  onChange={handleField(setPayment)} placeholder="John Doe" required />
                <div>
                  <label className="block text-xs font-display font-semibold tracking-widest uppercase text-steel-600 mb-1.5">
                    Card Number
                  </label>
                  <input
                    value={payment.cardNumber}
                    onChange={e => setPayment(p => ({ ...p, cardNumber: formatCard(e.target.value) }))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-widest text-charcoal-900 placeholder-steel-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-semibold tracking-widest uppercase text-steel-600 mb-1.5">Expiry</label>
                    <input
                      value={payment.expiry}
                      onChange={e => setPayment(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                      placeholder="MM/YY"
                      className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3.5 py-2.5 text-sm font-mono text-charcoal-900 placeholder-steel-400 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <Input label="CVV" name="cvv" value={payment.cvv}
                    onChange={handleField(setPayment)} placeholder="•••" maxLength={4} />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-steel-400">
                  <span>🔒</span> Your payment info is encrypted and secure.
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(0)}>← Back</Button>
                  <Button variant="primary" size="lg" className="flex-1" onClick={() => setStep(2)}>
                    Review Order →
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Review ───────────────── */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-up">
                <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-bold text-sm tracking-widest uppercase text-charcoal-900">Shipping To</h2>
                    <button onClick={() => setStep(0)} className="text-xs font-mono text-amber-600 hover:text-amber-700">Edit</button>
                  </div>
                  <p className="text-sm font-mono text-steel-600">
                    {shipping.firstName} {shipping.lastName}<br />
                    {shipping.address}, {shipping.city} {shipping.state} {shipping.zip}<br />
                    {shipping.email}
                  </p>
                </div>
                <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-bold text-sm tracking-widest uppercase text-charcoal-900">Payment</h2>
                    <button onClick={() => setStep(1)} className="text-xs font-mono text-amber-600 hover:text-amber-700">Edit</button>
                  </div>
                  <p className="text-sm font-mono text-steel-600">
                    Card ending in {payment.cardNumber.slice(-4) || '••••'}
                  </p>
                </div>
                {/* Items summary */}
                <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5 space-y-3">
                  <h2 className="font-display font-bold text-sm tracking-widest uppercase text-charcoal-900 mb-3">Items ({items.length})</h2>
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold tracking-wide text-charcoal-900 truncate">{item.name}</p>
                        <p className="text-xs font-mono text-steel-400">×{item.quantity}</p>
                      </div>
                      <span className="text-sm font-mono font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                  <Button variant="amber" size="lg" className="flex-1" loading={loading} onClick={handlePlaceOrder}>
                    {loading ? 'Placing Order…' : `Place Order — $${orderTotal.toFixed(2)}`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mini cart summary */}
          <div className="reveal">
            <div className="bg-charcoal-900 rounded-2xl p-5 text-cream-100 sticky top-24">
              <h3 className="font-display font-bold text-sm tracking-widest uppercase text-amber-400 mb-4">Summary</h3>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs font-mono">
                    <span className="text-steel-400 truncate mr-2">{item.name} ×{item.quantity}</span>
                    <span className="text-cream-200 flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Divider />
              <div className="space-y-2 mt-3 text-sm font-mono">
                <div className="flex justify-between text-steel-400">
                  <span>Subtotal</span><span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-steel-400">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-400' : ''}>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-steel-400">
                  <span>Tax</span><span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-cream-100 pt-2 border-t border-steel-700">
                  <span className="font-display uppercase tracking-widest">Total</span>
                  <span className="text-amber-400">${orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}
