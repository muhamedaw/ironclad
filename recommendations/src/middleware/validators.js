/**
 * middleware/validators.js
 */
'use strict';

const { query, body, validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

const VALID_STRATEGIES = ['personal', 'vehicle', 'popular', 'similar'];

const validateRecommendationQuery = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50').toInt(),
  query('strategy').optional().isIn(VALID_STRATEGIES).withMessage(`strategy must be one of: ${VALID_STRATEGIES.join(', ')}`),
  query('year').optional().isInt({ min: 1900, max: 2100 }).withMessage('year must be 1900–2100').toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Invalid query parameters', errors.array()));
    }
    next();
  },
];

const validateVehicleQuery = [
  query('brand').notEmpty().withMessage('brand is required'),
  query('year').optional().isInt({ min: 1900, max: 2100 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Invalid query parameters', errors.array()));
    }
    next();
  },
];

module.exports = { validateRecommendationQuery, validateVehicleQuery };


// ─────────────────────────────────────────────────────────────────
// utils/ApiError.js
// ─────────────────────────────────────────────────────────────────

// (Re-export from top-level utils for convenience)


// ─────────────────────────────────────────────────────────────────
// utils/asyncHandler.js
// ─────────────────────────────────────────────────────────────────
