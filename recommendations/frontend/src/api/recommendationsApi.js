/**
 * src/api/recommendationsApi.js
 * ─────────────────────────────────────────────────────────────────
 * Frontend API client for the recommendation service.
 *
 * Features:
 *  - Typed request/response contracts
 *  - Deduplicates in-flight requests (same URL = one fetch)
 *  - Client-side cache with TTL (avoids repeat calls on re-renders)
 *  - Exponential backoff retry on 5xx errors
 *  - AbortController support for cleanup
 *  - Batch helper: load multiple widget types in one round-trip
 */

// ── Config ────────────────────────────────────────────────────────
const BASE_URL = import.meta.env?.VITE_API_URL
              || process.env.REACT_APP_API_URL
              || 'http://localhost:4000/api/v1';

const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000;  // 2 minutes
const MAX_RETRIES          = 2;
const RETRY_BASE_DELAY_MS  = 400;

// ── In-flight deduplication ───────────────────────────────────────
const inFlight = new Map(); // key → Promise

// ── Client-side TTL cache ─────────────────────────────────────────
const clientCache = new Map(); // key → { data, expiresAt }

function cacheGet(key) {
  const entry = clientCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { clientCache.delete(key); return null; }
  clientCache.delete(key);
  clientCache.set(key, entry); // LRU: move to end
  return entry.data;
}

function cacheSet(key, data, ttl = CLIENT_CACHE_TTL_MS) {
  if (clientCache.size >= 200) clientCache.delete(clientCache.keys().next().value);
  clientCache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ── Core fetch with retry ─────────────────────────────────────────
async function apiFetch(url, options = {}, attempt = 0) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    // Retry on server errors with exponential backoff
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await new Promise(r => setTimeout(r, delay));
      return apiFetch(url, options, attempt + 1);
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message || `HTTP ${res.status}`), {
      status: res.status, body: err,
    });
  }

  return res.json();
}

// ── Deduplicated GET ──────────────────────────────────────────────
function deduplicatedGet(url, signal) {
  if (inFlight.has(url)) return inFlight.get(url);
  const promise = apiFetch(url, { signal }).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  return promise;
}

// ── URL builders ──────────────────────────────────────────────────
function buildQueryString(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  return new URLSearchParams(clean).toString();
}


// ═════════════════════════════════════════════════════════════════
// PUBLIC API FUNCTIONS
// ═════════════════════════════════════════════════════════════════

/**
 * fetchPopular({ limit, categoryId, signal })
 *
 * Get top-selling, highly-rated products.
 * No user context required — good for homepage sections.
 *
 * @returns {Promise<RecommendationResponse>}
 */
export async function fetchPopular({ limit = 10, categoryId = null, signal } = {}) {
  const qs  = buildQueryString({ limit, ...(categoryId && { categoryId }) });
  const url = `${BASE_URL}/recommendations/popular?${qs}`;
  const key = url;

  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await deduplicatedGet(url, signal);
  cacheSet(key, data);
  return data;
}

/**
 * fetchVehicleRecommendations({ brand, model, year, limit, categoryId, signal })
 *
 * Products that fit the user's specific car.
 * Used in the "Parts for your BMW" section.
 *
 * @param {string}  brand   Required. e.g. "BMW"
 * @param {string}  [model] e.g. "3 Series"
 * @param {number}  [year]  e.g. 2021
 * @returns {Promise<RecommendationResponse>}
 */
export async function fetchVehicleRecommendations({
  brand, model = null, year = null, limit = 10, categoryId = null, signal,
} = {}) {
  if (!brand) throw new Error('brand is required');

  const qs  = buildQueryString({ brand, model, year, limit, categoryId });
  const url = `${BASE_URL}/recommendations/vehicle?${qs}`;
  const key = url;

  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await deduplicatedGet(url, signal);
  cacheSet(key, data);
  return data;
}

/**
 * fetchSimilarProducts({ productId, viewedIds, limit, signal })
 *
 * Products similar to a given item.
 * Used on the product detail page.
 *
 * @param {string}   productId  The pivot product
 * @param {string[]} viewedIds  Recent view history for context
 */
export async function fetchSimilarProducts({
  productId, viewedIds = [], limit = 6, signal,
} = {}) {
  if (!productId) throw new Error('productId is required');

  const qs  = buildQueryString({
    limit,
    ...(viewedIds.length && { viewedIds: viewedIds.join(',') }),
  });
  const url = `${BASE_URL}/recommendations/similar/${productId}?${qs}`;
  const key = url;

  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await deduplicatedGet(url, signal);
  cacheSet(key, data);
  return data;
}

/**
 * fetchPersonalRecommendations({ viewedIds, vehicle, strategy, limit, signal })
 *
 * Full personalised ranking blending all signals.
 *
 * @param {string[]} viewedIds  Product IDs viewed recently (most-recent first)
 * @param {object}   vehicle    { brand, model, year }
 * @param {string}   strategy   'personal' | 'vehicle' | 'popular' | 'similar'
 */
export async function fetchPersonalRecommendations({
  viewedIds = [], vehicle = null, strategy = 'personal',
  limit = 10, categoryId = null, signal,
} = {}) {
  const params = {
    strategy,
    limit,
    ...(vehicle?.brand && {
      brand: vehicle.brand,
      model: vehicle.model || undefined,
      year:  vehicle.year  || undefined,
    }),
    ...(viewedIds.length && { viewedIds: viewedIds.join(',') }),
    ...(categoryId && { categoryId }),
  };

  const qs  = buildQueryString(params);
  const url = `${BASE_URL}/recommendations?${qs}`;
  const key = url;

  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await deduplicatedGet(url, signal);
  cacheSet(key, data);
  return data;
}

/**
 * fetchBatch(requests)
 *
 * Load multiple recommendation widget types in ONE network round-trip.
 * Use this on pages that need several sections at once.
 *
 * @param {BatchRequest[]} requests  Up to 5 items
 * @returns {Promise<BatchResponse>}
 *
 * @example
 * const { results } = await fetchBatch([
 *   { type: 'popular',  limit: 6 },
 *   { type: 'vehicle',  brand: 'BMW', model: '3 Series', year: 2021, limit: 6 },
 *   { type: 'similar',  pivotProductId: 'p001', limit: 4 },
 * ]);
 * const popular = results[0].data;
 * const vehicle = results[1].data;
 * const similar = results[2].data;
 */
export async function fetchBatch(requests, signal) {
  const key = `batch:${JSON.stringify(requests)}`;

  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await apiFetch(`${BASE_URL}/recommendations/batch`, {
    method:  'POST',
    body:    JSON.stringify({ requests }),
    signal,
  });

  cacheSet(key, data);
  return data;
}

/**
 * invalidateClientCache()
 * Call after the user adds to cart, changes vehicle, or logs in
 * so stale personalised recommendations are cleared.
 */
export function invalidateClientCache(prefix = null) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(prefix)) clientCache.delete(key);
  }
}

/**
 * getClientCacheStats()
 * Exposed for dev tools / debugging.
 */
export function getClientCacheStats() {
  return {
    size: clientCache.size,
    inFlight: inFlight.size,
    entries: [...clientCache.entries()].map(([k, v]) => ({
      key: k.replace(BASE_URL, ''),
      ttlRemaining: Math.max(0, Math.floor((v.expiresAt - Date.now()) / 1000)),
    })),
  };
}
