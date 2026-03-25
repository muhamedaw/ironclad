/**
 * routes/admin.routes.js
 * Admin-only endpoints: stats dashboard, review moderation, user management.
 * All routes require protect + authorize('admin').
 */

const { Router } = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendPaginated, getPagination } = require('../utils/response');
const { User, Product, Order, OrderItem, Review } = require('../models');
const reviewCtrl = require('../controllers/review.controller');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/errorHandler');

const router = Router();
router.use(protect, authorize('admin'));

// ─────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────

/**
 * GET /admin/stats
 * Returns key metrics for the admin dashboard.
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Run all queries in parallel
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    revenueThis,
    revenueLast,
    recentOrders,
    lowStock,
    topProducts,
  ] = await Promise.all([
    // Counts
    User.count({ where: { role: 'customer' } }),
    Product.count({ where: { is_active: true } }),
    Order.count(),
    Order.count({ where: { status: 'pending' } }),

    // Revenue this month
    Order.sum('total', {
      where: { status: { [Op.notIn]: ['cancelled', 'refunded'] }, created_at: { [Op.gte]: startOfMonth } },
    }),

    // Revenue last month (for comparison)
    Order.sum('total', {
      where: {
        status: { [Op.notIn]: ['cancelled', 'refunded'] },
        created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] },
      },
    }),

    // 5 most recent orders
    Order.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'order_number', 'total', 'status', 'created_at'],
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    }),

    // Products with stock < 5
    Product.findAll({
      where: { stock_quantity: { [Op.lt]: 5 }, is_active: true },
      order: [['stock_quantity', 'ASC']],
      attributes: ['id', 'name', 'sku', 'stock_quantity'],
      limit: 10,
    }),

    // Top 5 best-selling products (by total quantity sold)
    OrderItem.findAll({
      attributes: [
        'product_id',
        'product_name',
        [fn('SUM', col('quantity')), 'total_sold'],
        [fn('SUM', col('line_total')), 'total_revenue'],
      ],
      group: ['product_id', 'product_name'],
      order: [[literal('total_sold'), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const revenueThisNum = parseFloat(revenueThis || 0);
  const revenueLastNum = parseFloat(revenueLast || 0);
  const revenueChange  = revenueLastNum > 0
    ? (((revenueThisNum - revenueLastNum) / revenueLastNum) * 100).toFixed(1)
    : null;

  return sendSuccess(res, {
    overview: {
      total_users:     totalUsers,
      total_products:  totalProducts,
      total_orders:    totalOrders,
      pending_orders:  pendingOrders,
      revenue_this_month: revenueThisNum.toFixed(2),
      revenue_last_month: revenueLastNum.toFixed(2),
      revenue_change_pct: revenueChange ? `${revenueChange}%` : 'N/A',
    },
    recent_orders:  recentOrders,
    low_stock:      lowStock,
    top_products:   topProducts,
  }, 'Dashboard stats');
}));

// ─────────────────────────────────────────────────────────────────
// REVENUE CHART DATA  (last 12 months)
// ─────────────────────────────────────────────────────────────────

router.get('/stats/revenue', asyncHandler(async (req, res) => {
  // Build monthly buckets for the last 12 months
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    });
  }

  const data = await Promise.all(
    months.map(async (m) => {
      const revenue = await Order.sum('total', {
        where: {
          status: { [Op.notIn]: ['cancelled', 'refunded'] },
          created_at: { [Op.between]: [m.start, m.end] },
        },
      });
      const orders = await Order.count({
        where: { created_at: { [Op.between]: [m.start, m.end] } },
      });
      return { label: m.label, revenue: parseFloat(revenue || 0).toFixed(2), orders };
    })
  );

  return sendSuccess(res, data, 'Revenue chart data');
}));

// ─────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────

/** GET /admin/users */
router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

  const { count, rows } = await User.scope('safe').findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return sendPaginated(res, rows, count, page, limit);
}));

/** PATCH /admin/users/:id/status — activate or suspend */
router.patch('/users/:id/status',
  [body('is_active').isBoolean().withMessage('is_active must be boolean').toBoolean()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      const { ApiError } = require('../utils/ApiError');
      throw ApiError.notFound('User');
    }
    await user.update({ is_active: req.body.is_active });
    return sendSuccess(res, user.toSafeJSON(),
      `User ${req.body.is_active ? 'activated' : 'suspended'}`);
  })
);

// ─────────────────────────────────────────────────────────────────
// REVIEW MODERATION
// ─────────────────────────────────────────────────────────────────

/** GET  /admin/reviews */
router.get('/reviews', reviewCtrl.adminListReviews);

/** PATCH /admin/reviews/:id/approve */
router.patch('/reviews/:id/approve',
  [body('approved').isBoolean().toBoolean()],
  handleValidation,
  reviewCtrl.approveReview
);

/** DELETE /admin/reviews/:id */
router.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const { Review: ReviewModel } = require('../models');
  const review = await ReviewModel.findByPk(req.params.id);
  if (!review) {
    const { ApiError } = require('../utils/ApiError');
    throw ApiError.notFound('Review');
  }
  await review.destroy();
  return sendSuccess(res, null, 'Review deleted');
}));

// ─────────────────────────────────────────────────────────────────
// INVENTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────

/** PATCH /admin/products/:id/stock — adjust stock directly */
router.patch('/products/:id/stock',
  [
    body('stock_quantity')
      .notEmpty().withMessage('stock_quantity is required')
      .isInt({ min: 0 }).withMessage('stock_quantity must be ≥ 0')
      .toInt(),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      const { ApiError } = require('../utils/ApiError');
      throw ApiError.notFound('Product');
    }
    await product.update({ stock_quantity: req.body.stock_quantity });
    return sendSuccess(res, { id: product.id, sku: product.sku, stock_quantity: product.stock_quantity },
      'Stock updated');
  })
);

module.exports = router;
