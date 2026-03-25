/**
 * frontend/src/components/RecommendationWidget.jsx
 * ─────────────────────────────────────────────────────────────────
 * Drop-in recommendation section component.
 *
 * Handles all states: loading skeletons, empty, error, and success.
 * Each card shows a "reason badge" explaining why it was recommended.
 *
 * Props:
 *  title        Section heading
 *  products     Array of recommendation items from the API
 *  loading      Boolean loading state
 *  error        Error string (or null)
 *  vehicle      Optional vehicle context to show in header
 *  onProductClick  Callback(product) when a card is clicked
 *  columns      Grid columns (default 4)
 *  maxVisible   Show fewer items (default all)
 *  showScore    Dev mode: show raw score on each card
 */

import { useState } from 'react';

// ── Colour map for reason badges ──────────────────────────────────
const REASON_STYLE = {
  'Perfect fit':         { bg: 'rgba(46,204,113,.15)',  text: '#2ecc71',  border: 'rgba(46,204,113,.3)'  },
  'Compatible':          { bg: 'rgba(46,204,113,.1)',   text: '#27ae60',  border: 'rgba(46,204,113,.25)' },
  'Frequently bought':   { bg: 'rgba(201,168,76,.15)',  text: '#c9a84c',  border: 'rgba(201,168,76,.3)'  },
  'Matches your':        { bg: 'rgba(52,152,219,.15)',  text: '#3498db',  border: 'rgba(52,152,219,.3)'  },
  'Trending':            { bg: 'rgba(232,92,47,.15)',   text: '#e85c2f',  border: 'rgba(232,92,47,.3)'   },
  'Top-rated':           { bg: 'rgba(201,168,76,.15)',  text: '#c9a84c',  border: 'rgba(201,168,76,.3)'  },
  'Just arrived':        { bg: 'rgba(155,89,182,.15)',  text: '#9b59b6',  border: 'rgba(155,89,182,.3)'  },
  'Similar price':       { bg: 'rgba(52,73,94,.2)',     text: '#aeadb8',  border: 'rgba(255,255,255,.1)' },
  default:               { bg: 'rgba(255,255,255,.06)', text: '#aeadb8',  border: 'rgba(255,255,255,.1)' },
};

function getReasonStyle(reason = '') {
  const key = Object.keys(REASON_STYLE).find(k => reason.startsWith(k));
  return REASON_STYLE[key] || REASON_STYLE.default;
}

// ── Sub-components ────────────────────────────────────────────────

function ReasonBadge({ reason }) {
  if (!reason) return null;
  const s = getReasonStyle(reason);
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '2px 7px',
      borderRadius: 4,
      background: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
    }}>
      {reason}
    </span>
  );
}

function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(100, (score / max) * 100);
  const hue = Math.round((pct / 100) * 120); // red → green
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: `hsl(${hue},70%,55%)`,
        borderRadius: 2,
        transition: 'width .5s ease',
      }} />
    </div>
  );
}

function ProductCardSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, #1a1a1e 25%, #222228 50%, #1a1a1e 75%)',
    backgroundSize: '400% 100%',
    animation: 'shimmer 1.6s infinite',
    borderRadius: 6,
  };
  return (
    <div style={{
      background: '#111114', border: '1px solid #222228', borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{ aspectRatio: '4/3', ...shimmer }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 10, width: '35%', ...shimmer }} />
        <div style={{ height: 13, width: '85%', ...shimmer }} />
        <div style={{ height: 13, width: '60%', ...shimmer }} />
        <div style={{ height: 18, width: '40%', ...shimmer }} />
        <div style={{ height: 20, width: '55%', ...shimmer }} />
      </div>
    </div>
  );
}

function ProductCard({ item, onClick, showScore }) {
  const { product, reason, score } = item;
  const [hover, setHover] = useState(false);
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(product)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick?.(product)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#111114',
        border: `1px solid ${hover ? '#3a3a48' : '#222228'}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'border-color .2s, transform .22s cubic-bezier(.34,1.56,.64,1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0f0f12', overflow: 'hidden' }}>
        <img
          src={product.image || `https://placehold.co/400x300/111114/E85C2F?text=${encodeURIComponent(product.name?.split(' ')[0] || 'Part')}`}
          alt={product.name}
          loading="lazy"
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform .3s ease',
          }}
        />
        {discount && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(232,92,47,.9)', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          }}>
            −{discount}%
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '11px 13px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 10, color: '#e85c2f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {product.brand}
        </span>

        <h4 style={{
          margin: 0, fontSize: 12, fontWeight: 600, color: '#d4d3de', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </h4>

        {/* Rating */}
        {product.ratingAvg > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#c9a84c', fontSize: 11, letterSpacing: 1 }}>
              {'★'.repeat(Math.floor(product.ratingAvg))}{'☆'.repeat(5 - Math.floor(product.ratingAvg))}
            </span>
            <span style={{ fontSize: 10, color: '#7a7a8a', fontFamily: 'monospace' }}>
              ({product.ratingCount})
            </span>
          </div>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f0efe8' }}>
            ${Number(product.price).toFixed(2)}
          </span>
          {product.originalPrice && (
            <span style={{ fontSize: 11, color: '#7a7a8a', textDecoration: 'line-through' }}>
              ${Number(product.originalPrice).toFixed(2)}
            </span>
          )}
        </div>

        {/* Reason badge */}
        <div style={{ marginTop: 3 }}>
          <ReasonBadge reason={reason} />
        </div>

        {/* Dev score bar */}
        {showScore && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7a7a8a', fontFamily: 'monospace', marginTop: 4 }}>
              <span>score</span><span>{score}</span>
            </div>
            <ScoreBar score={score} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton grid ─────────────────────────────────────────────────
function SkeletonGrid({ count = 4, columns = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12 }}>
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════
// RecommendationWidget  (main export)
// ═════════════════════════════════════════════════════════════════

export default function RecommendationWidget({
  title       = 'Recommended for You',
  products    = [],
  loading     = false,
  error       = null,
  vehicle     = null,
  onProductClick,
  columns     = 4,
  maxVisible  = undefined,
  showScore   = false,
  skeletonCount = 4,
  emptyMessage = 'No recommendations available right now.',
  className   = '',
}) {
  const visible = maxVisible ? products.slice(0, maxVisible) : products;

  // Don't render anything if no data and not loading
  if (!loading && !error && visible.length === 0) return null;

  return (
    <section
      className={className}
      style={{ marginBottom: 32 }}
      aria-label={title}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#f0efe8',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {title}
          </h2>

          {/* Vehicle context pill */}
          {vehicle?.brand && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(232,92,47,.1)', border: '1px solid rgba(232,92,47,.2)',
                fontSize: 11, color: '#e85c2f', fontWeight: 600,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#e85c2f',
                  display: 'inline-block',
                }} />
                {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
              </span>
              {!loading && visible.length > 0 && (
                <span style={{ fontSize: 11, color: '#7a7a8a', fontFamily: 'monospace' }}>
                  {visible.length} part{visible.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          )}
        </div>

        {/* Score legend in dev mode */}
        {showScore && !loading && (
          <span style={{ fontSize: 10, color: '#7a7a8a', fontFamily: 'monospace', paddingBottom: 2 }}>
            score / 100
          </span>
        )}
      </div>

      {/* States */}
      {loading && <SkeletonGrid count={skeletonCount} columns={columns} />}

      {!loading && error && (
        <div style={{
          padding: '20px 16px',
          background: 'rgba(231,76,60,.08)',
          border: '1px solid rgba(231,76,60,.2)',
          borderRadius: 10,
          color: '#e74c3c',
          fontSize: 13,
          fontFamily: 'monospace',
        }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p style={{ color: '#7a7a8a', fontSize: 13, fontFamily: 'monospace', padding: '20px 0' }}>
          {emptyMessage}
        </p>
      )}

      {!loading && !error && visible.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 12,
        }}>
          {visible.map(item => (
            <ProductCard
              key={item.id || item.product?.id}
              item={item}
              onClick={onProductClick}
              showScore={showScore}
            />
          ))}
        </div>
      )}
    </section>
  );
}
