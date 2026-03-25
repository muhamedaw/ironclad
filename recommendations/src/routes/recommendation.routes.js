/**
 * routes/recommendation.routes.js
 */

'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/recommendation.controller');
const { validateRecommendationQuery, validateVehicleQuery } = require('../middleware/validators');

const router = Router();

// ── Public endpoints ──────────────────────────────────────────────

/**
 * General-purpose recommendations (personal + vehicle + popularity blended)
 * GET  /api/v1/recommendations?brand=BMW&model=3+Series&year=2021&viewedIds=p001,p011&limit=10
 * POST /api/v1/recommendations  { brand, model, year, viewedIds, strategy, limit }
 */
router.get('/',  validateRecommendationQuery, ctrl.getRecommendations);
router.post('/', validateRecommendationQuery, ctrl.getRecommendations);

/**
 * Popular products — no context needed
 * GET /api/v1/recommendations/popular?limit=10&categoryId=c-brakes
 */
router.get('/popular', ctrl.getPopular);

/**
 * Vehicle-targeted — products that fit a specific car
 * GET /api/v1/recommendations/vehicle?brand=BMW&model=3+Series&year=2021
 */
router.get('/vehicle', validateVehicleQuery, ctrl.getVehicleRecs);

/**
 * Similar products — for product detail page
 * GET /api/v1/recommendations/similar/p001?viewedIds=p011,p019&limit=6
 */
router.get('/similar/:productId', ctrl.getSimilar);

/**
 * Batch — load multiple widget types in one request
 * POST /api/v1/recommendations/batch
 * Body: { requests: [{ type, ...params }] }
 */
router.post('/batch', ctrl.getBatch);

// ── Admin endpoints ───────────────────────────────────────────────
// In production, add: router.use(protect, authorize('admin'))

router.get('/cache/stats', ctrl.getCacheStats);
router.delete('/cache',    ctrl.flushCache);

module.exports = router;
