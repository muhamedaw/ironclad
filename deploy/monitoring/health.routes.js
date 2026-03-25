/**
 * src/routes/health.routes.js
 * ─────────────────────────────────────────────────────────────────
 * Production health-check and readiness probe endpoints.
 *
 * GET /api/v1/health          — liveness probe (is the process alive?)
 * GET /api/v1/ready           — readiness probe (can it serve traffic?)
 * GET /api/v1/metrics         — internal metrics (admin-only in prod)
 *
 * Kubernetes / Docker / Render / Fly.io all call these automatically.
 * The difference matters:
 *   liveness  → if this fails, restart the container
 *   readiness → if this fails, stop sending it traffic (but don't kill it)
 */

'use strict';

const { Router } = require('express');
const { sequelize } = require('../config/database');
const logger   = require('../utils/logger');

const router = Router();

// ── Process-level start time ──────────────────────────────────────
const startedAt = new Date();
let requestCount = 0;
let errorCount = 0;

// ── Lightweight counter middleware (attach to app.js) ─────────────
function requestCounter(req, res, next) {
  requestCount++;
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    if (res.statusCode >= 500) errorCount++;
    return originalEnd(...args);
  };
  next();
}

// ── Liveness probe ────────────────────────────────────────────────
// Returns 200 as long as the Node process is running.
// Deliberately does NOT check DB — a slow DB shouldn't restart the process.
router.get('/health', (req, res) => {
  res.json({
    success:   true,
    service:   process.env.SERVICE_NAME || 'ironclad-api',
    version:   process.env.npm_package_version || '1.0.0',
    env:       process.env.NODE_ENV || 'development',
    uptime:    Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    timestamp: new Date().toISOString(),
  });
});

// ── Readiness probe ────────────────────────────────────────────────
// Checks all critical dependencies. Returns 503 if any are down.
router.get('/ready', async (req, res) => {
  const checks = {};
  let allHealthy = true;

  // 1. Database connectivity
  try {
    await sequelize.authenticate();
    await sequelize.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: null };

    const t0 = Date.now();
    await sequelize.query('SELECT 1');
    checks.database.latencyMs = Date.now() - t0;
  } catch (err) {
    checks.database = { status: 'error', message: err.message };
    allHealthy = false;
    logger.error('[Health] Database check failed', { error: err.message });
  }

  // 2. Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Lazy import to avoid requiring redis in non-redis environments
      const { createClient } = require('redis');
      const client = createClient({ url: process.env.REDIS_URL });
      await client.connect();
      const t0 = Date.now();
      await client.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - t0 };
      await client.disconnect();
    } catch (err) {
      checks.redis = { status: 'error', message: err.message };
      allHealthy = false;
      logger.error('[Health] Redis check failed', { error: err.message });
    }
  } else {
    checks.redis = { status: 'not_configured' };
  }

  // 3. Memory usage
  const mem = process.memoryUsage();
  const heapUsedMb  = Math.round(mem.heapUsed  / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.memory = {
    status:      heapPct > 90 ? 'warning' : 'ok',
    heapUsedMb,
    heapTotalMb,
    heapPercent: heapPct,
  };
  if (heapPct > 95) allHealthy = false;

  // 4. Disk (if /tmp is writable — indicates container health)
  try {
    const fs = require('fs');
    const testPath = '/tmp/.healthcheck';
    fs.writeFileSync(testPath, Date.now().toString());
    fs.unlinkSync(testPath);
    checks.disk = { status: 'ok' };
  } catch {
    checks.disk = { status: 'error', message: 'Cannot write to /tmp' };
    allHealthy = false;
  }

  const status = allHealthy ? 200 : 503;
  if (!allHealthy) {
    logger.warn('[Health] Readiness check failed', { checks });
  }

  res.status(status).json({
    ready:     allHealthy,
    service:   process.env.SERVICE_NAME || 'ironclad-api',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ── Metrics (Prometheus-compatible text format) ───────────────────
// Protect with admin auth in production:
//   router.get('/metrics', protect, authorize('admin'), ...)
router.get('/metrics', (req, res) => {
  const mem  = process.memoryUsage();
  const cpu  = process.cpuUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Expose as Prometheus text format for Grafana/Prometheus scraping
  const lines = [
    '# HELP ironclad_uptime_seconds Total process uptime',
    '# TYPE ironclad_uptime_seconds counter',
    `ironclad_uptime_seconds ${uptimeSeconds}`,
    '',
    '# HELP ironclad_http_requests_total Total HTTP requests',
    '# TYPE ironclad_http_requests_total counter',
    `ironclad_http_requests_total ${requestCount}`,
    '',
    '# HELP ironclad_http_errors_total Total HTTP 5xx errors',
    '# TYPE ironclad_http_errors_total counter',
    `ironclad_http_errors_total ${errorCount}`,
    '',
    '# HELP ironclad_memory_heap_used_bytes Heap memory in use',
    '# TYPE ironclad_memory_heap_used_bytes gauge',
    `ironclad_memory_heap_used_bytes ${mem.heapUsed}`,
    '',
    '# HELP ironclad_memory_heap_total_bytes Total heap allocated',
    '# TYPE ironclad_memory_heap_total_bytes gauge',
    `ironclad_memory_heap_total_bytes ${mem.heapTotal}`,
    '',
    '# HELP ironclad_memory_rss_bytes Resident set size',
    '# TYPE ironclad_memory_rss_bytes gauge',
    `ironclad_memory_rss_bytes ${mem.rss}`,
    '',
    '# HELP ironclad_cpu_user_seconds CPU user time',
    '# TYPE ironclad_cpu_user_seconds counter',
    `ironclad_cpu_user_seconds ${cpu.user / 1e6}`,
    '',
    '# HELP ironclad_cpu_system_seconds CPU system time',
    '# TYPE ironclad_cpu_system_seconds counter',
    `ironclad_cpu_system_seconds ${cpu.system / 1e6}`,
    '',
    `# Build info`,
    `ironclad_build_info{version="${process.env.npm_package_version || '1.0.0'}",env="${process.env.NODE_ENV || 'development'}",node="${process.version}"} 1`,
  ];

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

module.exports = { router, requestCounter };
