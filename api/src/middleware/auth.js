/**
 * middleware/auth.js
 * Route-level guards:
 *   protect  — requires a valid JWT access token
 *   authorize — restricts to specific roles
 */

const { verifyAccessToken } = require('../utils/jwt');
const { ApiError, asyncHandler } = require('../utils/ApiError');
const { User } = require('../models');

/**
 * protect
 * Extracts the Bearer token from the Authorization header,
 * verifies it, fetches the user from DB (ensures account still active),
 * then attaches `req.user` for downstream handlers.
 */
const protect = asyncHandler(async (req, res, next) => {
  // 1. Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No access token provided');
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // 2. Verify signature & expiry
  const decoded = verifyAccessToken(token); // throws ApiError on failure

  // 3. Confirm user still exists and is active
  const user = await User.findByPk(decoded.sub, {
    attributes: ['id', 'email', 'role', 'is_active', 'first_name', 'last_name'],
  });

  if (!user) {
    throw ApiError.unauthorized('User account no longer exists');
  }

  if (!user.is_active) {
    throw ApiError.forbidden('Account suspended — contact support');
  }

  // 4. Attach to request context
  req.user = user;
  next();
});

/**
 * authorize(...roles)
 * Middleware factory — use after `protect`.
 *
 * @example
 *   router.delete('/products/:id', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw ApiError.forbidden(
      `Role '${req.user?.role}' is not permitted to perform this action`
    );
  }
  next();
};

/**
 * optionalAuth
 * Attaches `req.user` if a valid token is present,
 * but does NOT reject requests without one.
 * Useful for endpoints that personalise content for logged-in users.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.slice(7));
      const user = await User.findByPk(decoded.sub, {
        attributes: ['id', 'email', 'role', 'is_active'],
      });
      if (user && user.is_active) req.user = user;
    } catch (_) {
      // silently ignore — optional auth
    }
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };
