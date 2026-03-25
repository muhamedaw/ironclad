// utils/asyncHandler.js
'use strict';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };


// ── Simple console logger (swap for Winston in production) ────────
// utils/logger.js — inline here for simplicity
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 1;

function log(level, msg, meta) {
  if (LEVELS[level] < currentLevel) return;
  const ts = new Date().toISOString();
  const prefix = `${ts} [${level.toUpperCase()}]`;
  if (meta) console[level === 'error' ? 'error' : 'log'](prefix, msg, meta);
  else       console[level === 'error' ? 'error' : 'log'](prefix, msg);
}

const logger = {
  debug: (m, x) => log('debug', m, x),
  info:  (m, x) => log('info',  m, x),
  warn:  (m, x) => log('warn',  m, x),
  error: (m, x) => log('error', m, x),
};

module.exports.logger = logger;
