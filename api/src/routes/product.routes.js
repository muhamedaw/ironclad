/**
 * routes/product.routes.js
 */

const { Router } = require('express');
const ctrl = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const { writeLimiter } = require('../middleware/security');
const {
  productQueryValidator,
  createProductValidator,
  updateProductValidator,
} = require('../validators/product.validator');

const router = Router();

// ── Public ────────────────────────────────────────────────────────
router.get('/',    productQueryValidator, handleValidation, ctrl.getProducts);
router.get('/:id', ctrl.getProduct);

// ── Admin only ────────────────────────────────────────────────────
router.post(
  '/',
  protect, authorize('admin'),
  writeLimiter,
  createProductValidator, handleValidation,
  ctrl.createProduct
);

router.put(
  '/:id',
  protect, authorize('admin'),
  writeLimiter,
  updateProductValidator, handleValidation,
  ctrl.updateProduct
);

router.delete(
  '/:id',
  protect, authorize('admin'),
  ctrl.deleteProduct
);

module.exports = router;
