/**
 * routes/review.routes.js
 * Nested under /products/:productId/reviews
 * and /admin/reviews for moderation.
 */

const { Router } = require('express');
const ctrl = require('../controllers/review.controller');
const { protect, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const { body, param } = require('express-validator');

const router = Router({ mergeParams: true }); // inherit :productId from parent

const reviewValidator = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5')
    .toInt(),
  body('title')
    .optional().trim().isLength({ max: 120 }).withMessage('Title max 120 characters'),
  body('body')
    .optional().trim().isLength({ max: 2000 }).withMessage('Body max 2000 characters'),
];

// ── Public ────────────────────────────────────────────────────────
router.get('/', ctrl.getProductReviews);

// ── Authenticated ─────────────────────────────────────────────────
router.post('/', protect, reviewValidator, handleValidation, ctrl.createReview);
router.delete('/:id', protect, ctrl.deleteReview);

module.exports = router;
