import { Link, useNavigate } from 'react-router-dom';
import { useCart, useToast } from '../context/AppContext';
import { Button, QuantitySelector, EmptyState } from '../components/ui/index';
import { useScrollReveal } from '../hooks';

export default function CartPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  useScrollReveal();

  const shipping = total >= 99 ? 0 : 12.99;
  const tax = total * 0.08;
  const orderTotal = total + shipping + tax;

  function handleRemove(item) {
    removeItem(item.id);
    showToast(`${item.name} removed`, 'info');
  }

  if (items.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16">
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Browse our catalog and add parts to get started."
          action={<Button variant="amber" onClick={() => navigate('/')}>Browse Parts</Button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-wider uppercase text-charcoal-900">
            Your Cart
          </h1>
          <span className="text-sm font-mono text-steel-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="reveal flex gap-4 p-4 bg-cream-50 border border-cream-200 rounded-xl hover:border-cream-300 transition-colors"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Image */}
                <Link to={`/product/${item.id}`} className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg bg-cream-200"
                    loading="lazy"
                  />
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-0.5">{item.brand}</p>
                      <Link
                        to={`/product/${item.id}`}
                        className="font-display font-semibold text-sm tracking-wide text-charcoal-900 hover:text-amber-600 transition-colors line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs font-mono text-steel-400 mt-0.5">SKU: {item.sku}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      className="text-steel-300 hover:text-rust-500 transition-colors flex-shrink-0 p-1"
                      aria-label="Remove item"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(qty) => updateQty(item.id, qty)}
                    />
                    <div className="text-right">
                      <p className="font-display font-black text-base tracking-wide text-charcoal-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs font-mono text-steel-400">${item.price.toFixed(2)} each</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear cart */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { clearCart(); showToast('Cart cleared', 'info'); }}
                className="text-xs font-mono text-steel-400 hover:text-rust-500 transition-colors"
              >
                Clear cart
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="reveal">
            <div className="bg-charcoal-900 rounded-2xl p-6 text-cream-100 sticky top-24">
              <h2 className="font-display font-black text-xl tracking-widest uppercase mb-5 text-amber-400">
                Order Summary
              </h2>

              <dl className="space-y-3 mb-5">
                <div className="flex justify-between text-sm font-mono">
                  <dt className="text-steel-400">Subtotal</dt>
                  <dd className="text-cream-200">${total.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <dt className="text-steel-400">Shipping</dt>
                  <dd className={shipping === 0 ? 'text-green-400' : 'text-cream-200'}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </dd>
                </div>
                {shipping > 0 && (
                  <p className="text-xs font-mono text-steel-500">
                    Add ${(99 - total).toFixed(2)} more for free shipping
                  </p>
                )}
                <div className="flex justify-between text-sm font-mono">
                  <dt className="text-steel-400">Tax (8%)</dt>
                  <dd className="text-cream-200">${tax.toFixed(2)}</dd>
                </div>
                <div className="border-t border-steel-700 pt-3 flex justify-between">
                  <dt className="font-display font-bold tracking-widest uppercase text-cream-100">Total</dt>
                  <dd className="font-display font-black text-xl tracking-wide text-amber-400">
                    ${orderTotal.toFixed(2)}
                  </dd>
                </div>
              </dl>

              <Button
                variant="amber"
                size="lg"
                className="w-full"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout →
              </Button>

              <Link
                to="/"
                className="block text-center text-xs font-mono text-steel-500 hover:text-steel-300 mt-4 transition-colors"
              >
                ← Continue Shopping
              </Link>

              {/* Accepted payments */}
              <div className="mt-5 pt-4 border-t border-steel-800">
                <p className="text-xs font-mono text-steel-600 mb-2">Accepted payments</p>
                <div className="flex gap-2">
                  {['VISA', 'MC', 'AMEX', 'PayPal'].map(p => (
                    <span key={p} className="px-2 py-1 bg-steel-800 text-steel-400 text-xs font-mono rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}
