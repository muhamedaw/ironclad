/**
 * controllers/product.controller.js
 * Thin HTTP layer — delegates everything to product.service.js.
 */

const productService = require('../services/product.service');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');

/**
 * GET /products
 * Public — filterable, sortable, paginated product list.
 *
 * Query params:
 *   brand, model, year, category, min_price, max_price,
 *   in_stock, featured, search, sort, page, limit
 */
const getProducts = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await productService.getAll(req.query);
  return sendPaginated(res, rows, count, page, limit, 'Products retrieved');
});

/**
 * GET /products/:id
 * Public — single product with full detail.
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id);
  return sendSuccess(res, product);
});

/**
 * POST /products
 * Admin only — create a new product.
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  return sendCreated(res, product, 'Product created successfully');
});

/**
 * PUT /products/:id
 * Admin only — update an existing product.
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  return sendSuccess(res, product, 'Product updated successfully');
});

/**
 * DELETE /products/:id
 * Admin only — soft-delete a product.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.remove(req.params.id);
  return sendSuccess(res, null, 'Product deleted successfully');
});

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
