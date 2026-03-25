/**
 * middleware/errorHandler.js
 * Centralised error handling for the entire Express application.
 * All errors should reach here via next(err) or by throwing inside asyncHandler.
 */

const logger = require('../utils/logger');
const { ApiError } = require('../utils/ApiError');

/**
 * notFound
 * Catches requests to undefined routes and forwards a 404 ApiError.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl}`));
};

/**
 * errorHandler
 * Transforms any error (operational or programming) into a consistent
 * JSON response. Never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ── Sequelize validation errors ──────────────────────────────
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const apiErr = ApiError.unprocessable('Validation failed', errors);
    return res.status(422).json(formatError(apiErr, req));
  }

  // ── JWT errors (shouldn't reach here normally, handled in auth.js) ──
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const apiErr = ApiError.unauthorized('Invalid or expired token');
    return res.status(401).json(formatError(apiErr, req));
  }

  // ── express-validator errors forwarded as ApiError ─────────────
  if (err.isOperational) {
    return res.status(err.statusCode).json(formatError(err, req));
  }

  // ── Unknown / programming errors ───────────────────────────────
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ── Private helpers ───────────────────────────────────────────────
function formatError(err, req) {
  const body = {
    success: false,
    message: err.message,
  };

  if (err.code) body.code = err.code;

  if (err.errors && err.errors.length > 0) {
    body.errors = err.errors;
  }

  // Include request ID for debugging (set by request-id middleware if present)
  if (req.id) body.requestId = req.id;

  return body;
}

/**
 * validationErrorHandler
 * Middleware to run after express-validator's validationResult.
 * Collects all field errors and throws a single ApiError.
 */
const { validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    throw ApiError.unprocessable('Input validation failed', errors);
  }
  next();
};

module.exports = { notFound, errorHandler, handleValidation };
