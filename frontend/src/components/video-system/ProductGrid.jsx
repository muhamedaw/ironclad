/**
 * components/ProductGrid.jsx
 *
 * A product grid that dynamically injects YouTube video cards.
 *
 * Injection rules:
 *  - First video appears after items [4, 5, or 6] (randomised per session)
 *  - Subsequent videos repeat every 4–6 items (new random interval each time)
 *  - Never two videos in a row
 *  - If brand/model filter changes, the video set refreshes
 *  - Videos are fetched once per unique brand+model pair (cached)
 */

import { useMemo, useState, useCallback } from 'react';
import VideoCard from './VideoCard';
import { useVideoSearch } from '../hooks/useVideoSearch';

// ── Seeded interval generator ─────────────────────────────────────
/**
 * Returns an infinite sequence of injection intervals in the range [min, max].
 * Pre-computed on component mount for a stable, deterministic layout.
 */
function generateInjectionSchedule(count = 20, min = 4, max = 6) {
  return Array.from({ length: count }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  );
}

/**
 * interleave(items, videos, schedule)
 *
 * Takes a flat list of product items and inserts video slots at the
 * intervals defined by `schedule`. Returns a unified array of
 * { type: 'product' | 'video', data, key } objects for rendering.
 */
function interleave(items, videos, schedule) {
  const result = [];
  let productIdx = 0;
  let videoIdx   = 0;
  let scheduleIdx = 0;
  let nextInjection = schedule[0] ?? 5;

  for (let i = 0; i < items.length; i++) {
    result.push({ type: 'product', data: items[i], key: `product-${items[i]?.id ?? i}` });
    productIdx++;

    // Check if we should inject a video after this product
    if (
      productIdx >= nextInjection &&
      videoIdx < videos.length &&
      // Never inject if the previous item was already a video
      result[result.length - 2]?.type !== 'video'
    ) {
      result.push({
        type: 'video',
        data: videos[videoIdx],
        key:  `video-${videos[videoIdx]?.videoId}-${videoIdx}`,
      });
      videoIdx++;
      scheduleIdx++;
      // Reset counter and pick the next interval
      productIdx    = 0;
      nextInjection = schedule[scheduleIdx] ?? schedule[schedule.length - 1] ?? 5;
    }
  }

  return result;
}

// ── Props-level video slot skeleton ──────────────────────────────
function VideoSkeleton() {
  return (
    <div style={{
      gridColumn: 'span 2',
      background: '#111114',
      border: '1px solid #222228',
      borderRadius: 12,
      overflow: 'hidden',
      aspectRatio: '16/9',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, #1a1a1e 25%, #222228 50%, #1a1a1e 75%)',
        backgroundSize: '400% 100%',
        animation: 'shimmer 1.6s infinite',
      }} />
    </div>
  );
}

// ── ProductCard placeholder (replace with your real ProductCard) ──
function ProductCardPlaceholder({ product }) {
  return (
    <div style={{
      background: '#111114',
      border: '1px solid #222228',
      borderRadius: 12,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a48'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#222228'}
    >
      <div style={{
        aspectRatio: '4/3',
        background: '#0f0f12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={product?.image || `https://placehold.co/400x300/111114/E85C2F?text=${encodeURIComponent(product?.name?.split(' ')[0] || 'Part')}`}
          alt={product?.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: '#e85c2f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {product?.brand}
        </p>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#d4d3de', lineHeight: 1.4 }}>
          {product?.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f0efe8' }}>${product?.price?.toFixed(2)}</span>
          {product?.originalPrice && (
            <span style={{ fontSize: 12, color: '#7a7a8a', textDecoration: 'line-through' }}>${product?.originalPrice?.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <button style={{
          width: '100%',
          padding: '8px',
          background: '#1c1c20',
          border: '1px solid #222228',
          borderRadius: 8,
          color: '#aeadb8',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          transition: 'background 0.2s, color 0.2s',
        }}
          onMouseEnter={e => { e.target.style.background = '#e85c2f'; e.target.style.color = '#fff'; }}
          onMouseLeave={e => { e.target.style.background = '#1c1c20'; e.target.style.color = '#aeadb8'; }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

// ── Main ProductGrid ──────────────────────────────────────────────

/**
 * ProductGrid
 *
 * @param {object[]} products      Array of product objects
 * @param {string}   brand         Current filter: brand name (e.g. "BMW")
 * @param {string}   model         Current filter: model name (e.g. "3 Series")
 * @param {boolean}  autoPlayVideos If true, first injected video autoplays muted
 * @param {number}   columns       Grid columns (default 4)
 * @param {React.Component} ProductCard  Custom product card component (optional)
 */
export default function ProductGrid({
  products    = [],
  brand       = '',
  model       = '',
  autoPlayVideos = false,
  columns     = 4,
  ProductCard: ProductCardComponent = ProductCardPlaceholder,
}) {
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Stable injection schedule for this component instance
  const schedule = useMemo(() => generateInjectionSchedule(30, 4, 6), []);

  // Build a query suffix based on the product category if possible
  const querySuffix = useMemo(() => {
    const categories = [...new Set(products.map(p => p?.category).filter(Boolean))];
    const catHint = categories[0] ? `${categories[0]} repair` : 'repair tutorial how to fix';
    return catHint;
  }, [products]);

  // Fetch videos for the current brand+model combination
  const { videos, loading: videosLoading } = useVideoSearch(brand, model, {
    maxResults:  8,
    enabled:     products.length > 0,
    querySuffix,
  });

  // Build the interleaved list
  const gridItems = useMemo(
    () => interleave(products, videos, schedule),
    [products, videos, schedule]
  );

  const handleVideoPlay = useCallback((video) => {
    setPlayingVideoId(video.videoId);
  }, []);

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#7a7a8a' }}>
        <p style={{ fontSize: 14 }}>No parts found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 16,
      }}
    >
      {gridItems.map((item, idx) => {
        if (item.type === 'video') {
          if (videosLoading && !item.data) return <VideoSkeleton key={item.key} />;
          if (!item.data) return null;

          return (
            <VideoCard
              key={item.key}
              video={item.data}
              autoPlay={autoPlayVideos && idx === gridItems.findIndex(i => i.type === 'video')}
              onPlay={handleVideoPlay}
            />
          );
        }

        return (
          <ProductCardComponent
            key={item.key}
            product={item.data}
          />
        );
      })}
    </div>
  );
}
