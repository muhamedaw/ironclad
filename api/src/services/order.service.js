/**
 * services/order.service.js
 * Order creation and management with atomic stock deduction.
 * Uses Sequelize transactions to ensure consistency.
 */

const { v4: uuidv4 } = require('uuid');
const { sequelize, Order, OrderItem, Product, User } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { getPagination } = require('../utils/response');
const productService = require('./product.service');
const logger = require('../utils/logger');

/**
 * Generate a human-readable order number.
 * Format: IC-YYYYMMDD-XXXXX  (IC = Ironclad)
 */
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `IC-${dateStr}-${rand}`;
}

class OrderService {
  /**
   * Create a new order.
   *
   * Flow:
   *  1. Validate all items exist and have sufficient stock
   *  2. Open a DB transaction
   *  3. Snapshot prices from DB (not from client — prevents price manipulation)
   *  4. Deduct stock for each item
   *  5. Create Order + OrderItems
   *  6. Commit or rollback
   */
  async create(userId, { items, shipping_address, payment_method, notes }) {
    // ── 1. Pre-flight stock validation ─────────────────────────
    const stockErrors = await productService.validateStock(items);
    if (stockErrors.length > 0) {
      throw ApiError.unprocessable('Some items are unavailable', stockErrors);
    }

    // ── 2. Fetch product snapshots ──────────────────────────────
    const productIds = items.map(i => i.product_id);
    const products = await Product.findAll({
      where: { id: productIds, is_active: true },
      attributes: ['id', 'name', 'sku', 'price', 'stock_quantity'],
    });

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // ── 3. Calculate totals ─────────────────────────────────────
    let subtotal = 0;
    const lineItems = items.map(item => {
      const product = productMap[item.product_id];
      if (!product) throw ApiError.notFound(`Product ${item.product_id}`);

      const lineTotal = parseFloat((product.price * item.quantity).toFixed(2));
      subtotal += lineTotal;

      return {
        id: uuidv4(),
        product_id: product.id,
        product_name: product.name,    // snapshot
        product_sku: product.sku,      // snapshot
        unit_price: product.price,     // snapshot — ignore client-sent price
        quantity: item.quantity,
        line_total: lineTotal,
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    const shippingCost = subtotal >= 99 ? 0 : 12.99;
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + shippingCost + tax).toFixed(2));

    // ── 4. Atomic transaction ───────────────────────────────────
    const transaction = await sequelize.transaction();
    try {
      // Create order header
      const order = await Order.create(
        {
          id: uuidv4(),
          order_number: generateOrderNumber(),
          user_id: userId,
          subtotal,
          shipping_cost: shippingCost,
          tax,
          total,
          status: 'pending',
          shipping_address,
          payment_method: payment_method || 'card',
          payment_status: 'pending',
          notes: notes || null,
        },
        { transaction }
      );

      // Create line items
      await OrderItem.bulkCreate(
        lineItems.map(li => ({ ...li, order_id: order.id })),
        { transaction }
      );

      // Deduct stock for each item
      await Promise.all(
        lineItems.map(li =>
          productService.adjustStock(li.product_id, -li.quantity, transaction)
        )
      );

      await transaction.commit();

      logger.info(`Order created: ${order.order_number} [user: ${userId}] total: $${order.total}`);

      // Return full order with items
      return this.getById(order.id, userId);
    } catch (err) {
      await transaction.rollback();
      logger.error(`Order creation failed for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get all orders for a user (customers see own; admins see all).
   */
  async getAll(userId, role, query) {
    const { page, limit, offset } = getPagination(query);

    const where = {};
    if (role !== 'admin') where.user_id = userId; // customers only see their own

    if (query.status) where.status = query.status;

    const { count, rows } = await Order.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: ['id', 'product_name', 'product_sku', 'unit_price', 'quantity', 'line_total'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    return { rows, count, page, limit };
  }

  /**
   * Get a single order by ID.
   * Customers can only see their own orders.
   */
  async getById(orderId, userId, role = 'customer') {
    const where = { id: orderId };
    if (role !== 'admin') where.user_id = userId;

    const order = await Order.findOne({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: [
            'id', 'product_id', 'product_name', 'product_sku',
            'unit_price', 'quantity', 'line_total',
          ],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'images', 'is_active'],
              required: false,
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
        },
      ],
    });

    if (!order) throw ApiError.notFound('Order');
    return order;
  }

  /**
   * Update order status (admin only, or cancel by customer).
   */
  async updateStatus(orderId, { status, tracking_number }, userId, role) {
    const order = await Order.findByPk(orderId);
    if (!order) throw ApiError.notFound('Order');

    // Customers can only cancel their own pending orders
    if (role !== 'admin') {
      if (order.user_id !== userId) throw ApiError.forbidden('Access denied');
      if (status !== 'cancelled') throw ApiError.forbidden('You can only cancel your own orders');
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw ApiError.badRequest('Order cannot be cancelled at this stage');
      }
    }

    const updates = { status };
    if (tracking_number) updates.tracking_number = tracking_number;
    if (status === 'delivered') updates.payment_status = 'paid';

    // If cancelling, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const items = await OrderItem.findAll({ where: { order_id: orderId } });
      const transaction = await sequelize.transaction();
      try {
        await order.update(updates, { transaction });
        await Promise.all(
          items.map(item =>
            productService.adjustStock(item.product_id, item.quantity, transaction)
          )
        );
        await transaction.commit();
        logger.info(`Order ${order.order_number} cancelled — stock restored`);
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } else {
      await order.update(updates);
    }

    logger.info(`Order ${order.order_number} status → ${status} [by: ${userId}]`);
    return order.reload();
  }
}

module.exports = new OrderService();
