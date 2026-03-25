/**
 * middleware/cache.js
 * Simple in-process LRU cache for GET responses.
 *
 * Keeps hot product listings and single-product reads out of MySQL.
 * TTL-based invalidation — no external service required for single-node deployments.
 * For multi-node/production use, swap the store for Redis.
 *
 * Usage:
 *   router.get('/products', cache(60), ctrl.getProducts);
 *   router.get('/products/:id', cache(300), ctrl.getProduct);
 */

const logger = require('../utils/logger');

// ── In-process store ─────────────────────────────────────────────
class MemoryStore {
  constructor(maxEntries = 500) {
    this.store  = new Map();
    this.maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Move to end (LRU)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key) { this.store.delete(key); }

  /** Invalidate all keys that start with a prefix */
  invalidatePrefix(prefix) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  size() { return this.store.size; }

  flush() { this.store.clear(); }
}

const store = new MemoryStore(500);

/**
 * cache(ttlSeconds)
 * Returns Express middleware that:
 *  1. Checks the store for a cached response
 *  2. Returns it directly if found (cache HIT)
 *  3. Otherwise intercepts res.json() to store the response before sending
 */
const cache = (ttlSeconds = 60) => (req, res, next) => {
  // Only cache GET requests; skip if user-specific or cache-control says no
  if (req.method !== 'GET') return next();
  if (req.headers['cache-control'] === 'no-cache') return next();

  const key = `${req.originalUrl}`;
  const cached = store.get(key);

  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Cache-TTL', ttlSeconds);
    return res.json(cached);
  }

  // Intercept res.json to store the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode === 200 && body?.success) {
      store.set(key, body, ttlSeconds);
    }
    res.setHeader('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
};

/**
 * invalidateCache(prefix)
 * Call after any write that should bust cached reads.
 * E.g., after updating a product: invalidateCache('/api/v1/products')
 */
const invalidateCache = (prefix) => {
  const n = store.invalidatePrefix(prefix);
  if (n > 0) logger.debug(`Cache: invalidated ${n} entries for prefix "${prefix}"`);
};

/** Express middleware — exposes cache stats at /api/v1/admin/cache */
const cacheStats = (req, res) => {
  res.json({ success: true, data: { entries: store.size() } });
};

/** Express middleware — flush entire cache (admin only) */
const flushCache = (req, res) => {
  store.flush();
  res.json({ success: true, message: 'Cache flushed' });
};

module.exports = { cache, invalidateCache, cacheStats, flushCache };
