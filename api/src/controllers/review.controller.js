/**
 * controllers/review.controller.js
 */

const reviewService = require('../services/review.service');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');

/** GET /products/:productId/reviews */
const getProductReviews = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await reviewService.getForProduct(
    req.params.productId, req.query
  );
  return sendPaginated(res, rows, count, page, limit, 'Reviews retrieved');
});

/** POST /products/:productId/reviews */
const createReview = asyncHandler(async (req, res) => {
  const { review, created } = await reviewService.upsert(
    req.user.id,
    req.params.productId,
    req.body
  );
  return created
    ? sendCreated(res, review, 'Review submitted')
    : sendSuccess(res, review, 'Review updated');
});

/** DELETE /products/:productId/reviews/:id */
const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.remove(req.params.id, req.user.id, req.user.role);
  return sendSuccess(res, null, 'Review deleted');
});

/** GET /admin/reviews */
const adminListReviews = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await reviewService.adminList(req.query);
  return sendPaginated(res, rows, count, page, limit);
});

/** PATCH /admin/reviews/:id/approve */
const approveReview = asyncHandler(async (req, res) => {
  const review = await reviewService.setApproval(
    req.params.id,
    req.body.approved !== false
  );
  return sendSuccess(res, review, `Review ${review.is_approved ? 'approved' : 'rejected'}`);
});

module.exports = { getProductReviews, createReview, deleteReview, adminListReviews, approveReview };
