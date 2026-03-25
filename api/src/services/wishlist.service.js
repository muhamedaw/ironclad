/**
 * services/wishlist.service.js
 * Toggle products in/out of a user's wishlist.
 */

const { Wishlist, Product } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { getPagination } = require('../utils/response');

class WishlistService {
  /**
   * Get all wishlisted products for a user (paginated).
   */
  async getAll(userId, query) {
    const { page, limit, offset } = getPagination(query, 50);

    const { count, rows } = await Wishlist.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: Product,
        as: 'product',
        where: { is_active: true },
        attributes: ['id', 'name', 'sku', 'brand', 'model', 'price', 'original_price',
                     'images', 'rating_avg', 'rating_count', 'stock_quantity', 'category'],
        required: true, // INNER JOIN — exclude if product removed
      }],
    });

    return { rows: rows.map(r => r.product), count, page, limit };
  }

  /**
   * Toggle a product in the user's wishlist.
   * Returns { action: 'added' | 'removed', productId }
   */
  async toggle(userId, productId) {
    const product = await Product.findOne({ where: { id: productId, is_active: true } });
    if (!product) throw ApiError.notFound('Product');

    const existing = await Wishlist.findOne({ where: { user_id: userId, product_id: productId } });

    if (existing) {
      await existing.destroy();
      return { action: 'removed', productId };
    }

    await Wishlist.create({ user_id: userId, product_id: productId });
    return { action: 'added', productId };
  }

  /**
   * Check whether a specific product is in the user's wishlist.
   */
  async check(userId, productId) {
    const entry = await Wishlist.findOne({ where: { user_id: userId, product_id: productId } });
    return { wishlisted: !!entry };
  }

  /**
   * Remove a single product from the wishlist.
   */
  async remove(userId, productId) {
    const entry = await Wishlist.findOne({ where: { user_id: userId, product_id: productId } });
    if (!entry) throw ApiError.notFound('Wishlist item');
    await entry.destroy();
    return true;
  }
}

module.exports = new WishlistService();
