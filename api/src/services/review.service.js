/**
 * services/review.service.js
 * Product reviews — one per authenticated user per product.
 * Uses findOrCreate + update to work correctly with both MySQL and SQLite.
 */

const { Review, Product, Order, OrderItem, User } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { getPagination } = require('../utils/response');

class ReviewService {
  /**
   * List approved reviews for a product, newest first.
   */
  async getForProduct(productId, query) {
    const { page, limit, offset } = getPagination(query, 50);

    const product = await Product.findByPk(productId, { attributes: ['id'] });
    if (!product) throw ApiError.notFound('Product');

    const { count, rows } = await Review.findAndCountAll({
      where: { product_id: productId, is_approved: true },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name'],
      }],
      attributes: { exclude: ['is_approved', 'deleted_at'] },
    });

    return { rows, count, page, limit };
  }

  /**
   * Create or update a review.
   * Returns { review, created: boolean }
   * Uses findOrCreate + conditional update for cross-dialect compatibility.
   */
  async upsert(userId, productId, { rating, title, body }) {
    const product = await Product.findOne({ where: { id: productId, is_active: true } });
    if (!product) throw ApiError.notFound('Product');

    // Check verified purchase
    const purchaseExists = await OrderItem.findOne({
      where: { product_id: productId },
      include: [{
        model: Order,
        as: 'order',
        where: { user_id: userId, status: 'delivered' },
        required: true,
      }],
    });

    const defaults = {
      rating,
      title: title || null,
      body: body || null,
      is_verified_purchase: !!purchaseExists,
      is_approved: true,
    };

    const [review, created] = await Review.findOrCreate({
      where: { product_id: productId, user_id: userId },
      defaults,
    });

    if (!created) {
      // Update existing review
      await review.update(defaults);
      await review.reload();
    } else {
      // Manually trigger rating recalculation for newly created reviews
      // (the hook on Review runs asynchronously — force it here for reliability)
      await this._recalcRating(productId);
    }

    return { review, created };
  }

  /**
   * Recalculate and persist product rating_avg + rating_count.
   */
  async _recalcRating(productId) {
    try {
      const { sequelize } = require('../models');
      const result = await Review.findOne({
        where: { product_id: productId, is_approved: true },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg'],
          [sequelize.fn('COUNT', sequelize.col('id')),   'cnt'],
        ],
        raw: true,
      });

      await Product.update(
        {
          rating_avg:   parseFloat(result?.avg || 0).toFixed(2),
          rating_count: parseInt(result?.cnt  || 0, 10),
        },
        { where: { id: productId } }
      );
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error(`Rating recalc failed for product ${productId}: ${err.message}`);
    }
  }

  /**
   * Delete own review (or admin deletes any).
   */
  async remove(reviewId, userId, role) {
    const where = { id: reviewId };
    if (role !== 'admin') where.user_id = userId;

    const review = await Review.findOne({ where });
    if (!review) throw ApiError.notFound('Review');

    const productId = review.product_id;
    await review.destroy();
    await this._recalcRating(productId);
    return true;
  }

  /**
   * Admin: get all reviews (including unapproved).
   */
  async adminList(query) {
    const { page, limit, offset } = getPagination(query);
    const where = {};
    if (query.is_approved !== undefined) where.is_approved = query.is_approved === 'true';
    if (query.product_id) where.product_id = query.product_id;

    const { count, rows } = await Review.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
      ],
      paranoid: false,
    });

    return { rows, count, page, limit };
  }

  /**
   * Admin: approve or reject a review.
   */
  async setApproval(reviewId, approved) {
    const review = await Review.findByPk(reviewId);
    if (!review) throw ApiError.notFound('Review');
    await review.update({ is_approved: approved });
    await this._recalcRating(review.product_id);
    return review;
  }
}

module.exports = new ReviewService();
