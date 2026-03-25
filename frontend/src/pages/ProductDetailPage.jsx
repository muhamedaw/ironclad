import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PRODUCTS, CATEGORIES, SAMPLE_REVIEWS } from '../data/products';
import { useCart, useToast } from '../context/AppContext';
import { useWishlist, useScrollReveal } from '../hooks';
import { StarRating } from '../components/product/ProductCard';
import ProductCard from '../components/product/ProductCard';
import { Button, Badge, QuantitySelector } from '../components/ui/index';
import { PageLoader } from '../components/skeleton/Skeletons';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { toggle, isWishlisted } = useWishlist();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  useScrollReveal();

  const product = PRODUCTS.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [id]);

  if (loading) return <PageLoader />;
  if (!product) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🔩</p>
        <h2 className="font-display font-black text-2xl tracking-wide text-charcoal-900 mb-2">Part not found</h2>
        <Button variant="amber" onClick={() => navigate('/')}>Back to Shop</Button>
      </div>
    );
  }

  const images = [product.image, product.image2];
  const catInfo = CATEGORIES.find(c => c.id === product.category);
  const wishlisted = isWishlisted(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  // Related products
  const related = PRODUCTS
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) addItem(product);
    setAdding(true);
    showToast(`${product.name} ×${qty} added to cart`);
    setTimeout(() => setAdding(false), 800);
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-steel-400 mb-6">
          <Link to="/" className="hover:text-amber-500 transition-colors">Shop</Link>
          <span>/</span>
          <Link to={`/?category=${product.category}`} className="hover:text-amber-500 transition-colors">
            {catInfo?.label}
          </Link>
          <span>/</span>
          <span className="text-charcoal-900 truncate max-w-xs">{product.name}</span>
        </nav>

        {/* ── Product main ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-10 mb-16">

          {/* Images */}
          <div className="space-y-3 animate-fade-in">
            <div className="aspect-[4/3] bg-cream-200 rounded-2xl overflow-hidden relative">
              <img
                src={images[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.isNew && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-charcoal-900 text-amber-400 text-xs font-display font-bold tracking-widest uppercase rounded">
                  New
                </span>
              )}
              {discount && (
                <span className="absolute top-4 right-4 px-3 py-1 bg-rust-500 text-cream-50 text-xs font-display font-bold tracking-widest rounded">
                  Save {discount}%
                </span>
              )}
            </div>
            {/* Thumbnail strip */}
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImg === i ? 'border-amber-400' : 'border-cream-200 hover:border-steel-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="animate-fade-up">
            {/* Brand */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono font-semibold text-amber-600 uppercase tracking-widest">
                {product.brand}
              </span>
              {catInfo && (
                <Badge color="default">{catInfo.icon} {catInfo.label}</Badge>
              )}
            </div>

            <h1 className="font-display font-black text-3xl md:text-4xl tracking-wide text-charcoal-900 leading-tight mb-3">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="text-xs font-mono text-steel-400 mb-4">SKU: {product.sku}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={product.rating} size="lg" />
              <span className="text-sm font-mono text-steel-500">{product.rating} ({product.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display font-black text-4xl tracking-wide text-charcoal-900">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-xl font-mono text-steel-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  <Badge color="rust">Save ${(product.originalPrice - product.price).toFixed(2)}</Badge>
                </>
              )}
            </div>

            {/* Compatibility */}
            <div className="p-3.5 bg-amber-400/8 border border-amber-400/20 rounded-xl mb-5">
              <p className="text-xs font-display font-bold tracking-widest uppercase text-amber-700 mb-1">Fits</p>
              <p className="text-sm font-mono text-charcoal-900">
                {product.brand} {product.model} ({product.year}) · Compatible with {product.compatibleBrands.slice(0, 3).join(', ')}
              </p>
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-5">
              <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-green-500' : 'bg-rust-500'}`} />
              <span className={`text-sm font-mono font-medium ${product.inStock ? 'text-green-700' : 'text-rust-500'}`}>
                {product.inStock ? `In Stock — Ships in ${product.shippingDays} ${product.shippingDays === 1 ? 'day' : 'days'}` : 'Out of Stock'}
              </span>
            </div>

            {/* Qty + Add to cart */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <QuantitySelector value={qty} onChange={setQty} />
              <Button
                variant={adding ? 'amber' : 'primary'}
                size="lg"
                disabled={!product.inStock}
                onClick={handleAddToCart}
                className="flex-1"
              >
                {adding ? '✓ Added to Cart' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>

            {/* Wishlist + Share */}
            <div className="flex gap-2">
              <button
                onClick={() => { toggle(product.id); showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-display font-semibold tracking-wide transition-all
                  ${wishlisted
                    ? 'border-rust-400 bg-rust-500/10 text-rust-500'
                    : 'border-cream-200 text-steel-600 hover:border-rust-400 hover:text-rust-500'
                  }`}
              >
                {wishlisted ? '♥ Saved' : '♡ Wishlist'}
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('Link copied!', 'info'); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cream-200 text-steel-600 text-sm font-display font-semibold tracking-wide hover:border-steel-400 transition-colors"
              >
                Share
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-cream-200">
              {[
                { icon: '🛡', text: '2-Year Warranty' },
                { icon: '↩', text: '30-Day Returns' },
                { icon: '✓', text: 'OEM Certified' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 text-xs font-mono text-steel-500">
                  <span>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div className="mb-12 reveal">
          <div className="flex gap-1 border-b border-cream-200 mb-6">
            {['description', 'specs', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-display font-bold tracking-widest uppercase border-b-2 transition-colors -mb-px
                  ${activeTab === tab
                    ? 'border-amber-400 text-charcoal-900'
                    : 'border-transparent text-steel-500 hover:text-charcoal-900'
                  }`}
              >
                {tab} {tab === 'reviews' && `(${product.reviews})`}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <div className="max-w-2xl animate-fade-in">
              <p className="font-serif font-light text-base text-steel-700 leading-relaxed">{product.description}</p>
              <ul className="mt-4 space-y-2">
                {['Direct OEM replacement — no modifications required', 'All necessary hardware and gaskets included', 'Comprehensive installation manual', `${product.brand} factory-specification tolerances`].map(pt => (
                  <li key={pt} className="flex items-start gap-2 text-sm font-mono text-steel-600">
                    <span className="text-amber-500 mt-0.5">→</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-lg animate-fade-in">
              <dl className="divide-y divide-cream-200 border border-cream-200 rounded-xl overflow-hidden">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex px-4 py-3 hover:bg-cream-100 transition-colors">
                    <dt className="w-40 text-xs font-display font-semibold tracking-widest uppercase text-steel-500 flex-shrink-0">{k}</dt>
                    <dd className="text-sm font-mono text-charcoal-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-4 animate-fade-in">
              {/* Summary */}
              <div className="flex items-center gap-6 p-4 bg-cream-100 border border-cream-200 rounded-xl mb-6">
                <div className="text-center">
                  <div className="font-display font-black text-5xl text-charcoal-900">{product.rating}</div>
                  <StarRating rating={product.rating} size="lg" />
                  <p className="text-xs font-mono text-steel-400 mt-1">{product.reviews} reviews</p>
                </div>
              </div>
              {SAMPLE_REVIEWS.map((r, i) => (
                <div key={i} className="p-4 border border-cream-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-charcoal-900 text-amber-400 rounded-full flex items-center justify-center font-display font-black text-sm">
                        {r.author[0]}
                      </div>
                      <div>
                        <p className="text-sm font-display font-semibold tracking-wide text-charcoal-900">{r.author}</p>
                        <StarRating rating={r.rating} />
                      </div>
                    </div>
                    <span className="text-xs font-mono text-steel-400">{r.date}</span>
                  </div>
                  <p className="text-sm font-mono text-steel-600 leading-relaxed mt-2">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Related Products ─────────────────────────────── */}
        {related.length > 0 && (
          <section className="reveal">
            <h2 className="font-display font-black text-2xl tracking-wider uppercase text-charcoal-900 mb-5">
              Related Parts
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
