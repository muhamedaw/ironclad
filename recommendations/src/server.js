/**
 * src/server.js
 * Entry point — loads env, warms the affinity matrix, starts HTTP server.
 */

'use strict';

require('dotenv').config();

const app                   = require('./app');
const { getAffinityMatrix } = require('./services/recommendation.service');
const logger                = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '4001', 10);

async function bootstrap() {
  // Pre-warm the co-purchase affinity matrix so the first request is fast
  try {
    await getAffinityMatrix();
    logger.info('[Server] Affinity matrix pre-warmed');
  } catch (err) {
    logger.warn(`[Server] Affinity matrix pre-warm failed (non-fatal): ${err.message}`);
  }

  const server = app.listen(PORT, () => {
    logger.info(`[Server] ironclad-recommendations listening on :${PORT}`);
    logger.info(`[Server] Base URL: http://localhost:${PORT}/api/v1`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────
  function shutdown(signal) {
    logger.info(`[Server] ${signal} received — shutting down…`);
    server.close(() => {
      logger.info('[Server] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => { logger.error('[Server] Shutdown timeout'); process.exit(1); }, 8000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.error(`[Server] Fatal startup error: ${err.message}`);
  process.exit(1);
});
