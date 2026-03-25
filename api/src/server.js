/**
 * server.js
 * Entry point — loads env, connects DB, starts HTTP server.
 * Handles graceful shutdown for SIGTERM / SIGINT.
 */

// ── Load environment variables FIRST ──────────────────────────────
require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/database');
const { syncModels } = require('./models');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

async function bootstrap() {
  try {
    // 1. Connect to MySQL
    await connectDB();

    // 2. Sync Sequelize models (dev: alter tables; prod: use migrations)
    if (NODE_ENV !== 'test') {
      await syncModels();
      logger.info('✔  Database models synchronised');
    }

    // 3. Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`✔  Ironclad API running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`   Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
    });

    // 4. Graceful shutdown handlers
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT',  gracefulShutdown('SIGINT'));

  } catch (err) {
    logger.error(`Fatal startup error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  return () => {
    logger.info(`${signal} received — shutting down gracefully…`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const { sequelize } = require('./config/database');
        await sequelize.close();
        logger.info('Database connection closed');
      } catch (_) {}
      process.exit(0);
    });

    // Force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      logger.error('Shutdown timeout — forcing exit');
      process.exit(1);
    }, 10_000);
  };
}

bootstrap();
