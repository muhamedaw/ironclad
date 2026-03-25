/**
 * routes/index.js
 * Central router — mounts all sub-routers under the API prefix.
 */

const { Router } = require('express');
const authRoutes    = require('./auth.routes');
const productRoutes = require('./product.routes');
const orderRoutes   = require('./order.routes');
const reviewRoutes  = require('./review.routes');
const adminRoutes   = require('./admin.routes');
const { wishlistRouter } = require('../controllers/wishlist.controller');
const { protect, authorize } = require('../middleware/auth');
const { cacheStats, flushCache } = require('../middleware/cache');

const router = Router();

// ── Health check ───────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ironclad API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV,
  });
});

// ── Route mounts ──────────────────────────────────────────────────────
router.use('/auth',                             authRoutes);
router.use('/products',                         productRoutes);
router.use('/products/:productId/reviews',      reviewRoutes);
router.use('/orders',                           orderRoutes);
router.use('/wishlist',                         wishlistRouter);
router.use('/admin',                            adminRoutes);

// Cache management (admin only)
router.get('/admin/cache',                      protect, authorize('admin'), cacheStats);
router.delete('/admin/cache',                   protect, authorize('admin'), flushCache);

module.exports = router;
