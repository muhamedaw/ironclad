/**
 * middleware/security.js
 * Rate limiting, request sanitisation, and security helpers.
 */

const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/ApiError');

// ── Generic rate limiter ──────────────────────────────────────────
const defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests — please try again later.',
      code: 'RATE_LIMITED',
    });
  },
});

// ── Strict limiter for auth endpoints ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts — please wait 15 minutes.',
      code: 'AUTH_RATE_LIMITED',
    });
  },
});

// ── Write operations limiter ──────────────────────────────────────
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many write requests — slow down.',
      code: 'WRITE_RATE_LIMITED',
    });
  },
});

/**
 * sanitiseBody
 * Recursively trims strings and removes null bytes.
 */
const sanitiseBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepTrim(req.body);
  }
  next();
};

function deepTrim(obj) {
  if (typeof obj === 'string') return obj.replace(/\0/g, '').trim();
  if (Array.isArray(obj))      return obj.map(deepTrim);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deepTrim(v)])
    );
  }
  return obj;
}

/**
 * requireJson
 * Rejects requests that carry a body without Content-Type: application/json.
 * Allows empty-body POST/PATCH (e.g. toggle endpoints) through unconditionally.
 */
const requireJson = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Only enforce Content-Type when the client actually sent a body
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const isChunked = req.headers['transfer-encoding'] === 'chunked';
    const hasBody = contentLength > 0 || isChunked;

    if (hasBody && !req.is('application/json')) {
      return next(ApiError.badRequest('Content-Type must be application/json'));
    }
  }
  next();
};

module.exports = { defaultLimiter, authLimiter, writeLimiter, sanitiseBody, requireJson };
