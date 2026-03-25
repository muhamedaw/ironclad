/**
 * controllers/wishlist.controller.js
 */

const wishlistService = require('../services/wishlist.service');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendPaginated } = require('../utils/response');

/** GET /wishlist */
const getWishlist = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await wishlistService.getAll(req.user.id, req.query);
  return sendPaginated(res, rows, count, page, limit, 'Wishlist retrieved');
});

/** POST /wishlist/:productId — toggle (add if absent, remove if present) */
const toggleWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.toggle(req.user.id, req.params.productId);
  return sendSuccess(res, result,
    result.action === 'added' ? 'Product saved to wishlist' : 'Product removed from wishlist'
  );
});

/** GET /wishlist/:productId — check membership */
const checkWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.check(req.user.id, req.params.productId);
  return sendSuccess(res, result);
});

/** DELETE /wishlist/:productId */
const removeFromWishlist = asyncHandler(async (req, res) => {
  await wishlistService.remove(req.user.id, req.params.productId);
  return sendSuccess(res, null, 'Removed from wishlist');
});

module.exports = { getWishlist, toggleWishlist, checkWishlist, removeFromWishlist };


// ── Routes (defined inline — imported by routes/index.js) ────────
const { Router } = require('express');
const { protect } = require('../middleware/auth');

const wishlistRouter = Router();
wishlistRouter.use(protect); // all wishlist routes require auth

wishlistRouter.get('/',                    getWishlist);
wishlistRouter.post('/:productId',         toggleWishlist);
wishlistRouter.get('/:productId',          checkWishlist);
wishlistRouter.delete('/:productId',       removeFromWishlist);

module.exports.wishlistRouter = wishlistRouter;
