/**
 * app.js
 */
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { ApiError } = require('./utils/ApiError');

const recommendationRoutes = require('./routes/recommendation.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '512kb' }));

// ── Routes ────────────────────────────────────────────────────────
const PREFIX = '/api/v1';

app.get(`${PREFIX}/health`, (req, res) => res.json({
  success: true,
  service: 'ironclad-recommendations',
  uptime:  Math.floor(process.uptime()),
}));

app.use(`${PREFIX}/recommendations`, recommendationRoutes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res, next) => next(ApiError.notFound(`Route ${req.method} ${req.path}`)));

// ── Error handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.isOperational ? err.statusCode : 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(err.errors?.length && { errors: err.errors }),
  });
});

module.exports = app;
