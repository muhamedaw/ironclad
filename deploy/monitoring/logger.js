/**
 * src/utils/logger.js  (production-grade replacement)
 * ─────────────────────────────────────────────────────────────────
 * Structured JSON logger for production.
 * Development mode: pretty human-readable output.
 * Production mode: JSON lines (compatible with Datadog, Papertrail,
 *                  Logtail, CloudWatch, GCP Logging).
 *
 * Features:
 *  - Log levels: debug < info < warn < error
 *  - Automatic request-id propagation via AsyncLocalStorage
 *  - Sensitive field redaction (password, token, card numbers)
 *  - Request/response logging middleware (with timing)
 *  - Error serialisation (stack traces in non-production)
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('User registered', { userId, email });
 *   logger.error('Payment failed', { orderId, error: err });
 */

'use strict';

const { AsyncLocalStorage } = require('async_hooks');

// ── Request context storage ───────────────────────────────────────
const requestContext = new AsyncLocalStorage();

// ── Config ────────────────────────────────────────────────────────
const LEVEL_NUMS = { debug:10, info:20, warn:30, error:40 };
const LOG_LEVEL  = LEVEL_NUMS[process.env.LOG_LEVEL] ?? LEVEL_NUMS.info;
const IS_PROD    = process.env.NODE_ENV === 'production';
const SERVICE    = process.env.SERVICE_NAME || 'ironclad-api';

// ── Sensitive field redaction ─────────────────────────────────────
const REDACTED_KEYS = new Set([
  'password', 'password_hash', 'passwordHash', 'token', 'refreshToken',
  'refresh_token', 'secret', 'apiKey', 'api_key', 'authorization',
  'cvv', 'card_number', 'cardNumber', 'ssn', 'credit_card',
  'stripe_secret', 'paypal_secret', 'webhook_secret',
]);

function redact(obj, depth = 0) {
  if (depth > 6 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(i => redact(i, depth + 1));

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

// ── Log entry builder ─────────────────────────────────────────────
function buildEntry(level, message, meta = {}) {
  const ctx = requestContext.getStore();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE,
    message,
    ...(ctx?.requestId  && { requestId:  ctx.requestId  }),
    ...(ctx?.userId     && { userId:     ctx.userId     }),
    ...(ctx?.method     && { method:     ctx.method     }),
    ...(ctx?.path       && { path:       ctx.path       }),
    ...redact(meta),
  };

  // Serialise errors
  if (meta.error instanceof Error) {
    entry.error = {
      message: meta.error.message,
      name:    meta.error.name,
      ...(!IS_PROD && { stack: meta.error.stack }),
    };
  }

  return entry;
}

// ── Pretty formatter (development) ────────────────────────────────
const LEVEL_COLORS = {
  debug: '\x1b[36m', info:  '\x1b[32m',
  warn:  '\x1b[33m', error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function prettyPrint(entry) {
  const { timestamp, level, message, requestId, ...rest } = entry;
  const time  = timestamp.slice(11, 23); // HH:mm:ss.mmm
  const color = LEVEL_COLORS[level] || '';
  const reqId = requestId ? ` \x1b[35m[${requestId.slice(0,8)}]\x1b[0m` : '';
  const meta  = Object.keys(rest).length > 2 // skip service + timestamp
    ? ' ' + JSON.stringify(rest, null, 0).replace(/^{|}$/g, '').replace(/,"/g, ', "').slice(0, 120)
    : '';
  return `${time} ${color}${level.toUpperCase().padEnd(5)}${RESET}${reqId} ${message}${meta}`;
}

// ── Core emit ─────────────────────────────────────────────────────
function emit(level, message, meta = {}) {
  if (LEVEL_NUMS[level] < LOG_LEVEL) return;
  const entry = buildEntry(level, message, meta);
  const line  = IS_PROD ? JSON.stringify(entry) : prettyPrint(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else                   process.stdout.write(line + '\n');
}

// ── Public API ────────────────────────────────────────────────────
const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info:  (msg, meta) => emit('info',  msg, meta),
  warn:  (msg, meta) => emit('warn',  msg, meta),
  error: (msg, meta) => emit('error', msg, meta),

  /** Wrap an async route handler so all its logs carry the request context */
  withRequest(req, fn) {
    const store = {
      requestId: req.id,
      userId:    req.user?.id,
      method:    req.method,
      path:      req.path,
    };
    return requestContext.run(store, fn);
  },
};

// ── Express middleware ────────────────────────────────────────────
const { v4: uuidv4 } = require('uuid');

/**
 * requestLogger(req, res, next)
 * Attaches request-id, logs incoming request and outgoing response with timing.
 */
function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);

  const startMs = Date.now();

  // Skip health/metrics noise
  const isQuiet = /\/(health|ready|metrics)/.test(req.path);

  if (!isQuiet) {
    logger.info(`→ ${req.method} ${req.path}`, {
      requestId: req.id,
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  res.on('finish', () => {
    const ms = Date.now() - startMs;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    if (!isQuiet || level !== 'info') {
      logger[level](`← ${req.method} ${req.path} ${res.statusCode} ${ms}ms`, {
        requestId:  req.id,
        statusCode: res.statusCode,
        durationMs: ms,
        userId:     req.user?.id,
      });
    }
  });

  const store = { requestId: req.id, method: req.method, path: req.path };
  requestContext.run(store, next);
}

module.exports = logger;
module.exports.requestLogger = requestLogger;
module.exports.requestContext = requestContext;
