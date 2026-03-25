/**
 * frontend/src/hooks/useRecommendations.js
 * ─────────────────────────────────────────────────────────────────
 * React hooks that connect components to the recommendation API.
 *
 * Hooks exported:
 *  useRecommendations        — general-purpose, all strategies
 *  usePopularProducts        — trending/popular (no context)
 *  useVehicleRecommendations — parts for a specific car
 *  useSimilarProducts        — products similar to one item
 *  useViewHistory            — track + persist what the user has viewed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchPopular,
  fetchVehicleRecommendations,
  fetchSimilarProducts,
  fetchPersonalRecommendations,
  invalidateClientCache,
} from '../api/recommendationsApi';

// ── Shared state helpers ──────────────────────────────────────────
function useAsyncState(initialData = []) {
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [meta,    setMeta]    = useState(null);
  return { data, setData, loading, setLoading, error, setError, meta, setMeta };
}


// ═════════════════════════════════════════════════════════════════
// useViewHistory
// ─────────────────────────────────────────────────────────────────
// Persists the last N product IDs a user viewed to sessionStorage.
// Feed its return value directly into recommendation hooks for context.
//
// Usage:
//   const { viewedIds, trackView } = useViewHistory();
//   // On product detail page mount:
//   useEffect(() => trackView(product.id), [product.id]);
// ═════════════════════════════════════════════════════════════════

const HISTORY_KEY   = 'ic_view_history';
const HISTORY_LIMIT = 20;

export function useViewHistory() {
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  });

  const trackView = useCallback((productId) => {
    if (!productId) return;
    setViewedIds(prev => {
      // De-duplicate and prepend (most-recent first)
      const next = [productId, ...prev.filter(id => id !== productId)]
        .slice(0, HISTORY_LIMIT);
      try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setViewedIds([]);
    try { sessionStorage.removeItem(HISTORY_KEY); } catch {}
    invalidateClientCache(); // clear recommendations too
  }, []);

  return { viewedIds, trackView, clearHistory };
}


// ═════════════════════════════════════════════════════════════════
// usePopularProducts
// ─────────────────────────────────────────────────────────────────
// Fetches trending/highly-rated products. No user context needed.
//
// @param {object} options
// @param {number} options.limit       Max products (default 10)
// @param {string} options.categoryId  Filter to a category (optional)
// @param {boolean} options.enabled    Set false to defer fetching
// ═════════════════════════════════════════════════════════════════

export function usePopularProducts({ limit = 10, categoryId = null, enabled = true } = {}) {
  const state = useAsyncState([]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    state.setLoading(true);
    state.setError(null);

    fetchPopular({ limit, categoryId, signal: controller.signal })
      .then(res => {
        state.setData(res.data || []);
        state.setMeta(res.meta || null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') state.setError(err.message);
      })
      .finally(() => state.setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, categoryId, enabled]);

  return {
    products: state.data,
    loading:  state.loading,
    error:    state.error,
    meta:     state.meta,
  };
}


// ═════════════════════════════════════════════════════════════════
// useVehicleRecommendations
// ─────────────────────────────────────────────────────────────────
// Parts confirmed compatible with a specific car.
//
// @param {object} vehicle   { brand, model, year }
// @param {object} options
// @param {number} options.limit
// @param {string} options.categoryId
// ═════════════════════════════════════════════════════════════════

export function useVehicleRecommendations(vehicle, { limit = 10, categoryId = null } = {}) {
  const state   = useAsyncState([]);
  const enabled = !!vehicle?.brand;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    state.setLoading(true);
    state.setError(null);

    fetchVehicleRecommendations({
      brand: vehicle.brand,
      model: vehicle.model,
      year:  vehicle.year,
      limit,
      categoryId,
      signal: controller.signal,
    })
      .then(res => {
        state.setData(res.data || []);
        state.setMeta(res.meta || null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') state.setError(err.message);
      })
      .finally(() => state.setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.brand, vehicle?.model, vehicle?.year, limit, categoryId]);

  return {
    products:      state.data,
    loading:       state.loading,
    error:         state.error,
    vehicleUsed:   state.meta?.vehicle || null,
  };
}


// ═════════════════════════════════════════════════════════════════
// useSimilarProducts
// ─────────────────────────────────────────────────────────────────
// Products similar to a given item (product detail page).
//
// @param {string}   productId   The pivot product
// @param {string[]} viewedIds   Recent history for context
// @param {number}   limit
// ═════════════════════════════════════════════════════════════════

export function useSimilarProducts(productId, { viewedIds = [], limit = 6 } = {}) {
  const state = useAsyncState([]);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    state.setLoading(true);
    state.setError(null);

    fetchSimilarProducts({ productId, viewedIds, limit, signal: controller.signal })
      .then(res => {
        state.setData(res.data || []);
        state.setMeta(res.meta || null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') state.setError(err.message);
      })
      .finally(() => state.setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, limit]);

  return {
    products: state.data,
    loading:  state.loading,
    error:    state.error,
  };
}


// ═════════════════════════════════════════════════════════════════
// useRecommendations
// ─────────────────────────────────────────────────────────────────
// Full personalised ranking blending all signals.
// The most powerful hook — use when you have both vehicle + history.
//
// @param {object} options
// @param {string[]} options.viewedIds  Recent view history
// @param {object}   options.vehicle    { brand, model, year }
// @param {string}   options.strategy   'personal'|'vehicle'|'popular'|'similar'
// @param {number}   options.limit
// @param {boolean}  options.enabled
// ═════════════════════════════════════════════════════════════════

export function useRecommendations({
  viewedIds   = [],
  vehicle     = null,
  strategy    = 'personal',
  limit       = 10,
  categoryId  = null,
  enabled     = true,
} = {}) {
  const state = useAsyncState([]);

  // Track refetch key to avoid stale closures
  const contextKey = [
    strategy, limit, categoryId,
    vehicle?.brand, vehicle?.model, vehicle?.year,
    viewedIds.slice(0, 5).join(','),
  ].join('|');

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    state.setLoading(true);
    state.setError(null);

    fetchPersonalRecommendations({
      viewedIds, vehicle, strategy, limit, categoryId,
      signal: controller.signal,
    })
      .then(res => {
        state.setData(res.data || []);
        state.setMeta(res.meta || null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') state.setError(err.message);
      })
      .finally(() => state.setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, enabled]);

  return {
    products:  state.data,
    loading:   state.loading,
    error:     state.error,
    meta:      state.meta,
  };
}
