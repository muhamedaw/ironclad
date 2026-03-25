/**
 * controllers/order.controller.js
 */

const orderService = require('../services/order.service');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');

/**
 * POST /orders
 * Authenticated — create a new order.
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.create(req.user.id, req.body);
  return sendCreated(res, order, 'Order placed successfully');
});

/**
 * GET /orders
 * Authenticated.
 * Customers → their own orders.
 * Admins    → all orders (add ?status= to filter).
 */
const getOrders = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await orderService.getAll(
    req.user.id,
    req.user.role,
    req.query
  );
  return sendPaginated(res, rows, count, page, limit, 'Orders retrieved');
});

/**
 * GET /orders/:id
 * Authenticated — single order detail.
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id, req.user.id, req.user.role);
  return sendSuccess(res, order);
});

/**
 * PATCH /orders/:id/status
 * Admins → can set any status.
 * Customers → can only cancel their own pending orders.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );
  return sendSuccess(res, order, `Order status updated to '${order.status}'`);
});

module.exports = { createOrder, getOrders, getOrder, updateOrderStatus };
