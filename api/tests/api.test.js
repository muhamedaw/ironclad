/**
 * tests/api.test.js
 * Integration tests using supertest (in-memory SQLite via Sequelize).
 * Run: npm test
 */

// Use SQLite for tests — no MySQL instance needed
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters-long!';
process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.BCRYPT_ROUNDS = '4'; // fast for tests
process.env.API_PREFIX = '/api/v1';
process.env.DB_NAME = ':memory:';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = '';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';

// Override dialect to sqlite for tests
jest.mock('../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: { underscored: true, timestamps: true, paranoid: true, freezeTableName: true },
  });
  const connectDB = async () => {};
  return { sequelize, connectDB };
});

const request = require('supertest');
const app = require('../src/app');
const { syncModels, User, Product } = require('../src/models');

// ── Setup / Teardown ──────────────────────────────────────────────
beforeAll(async () => {
  await syncModels({ force: true });
});

afterAll(async () => {
  const { sequelize } = require('../src/config/database');
  await sequelize.close();
});

// ── Shared state ──────────────────────────────────────────────────
let customerToken, adminToken, productId, orderId;

const API = '/api/v1';

// ─────────────────────────────────────────────────────────────────
// AUTH TESTS
// ─────────────────────────────────────────────────────────────────
describe('Auth', () => {
  test('POST /auth/register — success', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({
        first_name: 'Jane',
        last_name: 'Test',
        email: 'jane@test.com',
        password: 'Password1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).not.toHaveProperty('password');

    customerToken = res.body.data.accessToken;
  });

  test('POST /auth/register — duplicate email → 409', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ first_name: 'Jane', last_name: 'Dup', email: 'jane@test.com', password: 'Password1' });
    expect(res.status).toBe(409);
  });

  test('POST /auth/register — weak password → 422', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ first_name: 'X', last_name: 'Y', email: 'x@test.com', password: 'weak' });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test('POST /auth/login — valid credentials', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'jane@test.com', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('POST /auth/login — wrong password → 401', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'jane@test.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/register — create admin user', async () => {
    // Create admin directly in DB (register endpoint always creates customers)
    const admin = await User.create({
      first_name: 'Admin', last_name: 'User',
      email: 'admin@test.com', password: 'Admin1234', role: 'admin',
    });
    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'admin@test.com', password: 'Admin1234' });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.accessToken;
  });

  test('GET /auth/me — returns profile', async () => {
    const res = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('jane@test.com');
  });

  test('GET /auth/me — no token → 401', async () => {
    const res = await request(app).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────
// PRODUCT TESTS
// ─────────────────────────────────────────────────────────────────
describe('Products', () => {
  test('GET /products — public list (empty)', async () => {
    const res = await request(app).get(`${API}/products`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  test('POST /products — customer → 403', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Test Part', sku: 'TP-001', brand: 'BMW', model: '3 Series', year_from: 2018, category: 'brakes', price: 49.99 });
    expect(res.status).toBe(403);
  });

  test('POST /products — admin creates product', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'OEM Brake Pads',
        sku: 'BP-001',
        brand: 'BMW',
        model: '3 Series',
        year_from: 2015,
        year_to: 2022,
        category: 'brakes',
        price: 89.99,
        original_price: 109.99,
        stock_quantity: 25,
        description: 'High-quality brake pads.',
        images: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('BP-001');
    productId = res.body.data.id;
  });

  test('POST /products — duplicate SKU → 409', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dup', sku: 'BP-001', brand: 'BMW', model: '3 Series', year_from: 2015, category: 'brakes', price: 50 });
    expect(res.status).toBe(409);
  });

  test('GET /products — returns created product', async () => {
    const res = await request(app).get(`${API}/products`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].name).toBe('OEM Brake Pads');
  });

  test('GET /products?brand=BMW — filter by brand', async () => {
    const res = await request(app).get(`${API}/products?brand=BMW`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(p => p.brand === 'BMW')).toBe(true);
  });

  test('GET /products?brand=Toyota — filter returns empty', async () => {
    const res = await request(app).get(`${API}/products?brand=Toyota`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });

  test('GET /products?year=2019 — year range filter', async () => {
    const res = await request(app).get(`${API}/products?year=2019`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });

  test('GET /products?year=2025 — out of range → empty', async () => {
    const res = await request(app).get(`${API}/products?year=2025`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });

  test('GET /products/:id — full product detail', async () => {
    const res = await request(app).get(`${API}/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(productId);
    expect(res.body.data.description).toBeDefined();
  });

  test('GET /products/:id — unknown id → 404', async () => {
    const res = await request(app).get(`${API}/products/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  test('GET /products?page=1&limit=5 — pagination meta', async () => {
    const res = await request(app).get(`${API}/products?page=1&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5, totalPages: 1 });
  });

  test('PUT /products/:id — admin updates price', async () => {
    const res = await request(app)
      .put(`${API}/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 79.99 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.price)).toBe(79.99);
  });

  test('DELETE /products/:id — customer → 403', async () => {
    const res = await request(app)
      .delete(`${API}/products/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────
// ORDER TESTS
// ─────────────────────────────────────────────────────────────────
describe('Orders', () => {
  test('POST /orders — create order successfully', async () => {
    const res = await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ product_id: productId, quantity: 2 }],
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
        payment_method: 'card',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order_number).toMatch(/^IC-/);
    expect(res.body.data.items).toHaveLength(1);
    expect(parseFloat(res.body.data.items[0].unit_price)).toBe(79.99); // snapshotted price
    orderId = res.body.data.id;
  });

  test('POST /orders — stock deducted after order', async () => {
    const product = await Product.findByPk(productId);
    expect(product.stock_quantity).toBe(23); // started at 25, ordered 2
  });

  test('POST /orders — insufficient stock → 422', async () => {
    const res = await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ product_id: productId, quantity: 9999 }],
        shipping_address: { street: '1 St', city: 'NYC', country: 'US' },
      });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test('GET /orders — customer sees own orders', async () => {
    const res = await request(app)
      .get(`${API}/orders`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });

  test('GET /orders — unauthenticated → 401', async () => {
    const res = await request(app).get(`${API}/orders`);
    expect(res.status).toBe(401);
  });

  test('GET /orders/:id — get order detail', async () => {
    const res = await request(app)
      .get(`${API}/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
  });

  test('PATCH /orders/:id/status — customer cancels order', async () => {
    const res = await request(app)
      .patch(`${API}/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('PATCH /orders/:id/status — stock restored after cancellation', async () => {
    const product = await Product.findByPk(productId);
    expect(product.stock_quantity).toBe(25); // restored
  });

  test('DELETE /products/:id — admin soft-deletes', async () => {
    const res = await request(app)
      .delete(`${API}/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('GET /products/:id — soft-deleted → 404', async () => {
    const res = await request(app).get(`${API}/products/${productId}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────
// SECURITY TESTS
// ─────────────────────────────────────────────────────────────────
describe('Security', () => {
  test('POST with wrong Content-Type → 400', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set('Content-Type', 'text/plain')
      .send('email=a@b.com&password=test');
    expect(res.status).toBe(400);
  });

  test('GET /health — returns 200', async () => {
    const res = await request(app).get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Unknown route → 404', async () => {
    const res = await request(app).get(`${API}/nonexistent`);
    expect(res.status).toBe(404);
  });

  test('Invalid UUID param → handled gracefully', async () => {
    const res = await request(app).get(`${API}/products/not-a-uuid`);
    // Either 404 (no match) or 400 — not 500
    expect([400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────
// WISHLIST TESTS
// ─────────────────────────────────────────────────────────────────
describe('Wishlist', () => {
  let wishlistProductId;

  beforeAll(async () => {
    // Create a product to wishlist
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wishlist Test Part',
        sku: 'WL-TEST-001',
        brand: 'Honda',
        model: 'Civic',
        year_from: 2018,
        category: 'engine',
        price: 59.99,
        stock_quantity: 10,
      });
    wishlistProductId = res.body.data?.id;
  });

  test('GET /wishlist — empty list', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });

  test('GET /wishlist — unauthenticated → 401', async () => {
    const res = await request(app).get('/api/v1/wishlist');
    expect(res.status).toBe(401);
  });

  test('POST /wishlist/:id — toggle adds product', async () => {
    const res = await request(app)
      .post(`/api/v1/wishlist/${wishlistProductId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('added');
  });

  test('GET /wishlist — product appears in list', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });

  test('GET /wishlist/:id — check membership returns true', async () => {
    const res = await request(app)
      .get(`/api/v1/wishlist/${wishlistProductId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlisted).toBe(true);
  });

  test('POST /wishlist/:id — toggle removes product', async () => {
    const res = await request(app)
      .post(`/api/v1/wishlist/${wishlistProductId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('removed');
  });

  test('GET /wishlist — list is empty again', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// REVIEW TESTS
// ─────────────────────────────────────────────────────────────────
describe('Reviews', () => {
  let reviewProductId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Review Test Rotor',
        sku: 'RV-TEST-001',
        brand: 'Toyota',
        model: 'RAV4',
        year_from: 2019,
        category: 'brakes',
        price: 129.99,
        stock_quantity: 20,
      });
    reviewProductId = res.body.data?.id;
  });

  test('GET /products/:id/reviews — empty list', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${reviewProductId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });

  test('POST /products/:id/reviews — submit review', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${reviewProductId}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, title: 'Excellent rotor', body: 'Perfect fit and great stopping power.' });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);
  });

  test('GET /products/:id/reviews — review appears', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${reviewProductId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].rating).toBe(5);
  });

  test('POST /products/:id/reviews — unauthenticated → 401', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${reviewProductId}/reviews`)
      .send({ rating: 3 });
    expect(res.status).toBe(401);
  });

  test('POST /products/:id/reviews — rating out of range → 422', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${reviewProductId}/reviews`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 6 });
    expect(res.status).toBe(422);
  });

  test('POST /products/:id/reviews — upsert updates existing review', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${reviewProductId}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, title: 'Updated: still great', body: 'Works well after 3 months.' });
    expect(res.status).toBe(200); // 200 = updated, not 201
    expect(res.body.data.rating).toBe(4);
  });

  test('GET /products/:id — rating_avg updated after review', async () => {
    // Give the async hook time to update
    await new Promise(r => setTimeout(r, 100));
    const res = await request(app).get(`/api/v1/products/${reviewProductId}`);
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.rating_avg)).toBeGreaterThan(0);
  });
});
