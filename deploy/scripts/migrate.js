#!/usr/bin/env node
/**
 * scripts/migrate.js
 * ─────────────────────────────────────────────────────────────────
 * Simple, dependency-light migration runner.
 * Uses raw MySQL queries — no ORM required.
 *
 * Usage:
 *   node scripts/migrate.js             # run pending migrations
 *   node scripts/migrate.js --rollback  # roll back last batch
 *   node scripts/migrate.js --status    # show migration status
 *   node scripts/migrate.js --seed      # run seed data
 *
 * Migrations live in: db/migrations/YYYYMMDD_HHMMSS_description.sql
 * Seed files live in:  db/seeds/
 */

'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const DB_CONFIG = {
  host:              process.env.DB_HOST     || 'localhost',
  port:    parseInt(process.env.DB_PORT      || '3306'),
  user:              process.env.DB_USER     || 'ironclad',
  password:          process.env.DB_PASSWORD,
  database:          process.env.DB_NAME     || 'ironclad_db',
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
};

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');
const SEEDS_DIR      = path.join(__dirname, '../db/seeds');

async function ensureMigrationsTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      filename   VARCHAR(255)    NOT NULL,
      batch      INT UNSIGNED    NOT NULL DEFAULT 1,
      checksum   CHAR(64)        NOT NULL,
      applied_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function checksum(content) {
  return require('crypto').createHash('sha256').update(content).digest('hex');
}

async function getApplied(conn) {
  const [rows] = await conn.execute('SELECT filename, batch, checksum FROM schema_migrations ORDER BY id');
  return new Map(rows.map(r => [r.filename, r]));
}

async function getNextBatch(conn) {
  const [[{ maxBatch }]] = await conn.execute('SELECT COALESCE(MAX(batch), 0) AS maxBatch FROM schema_migrations');
  return maxBatch + 1;
}

async function runMigrations(conn, applied, batch) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found — skipping.');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      const row = applied.get(file);
      // Verify checksum hasn't changed (tamper detection)
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      if (checksum(sql) !== row.checksum) {
        console.error(`⚠  Checksum mismatch on already-applied migration: ${file}`);
        console.error('   This migration has been modified after being applied. Manual intervention required.');
        process.exit(1);
      }
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  ↳ Applying: ${file}`);

    await conn.beginTransaction();
    try {
      await conn.query(sql);
      await conn.execute(
        'INSERT INTO schema_migrations (filename, batch, checksum) VALUES (?, ?, ?)',
        [file, batch, checksum(sql)]
      );
      await conn.commit();
      console.log(`    ✓ Done`);
      ran++;
    } catch (err) {
      await conn.rollback();
      console.error(`    ✗ FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log('  ✓ All migrations already applied — nothing to do.');
  } else {
    console.log(`\n  ✓ ${ran} migration(s) applied in batch ${batch}`);
  }
}

async function rollback(conn, applied) {
  const [[{ maxBatch }]] = await conn.execute('SELECT COALESCE(MAX(batch), 0) AS maxBatch FROM schema_migrations');
  if (maxBatch === 0) { console.log('Nothing to roll back.'); return; }

  const [rows] = await conn.execute(
    'SELECT filename FROM schema_migrations WHERE batch = ? ORDER BY id DESC',
    [maxBatch]
  );

  for (const { filename } of rows) {
    const downFile = path.join(MIGRATIONS_DIR, filename.replace('.sql', '.down.sql'));
    if (!fs.existsSync(downFile)) {
      console.warn(`  ⚠  No rollback file for ${filename} — skipping.`);
      continue;
    }
    const sql = fs.readFileSync(downFile, 'utf8');
    console.log(`  ↳ Rolling back: ${filename}`);
    await conn.beginTransaction();
    try {
      await conn.query(sql);
      await conn.execute('DELETE FROM schema_migrations WHERE filename = ?', [filename]);
      await conn.commit();
      console.log(`    ✓ Rolled back`);
    } catch (err) {
      await conn.rollback();
      console.error(`    ✗ FAILED: ${err.message}`);
      process.exit(1);
    }
  }
  console.log(`\n  ✓ Batch ${maxBatch} rolled back`);
}

async function showStatus(conn, applied) {
  const files = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort()
    : [];

  console.log('\n Migration Status\n' + '─'.repeat(60));
  for (const file of files) {
    const row = applied.get(file);
    const status = row ? `✓  batch ${row.batch}  ${row.applied_at ? new Date(row.applied_at).toISOString().slice(0,19) : ''}` : '✗  pending';
    console.log(`  ${status.padEnd(30)} ${file}`);
  }
  console.log('─'.repeat(60) + '\n');
}

async function runSeeds(conn) {
  if (!fs.existsSync(SEEDS_DIR)) { console.log('No seeds directory.'); return; }
  const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    console.log(`  ↳ Seeding: ${file}`);
    await conn.query(sql);
    console.log(`    ✓ Done`);
  }
}

async function main() {
  const args    = process.argv.slice(2);
  const doRollback = args.includes('--rollback');
  const doStatus   = args.includes('--status');
  const doSeed     = args.includes('--seed');

  let conn;
  try {
    console.log('\n🗄  Connecting to database…');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✓  Connected\n');

    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    if (doStatus)   await showStatus(conn, applied);
    else if (doRollback) await rollback(conn, applied);
    else if (doSeed)     await runSeeds(conn);
    else {
      const batch = await getNextBatch(conn);
      console.log('Running migrations…');
      await runMigrations(conn, applied, batch);
      if (args.includes('--seed')) await runSeeds(conn);
    }

  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
