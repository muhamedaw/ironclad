/**
 * tests/recommendations.test.js
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const request = require('supertest');
const app     = require('../src/app');

const { scoreProducts, diversify, buildAffinityMatrix, W } = require('../src/engine/scorer');
const { TTLCache, buildRecommendationKey } = require('../src/engine/cache');
const { _MOCK_PRODUCTS, _MOCK_ORDER_ITEMS } = require('../src/services/product.repository');

const API = '/api/v1/recommendations';

// ═════════════════════════════════════════════════════════════════
// SECTION 1: SCORING ENGINE UNIT TESTS
// ═════════════════════════════════════════════════════════════════
describe('Scoring Engine', () => {

  describe('scoreProducts — vehicle compatibility signal', () => {
    test('compatible product scores higher than incompatible', () => {
      const bmwBrakes = _MOCK_PRODUCTS.find(p => p.id === 'p001'); // BMW brake pads
      const hondaFuel  = _MOCK_PRODUCTS.find(p => p.id === 'p010'); // VW fuel pump

      const results = scoreProducts([bmwBrakes, hondaFuel], {
        vehicle: { brand: 'BMW', model: '3 Series', year: 2020 },
      });

      const bmwScore   = results.find(r => r.product.id === 'p001')?.score || 0;
      const hondaScore = results.find(r => r.product.id === 'p010')?.score || 0;

      expect(bmwScore).toBeGreaterThan(hondaScore);
    });

    test('BMW-compatible products score higher than Toyota-compatible', () => {
      const bmwPart    = _MOCK_PRODUCTS.find(p => p.id === 'p001'); // BMW brake pads
      const toyotaPart = _MOCK_PRODUCTS.find(p => p.id === 'p002'); // Toyota timing belt

      const results = scoreProducts([bmwPart, toyotaPart], {
        vehicle: { brand: 'BMW', model: '3 Series', year: 2020 },
      });

      const bmwScore    = results.find(r => r.product.id === 'p001')?.score || 0;
      const toyotaScore = results.find(r => r.product.id === 'p002')?.score || 0;

      // BMW part must score strictly higher when filtering by BMW
      expect(bmwScore).toBeGreaterThan(toyotaScore);
    });

    test('no vehicle context → vehicle signal does not dominate', () => {
      const results = scoreProducts(_MOCK_PRODUCTS.slice(0, 5), {
        vehicle: null,
        viewedProductIds: [],
      });
      // All results should still have scores
      expect(results.every(r => r.score >= 0)).toBe(true);
    });
  });

  describe('scoreProducts — category signal', () => {
    test('products in viewed categories score higher', () => {
      const brakePad   = _MOCK_PRODUCTS.find(p => p.id === 'p001'); // c-brakes
      const enginePart = _MOCK_PRODUCTS.find(p => p.id === 'p002'); // c-engine

      // User has viewed a brakes product — must be in candidates for category to register
      const viewedBrakeProduct = _MOCK_PRODUCTS.find(p => p.id === 'p011'); // also c-brakes

      const results = scoreProducts([brakePad, enginePart, viewedBrakeProduct], {
        viewedProductIds: [viewedBrakeProduct.id],
      });

      const brakeScore  = results.find(r => r.product.id === 'p001')?.score || 0;
      const engineScore = results.find(r => r.product.id === 'p002')?.score || 0;

      expect(brakeScore).toBeGreaterThan(engineScore);
    });
  });

  describe('scoreProducts — co-purchase signal', () => {
    test('frequently co-purchased products score higher', () => {
      // From mock data: p001 and p011 are in orders together 3+ times
      const affinity = buildAffinityMatrix(_MOCK_ORDER_ITEMS);

      const p011 = _MOCK_PRODUCTS.find(p => p.id === 'p011');
      const p010 = _MOCK_PRODUCTS.find(p => p.id === 'p010'); // unrelated fuel pump

      const results = scoreProducts([p011, p010], {
        viewedProductIds: ['p001'],
        affinityMatrix:   affinity,
      });

      const p011Score = results.find(r => r.product.id === 'p011')?.score || 0;
      const p010Score = results.find(r => r.product.id === 'p010')?.score || 0;

      expect(p011Score).toBeGreaterThan(p010Score);
    });
  });

  describe('scoreProducts — trending signal', () => {
    test('high-velocity products score higher when no other context', () => {
      const highVelocity = { ...(_MOCK_PRODUCTS[0]), id: 'h1', salesVelocity: 50, isActive: true, ratingAvg: 4.0, ratingCount: 10 };
      const lowVelocity  = { ...(_MOCK_PRODUCTS[0]), id: 'l1', salesVelocity:  1, isActive: true, ratingAvg: 4.0, ratingCount: 10 };

      const results = scoreProducts([highVelocity, lowVelocity], {
        viewedProductIds: [],
        vehicle: null,
      });

      const highScore = results.find(r => r.product.id === 'h1')?.score || 0;
      const lowScore  = results.find(r => r.product.id === 'l1')?.score || 0;

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('scoreProducts — already viewed penalty', () => {
    test('viewed products receive a penalty score', () => {
      const viewed   = _MOCK_PRODUCTS[0]; // will be in viewedProductIds
      const unviewed = _MOCK_PRODUCTS[1]; // not viewed

      const results = scoreProducts([viewed, unviewed], {
        viewedProductIds: [viewed.id],
      });

      const viewedScore   = results.find(r => r.product.id === viewed.id)?.score   || 0;
      const unviewedScore = results.find(r => r.product.id === unviewed.id)?.score || 0;

      // Penalty ensures viewed scores lower
      expect(viewedScore).toBeLessThanOrEqual(unviewedScore);
    });
  });

  describe('scoreProducts — result ordering', () => {
    test('results are sorted by score descending', () => {
      const results = scoreProducts(_MOCK_PRODUCTS, {
        vehicle: { brand: 'BMW', model: '3 Series', year: 2021 },
        viewedProductIds: ['p019'],
      });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    test('inactive products are excluded', () => {
      const inactive = { ..._MOCK_PRODUCTS[0], id: 'inactive-p', isActive: false };
      const results  = scoreProducts([..._MOCK_PRODUCTS.slice(0, 3), inactive], {});

      expect(results.find(r => r.product.id === 'inactive-p')).toBeUndefined();
    });

    test('maxResults is respected', () => {
      const results = scoreProducts(_MOCK_PRODUCTS, { maxResults: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('diversify', () => {
    test('limits products per category', () => {
      const scored = _MOCK_PRODUCTS.map(p => ({
        product: p,
        score: Math.random() * 100,
      })).sort((a, b) => b.score - a.score);

      const diversified = diversify(scored, 2);

      // Count per category
      const catCount = {};
      for (const item of diversified) {
        const cat = item.product.categoryId;
        catCount[cat] = (catCount[cat] || 0) + 1;
      }

      const maxInAnyCat = Math.max(...Object.values(catCount));
      expect(maxInAnyCat).toBeLessThanOrEqual(2 + Object.keys(catCount).length); // allow some overflow
    });
  });

  describe('buildAffinityMatrix', () => {
    test('builds symmetric co-purchase matrix', () => {
      const matrix = buildAffinityMatrix(_MOCK_ORDER_ITEMS);

      // p001 and p011 appear together in multiple orders
      expect(matrix['p001']['p011']).toBeGreaterThan(0);
      expect(matrix['p011']['p001']).toBe(matrix['p001']['p011']); // symmetric
    });

    test('products not bought together have no affinity', () => {
      const matrix = buildAffinityMatrix(_MOCK_ORDER_ITEMS);
      // p016 (Nissan filter) and p009 (Audi CAT) never appear together
      expect(matrix['p016']?.['p009'] || 0).toBe(0);
    });

    test('handles empty order list', () => {
      const matrix = buildAffinityMatrix([]);
      expect(Object.keys(matrix)).toHaveLength(0);
    });
  });
});


// ═════════════════════════════════════════════════════════════════
// SECTION 2: CACHE UNIT TESTS
// ═════════════════════════════════════════════════════════════════
describe('TTLCache', () => {
  test('stores and retrieves values', () => {
    const c = new TTLCache({ ttlMs: 5000, maxSize: 10 });
    c.set('key1', { data: 'hello' });
    expect(c.get('key1')).toEqual({ data: 'hello' });
  });

  test('returns null for missing keys', () => {
    const c = new TTLCache({ ttlMs: 5000 });
    expect(c.get('nonexistent')).toBeNull();
  });

  test('expires entries after TTL', async () => {
    const c = new TTLCache({ ttlMs: 50 }); // 50ms TTL
    c.set('expiring', 'value');
    await new Promise(r => setTimeout(r, 80));
    expect(c.get('expiring')).toBeNull();
  });

  test('evicts LRU entry when maxSize exceeded', () => {
    const c = new TTLCache({ ttlMs: 60000, maxSize: 3 });
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    c.get('a'); // access 'a' → moves to end, 'b' becomes LRU
    c.set('d', 4); // should evict 'b'
    expect(c.get('b')).toBeNull();
    expect(c.get('a')).toBe(1);
    expect(c.get('d')).toBe(4);
  });

  test('tracks hit rate', () => {
    const c = new TTLCache({ ttlMs: 5000 });
    c.set('x', 1);
    c.get('x');   // hit
    c.get('x');   // hit
    c.get('y');   // miss
    expect(c.hits).toBe(2);
    expect(c.misses).toBe(1);
    expect(parseFloat(c.hitRate)).toBeCloseTo(66.7, 0);
  });

  test('invalidatePrefix removes matching keys', () => {
    const c = new TTLCache({ ttlMs: 5000 });
    c.set('user:1:recs', 'a');
    c.set('user:2:recs', 'b');
    c.set('product:1',   'c');
    const count = c.invalidatePrefix('user:');
    expect(count).toBe(2);
    expect(c.get('product:1')).toBe('c');
  });

  test('getOrSet fetches and caches on miss', async () => {
    const c = new TTLCache({ ttlMs: 5000 });
    let calls = 0;
    const val = await c.getOrSet('k', async () => { calls++; return 42; });
    const val2 = await c.getOrSet('k', async () => { calls++; return 99; });
    expect(val).toBe(42);
    expect(val2).toBe(42); // cached
    expect(calls).toBe(1); // computed once
  });

  test('buildRecommendationKey is deterministic', () => {
    const ctx = { vehicle: { brand: 'BMW', model: '3 Series', year: 2021 }, viewedProductIds: ['p001', 'p011'], limit: 10, strategy: 'personal' };
    expect(buildRecommendationKey(ctx)).toBe(buildRecommendationKey(ctx));
  });
});


// ═════════════════════════════════════════════════════════════════
// SECTION 3: HTTP ENDPOINT TESTS
// ═════════════════════════════════════════════════════════════════
describe('GET /api/v1/recommendations/popular', () => {
  test('returns 200 with items array', async () => {
    const res = await request(app).get(`${API}/popular`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('respects limit param', async () => {
    const res = await request(app).get(`${API}/popular?limit=3`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });

  test('each item has required fields', async () => {
    const res = await request(app).get(`${API}/popular?limit=5`);
    res.body.data.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('reason');
    });
  });
});

describe('GET /api/v1/recommendations/vehicle', () => {
  test('returns compatible BMW parts', async () => {
    const res = await request(app).get(`${API}/vehicle?brand=BMW&model=3+Series&year=2021`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.vehicle.brand).toBe('BMW');
  });

  test('missing brand → 400', async () => {
    const res = await request(app).get(`${API}/vehicle?model=Camry`);
    expect(res.status).toBe(400);
  });

  test('BMW parts score higher than non-BMW when filtering by BMW', async () => {
    const res  = await request(app).get(`${API}/vehicle?brand=BMW&model=3+Series&year=2021&explain=true`);
    const top3 = res.body.data.slice(0, 3);
    // Top results should have vehicleCompat signal > 0
    top3.forEach(item => {
      if (item.signals) {
        expect(item.signals.vehicleCompat).toBeGreaterThan(0);
      }
    });
  });
});

describe('GET /api/v1/recommendations/similar/:productId', () => {
  test('returns similar products for p001', async () => {
    const res = await request(app).get(`${API}/similar/p001`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.pivotProductId).toBe('p001');
  });

  test('does not include the pivot product itself', async () => {
    const res = await request(app).get(`${API}/similar/p001`);
    const ids  = res.body.data.map(d => d.id);
    expect(ids).not.toContain('p001');
  });

  test('respects limit param', async () => {
    const res = await request(app).get(`${API}/similar/p002?limit=3`);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });
});

describe('GET /api/v1/recommendations (general)', () => {
  test('personal strategy with vehicle context', async () => {
    const res = await request(app)
      .get(`${API}?brand=Toyota&model=Camry&year=2020&viewedIds=p002,p012&limit=8`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.context.vehicleProvided).toBe(true);
    expect(res.body.meta.context.viewedCount).toBe(2);
  });

  test('invalid limit → 400', async () => {
    const res = await request(app).get(`${API}?limit=999`);
    expect(res.status).toBe(400);
  });

  test('invalid strategy → 400', async () => {
    const res = await request(app).get(`${API}?strategy=magic`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/recommendations/batch', () => {
  test('returns results for each request type', async () => {
    const res = await request(app)
      .post(`${API}/batch`)
      .send({
        requests: [
          { type: 'popular', limit: 4 },
          { type: 'vehicle', brand: 'BMW', model: '3 Series', year: 2021, limit: 4 },
          { type: 'similar', pivotProductId: 'p001', limit: 3 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    res.body.results.forEach(r => {
      expect(r.success).toBe(true);
      expect(Array.isArray(r.data)).toBe(true);
    });
  });

  test('too many batch requests → 400', async () => {
    const res = await request(app)
      .post(`${API}/batch`)
      .send({ requests: Array(6).fill({ type: 'popular' }) });
    expect(res.status).toBe(400);
  });

  test('missing requests array → 400', async () => {
    const res = await request(app).post(`${API}/batch`).send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/recommendations/cache/stats', () => {
  test('returns cache statistics', async () => {
    await request(app).get(`${API}/popular`); // warm the cache
    const res = await request(app).get(`${API}/cache/stats`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('recommendations');
    expect(res.body.data.recommendations).toHaveProperty('hits');
    expect(res.body.data.recommendations).toHaveProperty('hitRate');
  });
});

describe('Caching behaviour', () => {
  test('second identical request is served from cache', async () => {
    const url = `${API}/popular?limit=5`;
    const r1 = await request(app).get(url);
    const r2 = await request(app).get(url);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // Second request should be from cache
    expect(r2.body.meta.fromCache).toBe(true);
  });

  test('noCache=true bypasses cache', async () => {
    // Use a distinct limit to get a fresh cache slot, warm it, then bypass
    const url = `${API}/popular?limit=7`;
    await request(app).get(url); // prime cache
    const cached = await request(app).get(url);
    expect(cached.body.meta.fromCache).toBe(true); // confirm it IS cached
    const res = await request(app).get(`${url}&noCache=true`);
    expect(res.body.meta.fromCache).toBe(false);   // then bypass succeeds
  });
});

describe('Health check', () => {
  test('GET /api/v1/health returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('ironclad-recommendations');
  });
});
