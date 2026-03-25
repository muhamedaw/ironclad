/**
 * utils/migrate.js
 * Lightweight migration runner.
 *
 * Migrations are plain SQL files in src/migrations/*.sql, named:
 *   001_create_users.sql
 *   002_create_products.sql
 *   ...
 *
 * A `schema_migrations` table tracks which files have run.
 * Run:  node src/utils/migrate.js
 * Rollback is manual (write a matching *_rollback.sql if needed).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const { connectDB } = require('../config/database');
const { sequelize } = require('../config/database');
const logger = require('./logger');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function migrate() {
  await connectDB();

  // Ensure tracking table exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   VARCHAR(255) NOT NULL PRIMARY KEY,
      run_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Fetch already-run versions
  const [ran] = await sequelize.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  const ranSet = new Set(ran.map(r => r.version));

  // Read migration files, sorted by name
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.info('No migrations directory found — skipping');
    process.exit(0);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (ranSet.has(file)) {
      logger.info(`  ↳ skip  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);

    logger.info(`  ▶ apply ${file}`);
    const t = await sequelize.transaction();
    try {
      for (const stmt of statements) {
        await sequelize.query(stmt, { transaction: t });
      }
      await sequelize.query(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        { replacements: [file], transaction: t }
      );
      await t.commit();
      applied++;
      logger.info(`  ✔ done  ${file}`);
    } catch (err) {
      await t.rollback();
      logger.error(`  ✖ FAIL  ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  if (applied === 0) {
    logger.info('Database already up to date.');
  } else {
    logger.info(`\n✔  Applied ${applied} migration(s)`);
  }

  process.exit(0);
}

migrate().catch(err => {
  logger.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
