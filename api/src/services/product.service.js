/**
 * services/product.service.js
 * All product business logic — filtering, pagination, CRUD.
 * Controllers stay thin and delegate here.
 */

const { Op } = require('sequelize');
const { Product } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { getPagination } = require('../utils/response');
const logger = require('../utils/logger');

class ProductService {
  /**
   * List products with filters, sorting, and pagination.
   *
   * Query params supported:
   *   brand, model, year, category,
   *   min_price, max_price, in_stock, featured,
   *   search, sort, page, limit
   */
  async getAll(query) {
    const { page, limit, offset } = getPagination(query);

    // ── Build WHERE clause ──────────────────────────────────────
    const where = { is_active: true };

    // Vehicle compatibility filter
    if (query.brand)    where.brand = query.brand;
    if (query.model)    where.model = query.model;

    // Year must fall within the part's supported year range
    if (query.year) {
      const year = parseInt(query.year, 10);
      where.year_from = { [Op.lte]: year };
      where[Op.or] = [
        { year_to: { [Op.gte]: year } },
        { year_to: null }, // null year_to means "current"
      ];
    }

    if (query.category) where.category = query.category;
    if (query.featured === true) where.is_featured = true;

    // Stock filter
    if (query.in_stock === true) {
      where.stock_quantity = { [Op.gt]: 0 };
    }

    // Price range
    if (query.min_price !== undefined || query.max_price !== undefined) {
      where.price = {};
      if (query.min_price !== undefined) where.price[Op.gte] = query.min_price;
      if (query.max_price !== undefined) where.price[Op.lte] = query.max_price;
    }

    // Full-text keyword search (falls back to LIKE for SQLite compatibility)
    if (query.search) {
      const term = `%${query.search}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { brand: { [Op.like]: term } },
        { model: { [Op.like]: term } },
        { description: { [Op.like]: term } },
        { sku: { [Op.like]: term } },
      ];
    }

    // ── Build ORDER clause ──────────────────────────────────────
    const ORDER_MAP = {
      price_asc:  [['price', 'ASC']],
      price_desc: [['price', 'DESC']],
      rating:     [['rating_avg', 'DESC'], ['rating_count', 'DESC']],
      newest:     [['created_at', 'DESC']],
      featured:   [['is_featured', 'DESC'], ['rating_avg', 'DESC']],
    };
    const order = ORDER_MAP[query.sort] || ORDER_MAP.featured;

    // ── Execute query ───────────────────────────────────────────
    const { count, rows } = await Product.findAndCountAll({
      where,
      order,
      limit,
      offset,
      // Only select columns needed for list view (avoid loading TEXT description)
      attributes: [
        'id', 'name', 'sku', 'brand', 'model', 'year_from', 'year_to',
        'category', 'price', 'original_price', 'stock_quantity',
        'images', 'rating_avg', 'rating_count', 'is_featured',
        'shipping_days', 'created_at',
      ],
    });

    return { rows, count, page, limit };
  }

  /**
   * Get a single product by ID (full detail).
   */
  async getById(id) {
    const product = await Product.findOne({
      where: { id, is_active: true },
    });
    if (!product) throw ApiError.notFound('Product');
    return product;
  }

  /**
   * Create a new product (admin only).
   */
  async create(data) {
    // Check SKU uniqueness
    const existing = await Product.findOne({ where: { sku: data.sku.toUpperCase() }, paranoid: false });
    if (existing) throw ApiError.conflict(`SKU '${data.sku}' already exists`);

    const product = await Product.create({
      ...data,
      sku: data.sku.toUpperCase(),
      images: data.images || [],
    });

    logger.info(`Product created: ${product.sku} [${product.id}]`);
    return product;
  }

  /**
   * Update an existing product (admin only).
   */
  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) throw ApiError.notFound('Product');

    // If SKU is changing, check uniqueness
    if (data.sku && data.sku.toUpperCase() !== product.sku) {
      const dup = await Product.findOne({ where: { sku: data.sku.toUpperCase() }, paranoid: false });
      if (dup) throw ApiError.conflict(`SKU '${data.sku}' already exists`);
      data.sku = data.sku.toUpperCase();
    }

    await product.update(data);
    logger.info(`Product updated: ${product.sku} [${product.id}]`);
    return product.reload();
  }

  /**
   * Soft-delete a product (admin only).
   * Sets deletedAt via Sequelize paranoid.
   */
  async remove(id) {
    const product = await Product.findByPk(id);
    if (!product) throw ApiError.notFound('Product');
    await product.destroy(); // soft delete
    logger.info(`Product soft-deleted: ${product.sku} [${product.id}]`);
    return true;
  }

  /**
   * Adjust stock — used by order service when an order is placed/cancelled.
   * Wrapped in a transaction-friendly way (pass t if inside a transaction).
   */
  async adjustStock(productId, delta, transaction = null) {
    const product = await Product.findByPk(productId, { transaction });
    if (!product) throw ApiError.notFound('Product');

    const newQty = product.stock_quantity + delta;
    if (newQty < 0) {
      throw ApiError.badRequest(
        `Insufficient stock for "${product.name}" (available: ${product.stock_quantity}, requested: ${Math.abs(delta)})`
      );
    }

    await product.update({ stock_quantity: newQty }, { transaction });
    return product;
  }

  /**
   * Bulk stock check — validates all cart items before order creation.
   * Returns an array of errors or empty array if all OK.
   */
  async validateStock(items) {
    const errors = [];
    await Promise.all(
      items.map(async ({ product_id, quantity }) => {
        const product = await Product.findOne({
          where: { id: product_id, is_active: true },
          attributes: ['id', 'name', 'stock_quantity', 'price'],
        });
        if (!product) {
          errors.push({ product_id, message: 'Product not found or unavailable' });
        } else if (product.stock_quantity < quantity) {
          errors.push({
            product_id,
            name: product.name,
            message: `Only ${product.stock_quantity} in stock (requested ${quantity})`,
          });
        }
      })
    );
    return errors;
  }
}

module.exports = new ProductService();
