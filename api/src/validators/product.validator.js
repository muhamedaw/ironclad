/**
 * validators/product.validator.js
 */

const { body, query, param } = require('express-validator');

const CATEGORIES = ['engine', 'brakes', 'electrical', 'body', 'interior', 'exhaust', 'cooling', 'fuel', 'other'];

const productQueryValidator = [
  query('brand')
    .optional().trim().isLength({ max: 80 }).withMessage('Brand too long'),

  query('model')
    .optional().trim().isLength({ max: 100 }).withMessage('Model too long'),

  query('year')
    .optional()
    .isInt({ min: 1900, max: 2100 }).withMessage('Year must be 1900–2100')
    .toInt(),

  query('category')
    .optional()
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),

  query('min_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('min_price must be ≥ 0')
    .toFloat(),

  query('max_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('max_price must be ≥ 0')
    .toFloat(),

  query('in_stock')
    .optional()
    .isBoolean().withMessage('in_stock must be true or false')
    .toBoolean(),

  query('featured')
    .optional()
    .isBoolean().withMessage('featured must be true or false')
    .toBoolean(),

  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'rating', 'newest', 'featured'])
    .withMessage('Invalid sort option'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be ≥ 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100')
    .toInt(),
];

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2–255 characters'),

  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ max: 60 }).withMessage('SKU max 60 characters')
    .matches(/^[A-Z0-9\-_]+$/i).withMessage('SKU may only contain letters, numbers, hyphens, underscores'),

  body('brand')
    .trim()
    .notEmpty().withMessage('Brand is required')
    .isLength({ max: 80 }),

  body('model')
    .trim()
    .notEmpty().withMessage('Model is required')
    .isLength({ max: 100 }),

  body('year_from')
    .notEmpty().withMessage('year_from is required')
    .isInt({ min: 1900, max: 2100 }).withMessage('year_from must be 1900–2100')
    .toInt(),

  body('year_to')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 }).withMessage('year_to must be 1900–2100')
    .toInt()
    .custom((val, { req }) => {
      if (val && val < req.body.year_from) {
        throw new Error('year_to must be ≥ year_from');
      }
      return true;
    }),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be ≥ 0')
    .toFloat(),

  body('original_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Original price must be ≥ 0')
    .toFloat(),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be ≥ 0')
    .toInt(),

  body('description')
    .optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
    .custom((arr) => {
      if (arr.some(url => typeof url !== 'string' || url.length > 500)) {
        throw new Error('Each image must be a string URL ≤ 500 chars');
      }
      return true;
    }),

  body('is_featured')
    .optional().isBoolean().toBoolean(),

  body('shipping_days')
    .optional()
    .isInt({ min: 0, max: 30 }).withMessage('shipping_days must be 0–30')
    .toInt(),
];

const updateProductValidator = [
  param('id').isUUID().withMessage('Invalid product ID'),
  // Re-use create rules but all optional
  ...createProductValidator.map(rule => rule.optional()),
];

module.exports = { productQueryValidator, createProductValidator, updateProductValidator };

// ─────────────────────────────────────────────────────────────────────────────

/**
 * validators/order.validator.js
 */
const orderItemValidator = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),

  body('items.*.product_id')
    .notEmpty().withMessage('product_id is required for each item')
    .isUUID().withMessage('Each product_id must be a valid UUID'),

  body('items.*.quantity')
    .notEmpty().withMessage('quantity is required for each item')
    .isInt({ min: 1, max: 999 }).withMessage('quantity must be 1–999')
    .toInt(),

  body('shipping_address')
    .notEmpty().withMessage('Shipping address is required')
    .isObject().withMessage('Shipping address must be an object'),

  body('shipping_address.street')
    .notEmpty().withMessage('Street address is required')
    .isLength({ max: 200 }).withMessage('Street max 200 chars'),

  body('shipping_address.city')
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }),

  body('shipping_address.state')
    .optional().trim().isLength({ max: 100 }),

  body('shipping_address.zip')
    .optional().trim()
    .matches(/^[\d\s\-A-Z]{3,12}$/i).withMessage('Invalid ZIP/postal code'),

  body('shipping_address.country')
    .notEmpty().withMessage('Country is required')
    .isISO31661Alpha2().withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),

  body('payment_method')
    .optional()
    .isIn(['card', 'paypal', 'bank_transfer', 'cod'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional().trim().isLength({ max: 1000 }),
];

const updateOrderStatusValidator = [
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid status value'),
  body('tracking_number')
    .optional().trim().isLength({ max: 100 }),
];

module.exports.orderItemValidator = orderItemValidator;
module.exports.updateOrderStatusValidator = updateOrderStatusValidator;
