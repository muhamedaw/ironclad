/**
 * routes/order.routes.js
 */

const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const { writeLimiter } = require('../middleware/security');
const {
  orderItemValidator,
  updateOrderStatusValidator,
} = require('../validators/product.validator');

const router = Router();

// All order routes require authentication
router.use(protect);

router.post('/', writeLimiter, orderItemValidator, handleValidation, ctrl.createOrder);
router.get('/', ctrl.getOrders);
router.get('/:id', ctrl.getOrder);

// Status update — customer can cancel, admin can do anything
router.patch(
  '/:id/status',
  updateOrderStatusValidator, handleValidation,
  ctrl.updateOrderStatus
);

module.exports = router;
