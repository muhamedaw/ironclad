/**
 * engine/cache.js
 * ─────────────────────────────────────────────────────────────────
 * TTL + LRU cache for recommendation results and supporting data.
 *
 * Two cache instances are exposed:
 *   recommendationCache  — scored product lists (TTL: 5 min)
 *   affinityCache        — co-purchase matrix (TTL: 1 hour)
 *
 * In production, replace the in-process Map with Redis:
 *   await redis.setex(key, ttlSeconds, JSON.stringify(value));
 *   const hit = JSON.parse(await redis.get(key) || 'null');
 */

'use strict';

class TTLCache {
  /**
   * @param {object} options
   * @param {number} options.ttlMs     Time-to-live in milliseconds
   * @param {number} options.maxSize   Max entries before LRU eviction
   * @param {string} options.name      Label for logging
   */
  constructor({ ttlMs = 5 * 60 * 1000, maxSize = 500, name = 'cache' } = {}) {
    this.ttlMs   = ttlMs;
    this.maxSize = maxSize;
    this.name    = name;
    this.store   = new Map(); // insertion-order = LRU order
    this.hits    = 0;
    this.misses  = 0;
  }

  // ── Core operations ─────────────────────────────────────────────

  get(key) {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most-recently-used)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlOverrideMs) {
    // Evict LRU entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    const ttl = ttlOverrideMs ?? this.ttlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
    return this;
  }

  del(key) {
    return this.store.delete(key);
  }

  /** Invalidate all keys that start with a given prefix */
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

  flush() {
    const size = this.store.size;
    this.store.clear();
    return size;
  }

  // ── Utilities ────────────────────────────────────────────────────

  get size() { return this.store.size; }

  get hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : parseFloat((this.hits / total * 100).toFixed(1));
  }

  stats() {
    return {
      name:    this.name,
      size:    this.store.size,
      maxSize: this.maxSize,
      hits:    this.hits,
      misses:  this.misses,
      hitRate: `${this.hitRate}%`,
      ttlMs:   this.ttlMs,
    };
  }

  /**
   * getOrSet — common cache-aside pattern helper.
   * If key exists, returns cached value.
   * Otherwise calls compute(), caches the result, and returns it.
   *
   * @param {string}   key
   * @param {Function} compute   async () => value
   * @param {number}   [ttlMs]   optional TTL override
   */
  async getOrSet(key, compute, ttlMs) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const fresh = await compute();
    if (fresh !== null && fresh !== undefined) this.set(key, fresh, ttlMs);
    return fresh;
  }
}


// ── Shared cache instances ────────────────────────────────────────

/** Recommendation result cache — short TTL (results change with new products/orders) */
const recommendationCache = new TTLCache({
  name:    'recommendations',
  ttlMs:   5 * 60 * 1000,   // 5 minutes
  maxSize: 2000,
});

/** Co-purchase affinity matrix — longer TTL (recomputed from DB) */
const affinityCache = new TTLCache({
  name:    'affinity',
  ttlMs:   60 * 60 * 1000,  // 1 hour
  maxSize: 10,               // only a handful of matrices (one per date window)
});

/** Product data cache — avoids hitting DB on every request */
const productDataCache = new TTLCache({
  name:    'productData',
  ttlMs:   2 * 60 * 1000,   // 2 minutes
  maxSize: 100,
});


// ── Cache key builders ────────────────────────────────────────────

/**
 * Build a deterministic cache key from the recommendation request context.
 * Normalise and sort so equivalent requests hit the same key.
 */
function buildRecommendationKey(context) {
  const parts = [
    `strategy:${context.strategy || 'personal'}`,
    context.vehicle?.brand ? `brand:${context.vehicle.brand.toLowerCase()}` : '',
    context.vehicle?.model ? `model:${context.vehicle.model.toLowerCase()}` : '',
    context.vehicle?.year  ? `year:${context.vehicle.year}`                 : '',
    context.viewedProductIds?.length
      ? `viewed:${[...context.viewedProductIds].sort().slice(0, 5).join(',')}` : '',
    `limit:${context.limit || 10}`,
    `category:${context.categoryId || ''}`,
  ];
  return parts.filter(Boolean).join('|');
}


module.exports = {
  recommendationCache,
  affinityCache,
  productDataCache,
  buildRecommendationKey,
  TTLCache,
};
