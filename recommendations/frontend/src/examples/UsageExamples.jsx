/**
 * frontend/src/examples/UsageExamples.jsx
 * ─────────────────────────────────────────────────────────────────
 * Concrete usage examples for every recommendation context.
 * Copy these patterns into your actual pages.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RecommendationWidget from '../components/RecommendationWidget';
import {
  useViewHistory,
  usePopularProducts,
  useVehicleRecommendations,
  useSimilarProducts,
  useRecommendations,
} from '../hooks/useRecommendations';
import { fetchBatch, invalidateClientCache } from '../api/recommendationsApi';


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 1: Home Page
// Shows popular products + vehicle section once brand is selected.
// ─────────────────────────────────────────────────────────────────
export function HomePageExample({ selectedVehicle }) {
  const navigate = useNavigate();

  // Always-visible popular section
  const popular = usePopularProducts({ limit: 8 });

  // Shown only when the user has set their car
  const vehicleRecs = useVehicleRecommendations(selectedVehicle, { limit: 8 });

  function handleProductClick(product) {
    navigate(`/product/${product.id}`);
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>

      {/* Vehicle-targeted section — appears only when car is selected */}
      {selectedVehicle?.brand && (
        <RecommendationWidget
          title={`Parts for Your ${selectedVehicle.brand}`}
          products={vehicleRecs.products}
          loading={vehicleRecs.loading}
          error={vehicleRecs.error}
          vehicle={selectedVehicle}
          onProductClick={handleProductClick}
          columns={4}
        />
      )}

      {/* Popular / trending section — always shown */}
      <RecommendationWidget
        title="Trending This Week"
        products={popular.products}
        loading={popular.loading}
        error={popular.error}
        onProductClick={handleProductClick}
        columns={4}
        skeletonCount={8}
      />

    </main>
  );
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 2: Product Detail Page
// Tracks the view, then loads "similar" and "customers also bought".
// ─────────────────────────────────────────────────────────────────
export function ProductDetailPageExample({ product }) {
  const navigate = useNavigate();

  // ── Track that the user viewed this product ────────────────────
  const { viewedIds, trackView } = useViewHistory();

  useEffect(() => {
    if (product?.id) trackView(product.id);
  }, [product?.id, trackView]);

  // ── Similar products ──────────────────────────────────────────
  const similar = useSimilarProducts(product?.id, { viewedIds, limit: 6 });

  // ── "Customers also bought" — co-purchase driven ──────────────
  const alsoBought = useRecommendations({
    viewedIds,
    strategy: 'personal',
    limit: 4,
    enabled: viewedIds.length > 0,
  });

  function handleProductClick(p) {
    navigate(`/product/${p.id}`);
  }

  return (
    <div>
      {/* ... product detail content ... */}

      {/* Similar products — same category, same vehicle compat */}
      <RecommendationWidget
        title="Similar Parts"
        products={similar.products}
        loading={similar.loading}
        error={similar.error}
        onProductClick={handleProductClick}
        columns={3}
        maxVisible={6}
      />

      {/* Co-purchase section */}
      <RecommendationWidget
        title="Customers Also Bought"
        products={alsoBought.products}
        loading={alsoBought.loading}
        error={alsoBought.error}
        onProductClick={handleProductClick}
        columns={4}
        maxVisible={4}
      />
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 3: Cart Page
// "You might have forgotten…" — show related to cart contents.
// ─────────────────────────────────────────────────────────────────
export function CartPageExample({ cartItems, vehicle }) {
  const navigate = useNavigate();

  // Use cart product IDs as "viewed" context
  const cartProductIds = cartItems.map(item => item.product.id);

  const recs = useRecommendations({
    viewedIds: cartProductIds,
    vehicle,
    strategy:  'personal',
    limit:     4,
    enabled:   cartProductIds.length > 0,
  });

  return (
    <div>
      {/* ... cart content ... */}

      <RecommendationWidget
        title="You Might Have Forgotten"
        products={recs.products}
        loading={recs.loading}
        error={recs.error}
        vehicle={vehicle}
        onProductClick={p => navigate(`/product/${p.id}`)}
        columns={4}
      />
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 4: Marketplace (full personalised sidebar section)
// Uses batch endpoint for efficient multi-widget loading.
// ─────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

export function MarketplacePageExample({ vehicle }) {
  const navigate = useNavigate();
  const { viewedIds } = useViewHistory();

  const [widgetData, setWidgetData]     = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetError, setWidgetError]   = useState(null);

  // Load 3 widget types in a single request using the batch endpoint
  const loadWidgets = useCallback(async () => {
    setWidgetLoading(true);
    setWidgetError(null);
    try {
      const response = await fetchBatch([
        // Widget 1: popular for the current category
        { type: 'popular',  limit: 4 },
        // Widget 2: vehicle-targeted (if car is selected)
        ...(vehicle?.brand ? [{ type: 'vehicle', ...vehicle, limit: 4 }] : []),
        // Widget 3: personalised based on history
        ...(viewedIds.length ? [{ type: 'personal', viewedIds, limit: 4 }] : []),
      ]);
      setWidgetData(response.results);
    } catch (err) {
      setWidgetError(err.message);
    } finally {
      setWidgetLoading(false);
    }
  }, [vehicle?.brand, vehicle?.model, vehicle?.year, viewedIds.join(',')]);

  useEffect(() => { loadWidgets(); }, [loadWidgets]);

  const handleClick = (product) => navigate(`/product/${product.id}`);

  if (widgetLoading) {
    return <RecommendationWidget title="Popular Parts" loading products={[]} columns={4} />;
  }

  return (
    <div>
      {widgetData?.[0]?.success && (
        <RecommendationWidget
          title="Popular Parts"
          products={widgetData[0].data}
          onProductClick={handleClick}
          columns={4}
        />
      )}

      {widgetData?.[1]?.success && vehicle?.brand && (
        <RecommendationWidget
          title={`For Your ${vehicle.brand}`}
          products={widgetData[1].data}
          vehicle={vehicle}
          onProductClick={handleClick}
          columns={4}
        />
      )}

      {widgetData?.[2]?.success && (
        <RecommendationWidget
          title="Based on Your Browsing"
          products={widgetData[2].data}
          onProductClick={handleClick}
          columns={4}
        />
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 5: After adding to cart — refresh recommendations
// ─────────────────────────────────────────────────────────────────
export function useCartRecommendationRefresh() {
  /**
   * Call this whenever the cart changes (add/remove item, checkout).
   * It clears the client-side recommendation cache so the next
   * component mount fetches fresh, context-aware results.
   */
  const refreshOnCartChange = useCallback((productId) => {
    // Invalidate all recommendation cache entries
    invalidateClientCache();

    // Optionally track the add-to-cart as an implicit view
    // (treated as strong signal: if you added it, recommend related)
    try {
      const history = JSON.parse(sessionStorage.getItem('ic_view_history') || '[]');
      const updated = [productId, ...history.filter(id => id !== productId)].slice(0, 20);
      sessionStorage.setItem('ic_view_history', JSON.stringify(updated));
    } catch {}
  }, []);

  return { refreshOnCartChange };
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 6: Direct API call (no React, e.g. SSR or plain JS)
// ─────────────────────────────────────────────────────────────────
export async function getRecommendationsSSR(vehicle, viewedIds = []) {
  /**
   * Server-side or non-React usage example.
   * Works with fetch() in Node.js (Node 18+ has native fetch).
   */
  const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

  const params = new URLSearchParams({
    strategy: 'personal',
    limit:    '10',
    ...(vehicle?.brand && { brand: vehicle.brand }),
    ...(vehicle?.model && { model: vehicle.model }),
    ...(vehicle?.year  && { year:  String(vehicle.year) }),
    ...(viewedIds.length && { viewedIds: viewedIds.join(',') }),
  });

  const res  = await fetch(`${BASE}/recommendations?${params}`);
  const data = await res.json();

  // data.data = array of { id, name, price, reason, score, ... }
  return data.data || [];
}


// ═════════════════════════════════════════════════════════════════
// EXAMPLE 7: Minimal inline integration (copy-paste ready)
// ─────────────────────────────────────────════════════════════════
export function MinimalExample() {
  const { products, loading, error } = usePopularProducts({ limit: 6 });

  if (loading) return <p>Loading recommendations…</p>;
  if (error)   return <p>Error: {error}</p>;

  return (
    <ul>
      {products.map(item => (
        <li key={item.id}>
          <strong>{item.name}</strong> — ${item.price} — <em>{item.reason}</em>
        </li>
      ))}
    </ul>
  );
}
