import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart, useToast } from '../../context/AppContext';
import { useLazyImage, useWishlist } from '../../hooks';
import { CATEGORIES } from '../../data/products';

export default function ProductCard({ product, style }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { toggle, isWishlisted } = useWishlist();
  const [imgRef, imgLoaded] = useLazyImage(product.image);
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);

  const wishlisted = isWishlisted(product.id);
  const catInfo = CATEGORIES.find(c => c.id === product.category);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    setAdding(true);
    addItem(product);
    showToast(`${product.name} added to cart`);
    setTimeout(() => setAdding(false), 700);
  }

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
    showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', wishlisted ? 'info' : 'success');
  }

  return (
    <article
      style={style}
      className="card-lift reveal bg-cream-50 border border-cream-200 rounded-xl overflow-hidden group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/product/${product.id}`} className="block">

        {/* ── Image ───────────────────────────────── */}
        <div className="relative aspect-[4/3] bg-cream-200 overflow-hidden">
          {/* Lazy image */}
          <img
            ref={imgRef}
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" // tiny placeholder
            alt={product.name}
            className="lazy w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Skeleton overlay while loading */}
          {!imgLoaded && (
            <div className="absolute inset-0 skeleton-shimmer" />
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="inline-block px-2 py-0.5 bg-charcoal-900 text-amber-400 text-xs font-display font-bold tracking-widest uppercase rounded">
                New
              </span>
            )}
            {discount && (
              <span className="inline-block px-2 py-0.5 bg-rust-500 text-cream-50 text-xs font-display font-bold tracking-widest rounded">
                −{discount}%
              </span>
            )}
            {!product.inStock && (
              <span className="inline-block px-2 py-0.5 bg-steel-600 text-cream-200 text-xs font-display font-bold tracking-wider rounded">
                Out of Stock
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center
              border transition-all duration-200
              ${wishlisted
                ? 'bg-rust-500 border-rust-500 text-white scale-110'
                : 'bg-cream-50/80 backdrop-blur-sm border-cream-200 text-steel-400 hover:border-rust-400 hover:text-rust-400'
              }`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <HeartIcon filled={wishlisted} />
          </button>

          {/* Category chip */}
          {catInfo && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cream-50/80 backdrop-blur-sm border border-cream-200 rounded text-xs font-mono text-steel-600">
                {catInfo.icon} {catInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* ── Info ────────────────────────────────── */}
        <div className="p-4">
          {/* Brand + Model */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-mono font-medium text-amber-600 uppercase tracking-wider">
              {product.brand}
            </span>
            {product.model && (
              <>
                <span className="text-steel-300 text-xs">·</span>
                <span className="text-xs font-mono text-steel-400">{product.model}</span>
              </>
            )}
          </div>

          {/* Name */}
          <h3 className="font-display font-semibold text-sm tracking-wide text-charcoal-900 line-clamp-2 leading-snug mb-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-3">
            <StarRating rating={product.rating} />
            <span className="text-xs font-mono text-steel-400">({product.reviews})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-lg tracking-wide text-charcoal-900">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-sm font-mono text-steel-400 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Shipping note */}
          <p className="text-xs font-mono text-steel-400 mt-1">
            Ships in {product.shippingDays} {product.shippingDays === 1 ? 'day' : 'days'}
          </p>
        </div>
      </Link>

      {/* ── Add to Cart ──────────────────────────── */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock || adding}
          className={`w-full py-2.5 rounded-lg text-sm font-display font-bold tracking-widest uppercase transition-all duration-200
            ${product.inStock
              ? adding
                ? 'bg-amber-400 text-charcoal-900 scale-95'
                : 'bg-charcoal-900 text-cream-100 hover:bg-charcoal-800 active:scale-95'
              : 'bg-cream-200 text-steel-400 cursor-not-allowed'
            }`}
        >
          {adding ? '✓ Added!' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  );
}

// ─── StarRating ──────────────────────────────────────────────────
export function StarRating({ rating, size = 'sm' }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const s = size === 'lg' ? 'text-base' : 'text-xs';

  return (
    <div className={`flex items-center gap-0.5 ${s}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < full;
        const halfFilled = !filled && i === full && half;
        return (
          <span
            key={i}
            className={filled || halfFilled ? 'text-amber-400' : 'text-cream-300'}
          >
            {halfFilled ? '½' : '★'}
          </span>
        );
      })}
    </div>
  );
}

// ─── HeartIcon ───────────────────────────────────────────────────
function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
