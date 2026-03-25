/**
 * config/database.js
 * Uses SQLite in development (zero setup) and MySQL in production.
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

const {
  NODE_ENV,
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
  DB_POOL_MAX, DB_POOL_MIN, DB_POOL_ACQUIRE, DB_POOL_IDLE,
} = process.env;

// Use SQLite automatically when no MySQL password is configured
const useSQLite = NODE_ENV !== 'production' && !DB_PASSWORD;

let sequelize;

if (useSQLite) {
  const dbFile = path.join(__dirname, '../../ironclad_dev.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbFile,
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: true,
      freezeTableName: true,
    },
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST || 'localhost',
    port: parseInt(DB_PORT, 10) || 3306,
    dialect: 'mysql',
    pool: {
      max:     parseInt(DB_POOL_MAX, 10)     || 10,
      min:     parseInt(DB_POOL_MIN, 10)     || 2,
      acquire: parseInt(DB_POOL_ACQUIRE, 10) || 30000,
      idle:    parseInt(DB_POOL_IDLE, 10)    || 10000,
    },
    logging: NODE_ENV === 'development' ? (sql) => logger.debug(`[SQL] ${sql}`) : false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: true,
      freezeTableName: true,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      decimalNumbers: true,
      ...(NODE_ENV === 'production' && { ssl: { require: true, rejectUnauthorized: false } }),
    },
  });
}

async function connectDB() {
  try {
    await sequelize.authenticate();
    if (useSQLite) {
      await sequelize.sync({ alter: true });
      logger.info('✔  SQLite connected (dev mode) — database auto-created');
    } else {
      logger.info(`✔  MySQL connected [${DB_HOST}:${DB_PORT}/${DB_NAME}]`);
    }
  } catch (err) {
    logger.error(`✖  Database connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { sequelize, connectDB };
