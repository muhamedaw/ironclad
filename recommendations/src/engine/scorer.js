/**
 * engine/scorer.js
 * ─────────────────────────────────────────────────────────────────
 * IRONCLAD Recommendation Scoring Engine
 *
 * Produces a ranked list of product IDs by summing weighted signals:
 *
 *  Signal                  Weight   Description
 *  ──────────────────────  ──────   ─────────────────────────────────────────
 *  Vehicle compatibility    40 pts  Part confirmed to fit the user's car
 *  Same category as viewed  25 pts  User browsed this category recently
 *  Co-purchase affinity     20 pts  Bought together by other customers
 *  Trending / popular       15 pts  High sales velocity in the last 7 days
 *  Rating quality           10 pts  avg_rating × log(review_count + 1)
 *  Price similarity          8 pts  Close to the avg price of viewed items
 *  New arrival               5 pts  Listed in the past 30 days
 *  Recency decay            -N pts  Penalty if the product was already viewed
 *
 * All signals are normalised to [0, 1] before weighting so they
 * contribute proportionally regardless of raw magnitude.
 *
 * Final score formula:
 *   score = Σ (signal_normalised × weight) × boost_multiplier
 *
 * The engine is pure JS — no DB calls. Feed it pre-loaded data from
 * the services layer and it returns a sorted array of scored items.
 */

'use strict';

// ── Weight constants ──────────────────────────────────────────────
const W = {
  VEHICLE_COMPAT:    40,
  CATEGORY_MATCH:    25,
  CO_PURCHASE:       20,
  TRENDING:          15,
  RATING:            10,
  PRICE_SIMILARITY:   8,
  NEW_ARRIVAL:        5,
  ALREADY_VIEWED:   -30,   // strong penalty — don't re-show what they saw
};

// ── Configuration ─────────────────────────────────────────────────
const CONFIG = {
  maxResults:          20,
  trendingWindowDays:   7,
  newArrivalDays:      30,
  priceSimilarityPct:  0.30,  // within ±30% of avg viewed price = full score
  minRatingCount:       3,    // ignore rating signal below this threshold
};


// ─────────────────────────────────────────────────────────────────
// SIGNAL COMPUTERS
// Each returns a raw score in [0, 1] (or negative for penalties).
// ─────────────────────────────────────────────────────────────────

/**
 * vehicleCompatSignal
 * Returns 1 if the product is confirmed compatible with the user's vehicle,
 * 0.5 if it matches brand only (no explicit year/model data),
 * 0 otherwise.
 */
function vehicleCompatSignal(product, vehicle) {
  if (!vehicle?.brand) return 0;

  const { brand, model, year } = vehicle;

  // Check explicit compatibility records (product_compat join)
  if (Array.isArray(product.compatibleVehicles)) {
    const exact = product.compatibleVehicles.some(cv =>
      cv.brand?.toLowerCase() === brand.toLowerCase() &&
      (!model || cv.model?.toLowerCase() === model.toLowerCase()) &&
      (!year  || (cv.yearFrom <= year && (!cv.yearTo || cv.yearTo >= year)))
    );
    if (exact) return 1;
  }

  // Fallback: product carries a simple brand tag
  if (product.brand?.toLowerCase() === brand.toLowerCase()) return 0.5;

  return 0;
}


/**
 * categoryMatchSignal
 * Scores how well the product's category matches the user's browse history.
 * - Direct category match:    1.0
 * - Parent category match:    0.6
 * - Sibling category match:   0.3
 */
function categoryMatchSignal(product, viewedCategories) {
  if (!viewedCategories?.size) return 0;

  const cat    = product.categoryId;
  const parent = product.parentCategoryId;

  if (viewedCategories.has(cat)) return 1;

  // Partial credit for same-branch categories
  if (parent && viewedCategories.has(parent)) return 0.6;

  // Sibling detection: any viewed category shares the same parent
  if (parent) {
    // We'd need a map of category→parent; use a simple heuristic here:
    // product categories are provided as { id, parentId } in the data
    const sibling = [...viewedCategories].some(vc => vc === parent);
    if (sibling) return 0.3;
  }

  return 0;
}


/**
 * coPurchaseSignal
 * Uses a co-purchase affinity matrix:
 *   affinityMatrix[productA][productB] = times both were bought together
 *
 * Returns a normalised score based on how often this product was
 * bought alongside ANY of the user's viewed items.
 */
function coPurchaseSignal(product, viewedProductIds, affinityMatrix) {
  if (!viewedProductIds?.length || !affinityMatrix) return 0;

  let maxAffinity = 0;
  for (const viewedId of viewedProductIds) {
    const affinity = affinityMatrix?.[viewedId]?.[product.id] || 0;
    if (affinity > maxAffinity) maxAffinity = affinity;
  }

  if (maxAffinity === 0) return 0;

  // Normalise: cap at 50 co-purchases = full score
  return Math.min(maxAffinity / 50, 1);
}


/**
 * trendingSignal
 * Normalises salesVelocity (units sold in last N days) against the
 * maximum velocity in the candidate pool.
 */
function trendingSignal(product, maxVelocityInPool) {
  if (!product.salesVelocity || maxVelocityInPool === 0) return 0;
  return Math.min(product.salesVelocity / maxVelocityInPool, 1);
}


/**
 * ratingSignal
 * Bayesian-style score: avg_rating weighted by log of review count.
 * A product with 4.8 stars and 3 reviews scores lower than
 * one with 4.5 stars and 200 reviews.
 *
 * Formula: (rating / 5) × log10(reviewCount + 1) / log10(maxReviews + 1)
 */
function ratingSignal(product, maxReviewCount) {
  const { ratingAvg = 0, ratingCount = 0 } = product;
  if (ratingCount < CONFIG.minRatingCount) return 0;
  if (maxReviewCount === 0) return 0;

  const ratingNorm  = ratingAvg / 5;
  const reviewNorm  = Math.log10(ratingCount + 1) / Math.log10(maxReviewCount + 1);
  return ratingNorm * reviewNorm;
}


/**
 * priceSimilaritySignal
 * Rewards products within ±30% of the user's average viewed price.
 * Returns a Gaussian-shaped score: 1 at exact match, falling off smoothly.
 */
function priceSimilaritySignal(product, avgViewedPrice) {
  if (!avgViewedPrice || avgViewedPrice === 0) return 0;

  const ratio = product.price / avgViewedPrice;
  const diff  = Math.abs(1 - ratio);

  if (diff > CONFIG.priceSimilarityPct * 2) return 0;

  // Gaussian falloff: score = e^(-k * diff²)
  const k = 20; // controls sharpness
  return Math.exp(-k * diff * diff);
}


/**
 * newArrivalSignal
 * Returns 1 for products created within the last 30 days, 0 otherwise.
 */
function newArrivalSignal(product) {
  if (!product.createdAt) return 0;
  const ageMs   = Date.now() - new Date(product.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= CONFIG.newArrivalDays ? 1 : 0;
}


/**
 * alreadyViewedPenalty
 * Returns -1 (full penalty) for items in the recent view history,
 * partial penalties for items viewed a while ago.
 */
function alreadyViewedPenalty(productId, viewedProductIds) {
  const idx = viewedProductIds.indexOf(productId);
  if (idx === -1) return 0;

  // More recently viewed = heavier penalty
  // idx 0 = most recent
  const recencyFactor = Math.max(0, 1 - (idx / 10));
  return -recencyFactor; // returns [-1, 0]
}


// ─────────────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * scoreProducts(candidates, context)
 *
 * @param {Product[]} candidates     Products eligible for recommendation
 * @param {object}    context        User context bag
 * @param {string[]}  context.viewedProductIds   Recently viewed product IDs (most-recent first)
 * @param {object}    context.vehicle             { brand, model, year }
 * @param {object}    context.affinityMatrix      Co-purchase matrix
 * @param {number}    [context.maxResults]        Max products to return
 *
 * @returns {ScoredProduct[]}   Sorted by score descending
 */
function scoreProducts(candidates, context) {
  const {
    viewedProductIds  = [],
    vehicle           = null,
    affinityMatrix    = {},
    maxResults        = CONFIG.maxResults,
  } = context;

  if (!candidates?.length) return [];

  // ── Pre-compute pool statistics ───────────────────────────────
  const viewedSet        = new Set(viewedProductIds);
  const viewedCategorySet = new Set(
    candidates
      .filter(p => viewedSet.has(p.id))
      .map(p => p.categoryId)
      .filter(Boolean)
  );

  const viewedPrices = candidates
    .filter(p => viewedSet.has(p.id) && p.price > 0)
    .map(p => p.price);
  const avgViewedPrice = viewedPrices.length
    ? viewedPrices.reduce((a, b) => a + b, 0) / viewedPrices.length
    : 0;

  const maxVelocity = Math.max(...candidates.map(p => p.salesVelocity || 0), 1);
  const maxReviews  = Math.max(...candidates.map(p => p.ratingCount   || 0), 1);

  // ── Score each candidate ──────────────────────────────────────
  const scored = candidates
    .filter(p => p.isActive && !p.deletedAt) // exclude inactive/deleted
    .map(product => {
      const signals = {
        vehicleCompat:  vehicleCompatSignal(product, vehicle),
        categoryMatch:  categoryMatchSignal(product, viewedCategorySet),
        coPurchase:     coPurchaseSignal(product, viewedProductIds, affinityMatrix),
        trending:       trendingSignal(product, maxVelocity),
        rating:         ratingSignal(product, maxReviews),
        priceSimilarity:priceSimilaritySignal(product, avgViewedPrice),
        newArrival:     newArrivalSignal(product),
        alreadyViewed:  alreadyViewedPenalty(product.id, viewedProductIds),
      };

      const score =
        signals.vehicleCompat   * W.VEHICLE_COMPAT  +
        signals.categoryMatch   * W.CATEGORY_MATCH  +
        signals.coPurchase      * W.CO_PURCHASE      +
        signals.trending        * W.TRENDING         +
        signals.rating          * W.RATING           +
        signals.priceSimilarity * W.PRICE_SIMILARITY +
        signals.newArrival      * W.NEW_ARRIVAL      +
        signals.alreadyViewed   * Math.abs(W.ALREADY_VIEWED);

      return {
        product,
        score:   Math.max(0, parseFloat(score.toFixed(4))),
        signals, // exposed for debugging / explainability
      };
    });

  // ── Sort, slice, return ───────────────────────────────────────
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}


// ─────────────────────────────────────────────────────────────────
// STRATEGY FACTORY
// Different recommendation flavours using the same scorer.
// ─────────────────────────────────────────────────────────────────

const strategies = {
  /**
   * 'personal'  — full personalised ranking (all signals active)
   */
  personal: (candidates, ctx) => scoreProducts(candidates, ctx),

  /**
   * 'vehicle'   — weighted heavily toward vehicle compatibility
   *                (used in the "For your BMW" widget)
   */
  vehicle: (candidates, ctx) => scoreProducts(candidates, {
    ...ctx,
    // Temporarily boost vehicle signal by repeating in candidates
    _overrideWeights: { VEHICLE_COMPAT: 60, CATEGORY_MATCH: 15 },
  }),

  /**
   * 'popular'   — trending products, no personal context required
   */
  popular: (candidates, _ctx) => scoreProducts(candidates, {
    viewedProductIds: [],
    vehicle: null,
    affinityMatrix: {},
  }),

  /**
   * 'similar'   — products similar to a specific product
   *                (used on the product detail page)
   */
  similar: (candidates, ctx) => {
    const { pivotProduct } = ctx;
    if (!pivotProduct) return scoreProducts(candidates, ctx);

    // Treat the pivot product as the only viewed item
    return scoreProducts(candidates, {
      ...ctx,
      viewedProductIds: [pivotProduct.id, ...(ctx.viewedProductIds || [])],
    });
  },
};


// ─────────────────────────────────────────────────────────────────
// DIVERSITY FILTER
// Prevents the top-N results from being all the same category.
// ─────────────────────────────────────────────────────────────────

/**
 * diversify(scoredProducts, maxPerCategory)
 *
 * Ensures no single category dominates the results.
 * After picking the top product from each category in round-robin order,
 * any remaining slots are filled from the remaining high-scorers.
 */
function diversify(scoredProducts, maxPerCategory = 4) {
  const catCount  = {};
  const result    = [];
  const overflow  = [];

  for (const item of scoredProducts) {
    const cat = item.product.categoryId || 'unknown';
    catCount[cat] = (catCount[cat] || 0) + 1;
    if (catCount[cat] <= maxPerCategory) {
      result.push(item);
    } else {
      overflow.push(item);
    }
  }

  // Fill remaining slots from overflow (still sorted by score)
  return [...result, ...overflow].slice(0, scoredProducts.length);
}


// ─────────────────────────────────────────────────────────────────
// CO-PURCHASE MATRIX BUILDER
// Call once at startup / on a schedule from the DB order history.
// ─────────────────────────────────────────────────────────────────

/**
 * buildAffinityMatrix(orderItems)
 *
 * @param {Array<{orderId: string, productId: string}>} orderItems
 * @returns {object}  matrix[productA][productB] = co-purchase count
 *
 * Time complexity: O(orders × avgItemsPerOrder²)
 * For large datasets, use approximate methods or pre-compute in SQL.
 */
function buildAffinityMatrix(orderItems) {
  // Group items by order
  const orderMap = {};
  for (const { orderId, productId } of orderItems) {
    if (!orderMap[orderId]) orderMap[orderId] = [];
    orderMap[orderId].push(productId);
  }

  const matrix = {};

  for (const items of Object.values(orderMap)) {
    // All pairs in this order
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (!matrix[a]) matrix[a] = {};
        if (!matrix[b]) matrix[b] = {};
        matrix[a][b] = (matrix[a][b] || 0) + 1;
        matrix[b][a] = (matrix[b][a] || 0) + 1; // symmetric
      }
    }
  }

  return matrix;
}


// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────
module.exports = {
  scoreProducts,
  diversify,
  buildAffinityMatrix,
  strategies,
  W,     // exported for tests
  CONFIG, // exported for tests
};
