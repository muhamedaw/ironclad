/**
 * app.js
 * Express application factory.
 * Separated from server.js so the app can be imported by tests
 * without starting the HTTP server.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { defaultLimiter, sanitiseBody, requireJson } = require('./middleware/security');
const logger = require('./utils/logger');
const requestId = require('./middleware/requestId');

const app = express();

// ── Security headers (Helmet) ──────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // relax for API usage
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
}));

// ── CORS ───────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,       // Allow cookies (refresh token)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  maxAge: 86400,           // Pre-flight cache: 1 day
}));

// ── Compression ────────────────────────────────────────────────────
app.use(requestId);
app.use(compression());

// ── Request logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.url === `${process.env.API_PREFIX || '/api/v1'}/health`,
  }));
}

// ── Body parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));       // reject huge payloads
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Input sanitisation ─────────────────────────────────────────────
app.use(sanitiseBody);
app.use(requireJson);

// ── Global rate limiter ────────────────────────────────────────────
app.use(defaultLimiter);

// ── Trust proxy (needed for rate-limit behind nginx/load balancer) ─
app.set('trust proxy', 1);

// ── Routes ─────────────────────────────────────────────────────────
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(apiPrefix, routes);

// ── 404 + Error handlers (must be LAST) ────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
