/**
 * services/recommendation.service.js
 * ─────────────────────────────────────────────────────────────────
 * Orchestration layer between the HTTP routes and the scoring engine.
 *
 * Responsibilities:
 *  1. Load product candidates from the repository
 *  2. Load the co-purchase affinity matrix (with long-lived cache)
 *  3. Enrich context (parse vehicle, load user view history)
 *  4. Call scorer.scoreProducts() with the right strategy
 *  5. Apply diversity filter
 *  6. Cache results and return
 */

'use strict';

const { scoreProducts, diversify, buildAffinityMatrix, strategies } = require('../engine/scorer');
const { recommendationCache, affinityCache, productDataCache, buildRecommendationKey } = require('../engine/cache');
const productRepository = require('./product.repository');
const logger = require('../utils/logger');

// Affinity matrix is rebuilt on a schedule (every hour) or on demand
let _affinityMatrix = {};
let _affinityBuiltAt = 0;
const AFFINITY_REBUILD_MS = 60 * 60 * 1000; // 1 hour


// ── Affinity matrix management ────────────────────────────────────

async function getAffinityMatrix() {
  const cacheKey = 'global_affinity';
  const cached   = affinityCache.get(cacheKey);
  if (cached) return cached;

  const now = Date.now();
  if (_affinityMatrix && now - _affinityBuiltAt < AFFINITY_REBUILD_MS) {
    return _affinityMatrix;
  }

  try {
    logger.info('[RecommendationService] Rebuilding affinity matrix…');
    const orderItems  = await productRepository.getRecentOrderItems(90); // last 90 days
    _affinityMatrix   = buildAffinityMatrix(orderItems);
    _affinityBuiltAt  = now;
    affinityCache.set(cacheKey, _affinityMatrix);
    logger.info(`[RecommendationService] Affinity matrix built: ${Object.keys(_affinityMatrix).length} products`);
  } catch (err) {
    logger.error(`[RecommendationService] Affinity matrix build failed: ${err.message}`);
  }

  return _affinityMatrix;
}


// ── Main recommendation function ──────────────────────────────────

/**
 * getRecommendations(request)
 *
 * @param {object}   request
 * @param {string}   request.userId           Authenticated user ID (optional)
 * @param {string[]} request.viewedProductIds Recently viewed product IDs (most-recent first)
 * @param {object}   request.vehicle          { brand, model, year }
 * @param {string}   request.strategy         'personal'|'vehicle'|'popular'|'similar'
 * @param {string}   request.pivotProductId   For 'similar' strategy
 * @param {string}   request.categoryId       Restrict to a category
 * @param {number}   request.limit            Max results (default 10)
 * @param {boolean}  request.diversify        Apply diversity filter (default true)
 * @param {boolean}  request.explain          Include signal breakdown (default false)
 * @param {boolean}  request.noCache          Skip cache lookup (default false)
 *
 * @returns {Promise<RecommendationResult>}
 */
async function getRecommendations(request = {}) {
  const {
    userId          = null,
    viewedProductIds = [],
    vehicle          = null,
    strategy         = 'personal',
    pivotProductId   = null,
    categoryId       = null,
    limit            = 10,
    applyDiversity   = true,
    explain          = false,
    noCache          = false,
  } = request;

  const startMs = Date.now();

  // ── 1. Build cache key and check cache ─────────────────────────
  const cacheKey = buildRecommendationKey({ ...request, strategy, limit });

  if (!noCache) {
    const cached = recommendationCache.get(cacheKey);
    if (cached) {
      logger.debug(`[RecommendationService] Cache HIT: ${cacheKey}`);
      return { ...cached, fromCache: true, latencyMs: Date.now() - startMs };
    }
  }

  // ── 2. Load candidates ─────────────────────────────────────────
  const candidateFilter = {
    isActive:   true,
    categoryId: categoryId || undefined,
    limit:      500, // hard cap — don't score everything
  };

  let candidates;
  const productCacheKey = `candidates:${JSON.stringify(candidateFilter)}`;
  candidates = productDataCache.get(productCacheKey);
  if (!candidates) {
    candidates = await productRepository.getCandidateProducts(candidateFilter);
    productDataCache.set(productCacheKey, candidates);
  }

  if (!candidates?.length) {
    return { items: [], total: 0, latencyMs: Date.now() - startMs };
  }

  // ── 3. Load pivot product if needed ───────────────────────────
  let pivotProduct = null;
  if (strategy === 'similar' && pivotProductId) {
    pivotProduct = candidates.find(p => p.id === pivotProductId)
      || await productRepository.getProductById(pivotProductId);
  }

  // ── 4. Load co-purchase affinity matrix ───────────────────────
  const affinityMatrix = await getAffinityMatrix();

  // ── 5. Score ──────────────────────────────────────────────────
  const stratFn = strategies[strategy] || strategies.personal;
  const context = {
    viewedProductIds,
    vehicle,
    affinityMatrix,
    pivotProduct,
    maxResults: Math.min(limit * 3, 60), // over-fetch for diversity filter
  };

  let scoredItems = stratFn(candidates, context);

  // ── 6. Apply diversity filter ──────────────────────────────────
  if (applyDiversity && scoredItems.length > limit) {
    scoredItems = diversify(scoredItems, Math.ceil(limit / 3));
  }

  // ── 7. Trim to requested limit ─────────────────────────────────
  const items = scoredItems.slice(0, limit).map(si => ({
    product:  si.product,
    score:    si.score,
    reason:   buildReason(si.signals, vehicle),          // human-readable reason
    ...(explain && { signals: si.signals }),              // debug breakdown
  }));

  const result = {
    items,
    total:      items.length,
    strategy,
    context: {
      vehicleProvided:    !!vehicle?.brand,
      viewedCount:        viewedProductIds.length,
      candidatePool:      candidates.length,
    },
    latencyMs: Date.now() - startMs,
    fromCache: false,
  };

  // ── 8. Cache result ────────────────────────────────────────────
  if (!noCache) {
    recommendationCache.set(cacheKey, result);
  }

  logger.info(
    `[RecommendationService] ${strategy} → ${items.length} items in ${result.latencyMs}ms ` +
    `(pool: ${candidates.length}, cache: ${noCache ? 'bypass' : 'miss'})`
  );

  return result;
}


// ── Popular products (no context needed) ──────────────────────────

async function getPopularProducts({ limit = 10, categoryId = null, noCache = false } = {}) {
  return getRecommendations({
    strategy:   'popular',
    categoryId,
    limit,
    noCache,
    applyDiversity: true,
  });
}


// ── Similar products (product detail page) ────────────────────────

async function getSimilarProducts(pivotProductId, { limit = 6, viewedProductIds = [] } = {}) {
  return getRecommendations({
    strategy:        'similar',
    pivotProductId,
    viewedProductIds,
    limit,
    applyDiversity: false,
  });
}


// ── Vehicle-targeted recommendations ─────────────────────────────

async function getVehicleRecommendations(vehicle, { limit = 10, categoryId = null } = {}) {
  if (!vehicle?.brand) throw new Error('Vehicle brand is required');
  return getRecommendations({
    strategy:   'vehicle',
    vehicle,
    categoryId,
    limit,
    applyDiversity: true,
  });
}


// ── Reason builder (explainability) ──────────────────────────────

/**
 * buildReason — produces a short, user-facing explanation of why
 * this product was recommended.
 */
function buildReason(signals, vehicle) {
  if (!signals) return 'Popular choice';

  if (signals.vehicleCompat >= 0.9)
    return `Perfect fit for your ${vehicle?.brand || 'vehicle'}`;

  if (signals.vehicleCompat >= 0.4)
    return `Compatible with ${vehicle?.brand || 'your vehicle'}`;

  if (signals.coPurchase >= 0.6)
    return 'Frequently bought together';

  if (signals.categoryMatch >= 0.9)
    return 'Matches your browsing history';

  if (signals.trending >= 0.7)
    return 'Trending this week';

  if (signals.rating >= 0.8)
    return 'Top-rated by customers';

  if (signals.newArrival >= 1)
    return 'Just arrived';

  if (signals.priceSimilarity >= 0.7)
    return 'Similar price range';

  return 'Recommended for you';
}


// ── Cache management ──────────────────────────────────────────────

function flushRecommendationCache() {
  return recommendationCache.flush();
}

function getCacheStats() {
  return {
    recommendations: recommendationCache.stats(),
    affinity:        affinityCache.stats(),
    products:        productDataCache.stats(),
  };
}


module.exports = {
  getRecommendations,
  getPopularProducts,
  getSimilarProducts,
  getVehicleRecommendations,
  flushRecommendationCache,
  getCacheStats,
  getAffinityMatrix,
};
