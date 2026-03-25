/**
 * controllers/recommendation.controller.js
 * ─────────────────────────────────────────────────────────────────
 * Thin HTTP layer — parses requests, delegates to the service,
 * formats responses. No business logic here.
 */

'use strict';

const service = require('../services/recommendation.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

// ── Shared context parser ─────────────────────────────────────────

/**
 * parseRequestContext
 * Extracts and validates recommendation context from req.
 * Accepts context from:
 *  - req.body   (POST endpoints)
 *  - req.query  (GET endpoints — viewed IDs as comma-separated string)
 */
function parseRequestContext(req) {
  const source = req.method === 'POST' ? req.body : req.query;

  // Vehicle
  const vehicle = (source.brand || source.vehicleBrand) ? {
    brand: (source.brand || source.vehicleBrand || '').trim(),
    model: (source.model || source.vehicleModel || '').trim() || null,
    year:  source.year ? parseInt(source.year, 10) : null,
  } : null;

  // Viewed product IDs
  let viewedProductIds = [];
  if (source.viewedIds) {
    viewedProductIds = Array.isArray(source.viewedIds)
      ? source.viewedIds
      : source.viewedIds.split(',').map(id => id.trim()).filter(Boolean);
  }

  // Pagination
  const limit = Math.min(
    parseInt(source.limit || '10', 10),
    50  // hard cap
  );

  return {
    vehicle,
    viewedProductIds: viewedProductIds.slice(0, 20), // cap history depth
    limit,
    strategy:      source.strategy      || 'personal',
    categoryId:    source.categoryId    || null,
    pivotProductId:source.pivotProductId|| null,
    explain:       source.explain === 'true' || source.explain === true,
    noCache:       source.noCache === 'true',
  };
}


// ── Controllers ───────────────────────────────────────────────────

/**
 * GET /api/v1/recommendations
 * POST /api/v1/recommendations
 *
 * General-purpose recommendation endpoint.
 * Supports all strategies via strategy= parameter.
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const context = parseRequestContext(req);
  const result  = await service.getRecommendations(context);

  return res.json({
    success: true,
    data:    result.items.map(formatItem),
    meta: {
      total:     result.total,
      strategy:  result.strategy,
      context:   result.context,
      fromCache: result.fromCache,
      latencyMs: result.latencyMs,
    },
  });
});


/**
 * GET /api/v1/recommendations/popular
 *
 * Top products by sales velocity + rating.
 * No context required — good for homepage widgets.
 *
 * Query params:
 *   limit      (default 10)
 *   categoryId (optional filter)
 */
const getPopular = asyncHandler(async (req, res) => {
  const limit      = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const categoryId = req.query.categoryId || null;

  const noCache = req.query.noCache === 'true';
  const result = await service.getPopularProducts({ limit, categoryId, noCache });

  return res.json({
    success: true,
    data:    result.items.map(formatItem),
    meta:    { total: result.total, fromCache: result.fromCache, latencyMs: result.latencyMs },
  });
});


/**
 * GET /api/v1/recommendations/vehicle
 *
 * Products compatible with a specific car.
 *
 * Query params:
 *   brand*     e.g. BMW
 *   model      e.g. 3 Series
 *   year       e.g. 2021
 *   limit      (default 10)
 *   categoryId (optional)
 */
const getVehicleRecs = asyncHandler(async (req, res) => {
  const { brand, model, year, limit: limitStr, categoryId } = req.query;

  if (!brand) throw ApiError.badRequest('brand query parameter is required');

  const vehicle = {
    brand: brand.trim(),
    model: (model || '').trim() || null,
    year:  year ? parseInt(year, 10) : null,
  };
  const limit = Math.min(parseInt(limitStr || '10', 10), 50);

  const result = await service.getVehicleRecommendations(vehicle, { limit, categoryId });

  return res.json({
    success: true,
    data:    result.items.map(formatItem),
    meta: {
      vehicle,
      total:     result.total,
      fromCache: result.fromCache,
      latencyMs: result.latencyMs,
    },
  });
});


/**
 * GET /api/v1/recommendations/similar/:productId
 *
 * Products similar to a given product.
 * Used on product detail pages.
 *
 * Path params:
 *   productId
 *
 * Query params:
 *   viewedIds  comma-separated recently viewed IDs (optional context)
 *   limit      (default 6)
 */
const getSimilar = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) throw ApiError.badRequest('productId path parameter is required');

  const limit = Math.min(parseInt(req.query.limit || '6', 10), 20);
  const viewedProductIds = req.query.viewedIds
    ? req.query.viewedIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const result = await service.getSimilarProducts(productId, { limit, viewedProductIds });

  return res.json({
    success: true,
    data:    result.items.map(formatItem),
    meta: {
      pivotProductId: productId,
      total:          result.total,
      fromCache:      result.fromCache,
      latencyMs:      result.latencyMs,
    },
  });
});


/**
 * POST /api/v1/recommendations/batch
 *
 * Fetch multiple recommendation sets in a single round-trip.
 * Used by the frontend to load several widgets at once.
 *
 * Body:
 * {
 *   requests: [
 *     { type: 'popular',  limit: 6 },
 *     { type: 'vehicle',  brand: 'BMW', model: '3 Series', year: 2021, limit: 6 },
 *     { type: 'similar',  pivotProductId: 'p001', limit: 4 },
 *   ]
 * }
 */
const getBatch = asyncHandler(async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests) || requests.length === 0) {
    throw ApiError.badRequest('requests array is required');
  }
  if (requests.length > 5) {
    throw ApiError.badRequest('Maximum 5 batch requests allowed');
  }

  const settled = await Promise.allSettled(
    requests.map(r => dispatchBatchRequest(r))
  );

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      return {
        type:    requests[i].type,
        success: true,
        data:    s.value.items.map(formatItem),
        meta:    { total: s.value.total, latencyMs: s.value.latencyMs },
      };
    }
    return {
      type:    requests[i].type,
      success: false,
      error:   s.reason?.message || 'Failed',
    };
  });

  return res.json({ success: true, results });
});


/**
 * GET /api/v1/recommendations/cache/stats  (admin)
 */
const getCacheStats = asyncHandler(async (req, res) => {
  return res.json({ success: true, data: service.getCacheStats() });
});


/**
 * DELETE /api/v1/recommendations/cache  (admin)
 */
const flushCache = asyncHandler(async (req, res) => {
  const flushed = service.flushRecommendationCache();
  return res.json({ success: true, message: `Flushed ${flushed} cache entries` });
});


// ── Helpers ───────────────────────────────────────────────────────

function formatItem(item) {
  const { product, score, reason, signals } = item;
  return {
    id:            product.id,
    name:          product.name,
    brand:         product.brand,
    price:         product.price,
    originalPrice: product.originalPrice || null,
    ratingAvg:     product.ratingAvg,
    ratingCount:   product.ratingCount,
    categoryId:    product.categoryId,
    image:         product.image || null,
    score:         parseFloat(score.toFixed(2)),
    reason,
    ...(signals && { signals }),
  };
}

async function dispatchBatchRequest(req) {
  switch (req.type) {
    case 'popular':
      return service.getPopularProducts({ limit: req.limit || 6, categoryId: req.categoryId });
    case 'vehicle':
      return service.getVehicleRecommendations(
        { brand: req.brand, model: req.model, year: req.year },
        { limit: req.limit || 6 }
      );
    case 'similar':
      return service.getSimilarProducts(req.pivotProductId, { limit: req.limit || 4 });
    case 'personal':
    default:
      return service.getRecommendations({
        viewedProductIds: req.viewedIds || [],
        vehicle: req.brand ? { brand: req.brand, model: req.model, year: req.year } : null,
        strategy: 'personal',
        limit: req.limit || 10,
      });
  }
}


module.exports = {
  getRecommendations,
  getPopular,
  getVehicleRecs,
  getSimilar,
  getBatch,
  getCacheStats,
  flushCache,
};
