/**
 * utils/ApiError.js
 * Custom error class that carries HTTP status codes
 * and optional field-level validation errors.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status (400, 401, 403, 404, 409, 422, 500…)
   * @param {string} message     Human-readable message
   * @param {Array}  errors      Optional array of field-level errors
   * @param {string} code        Optional machine-readable error code
   */
  constructor(statusCode, message, errors = [], code = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true; // distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories ──────────────────────────────────────

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors, 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, [], 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, [], 'FORBIDDEN');
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, `${resource} not found`, [], 'NOT_FOUND');
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message, [], 'CONFLICT');
  }

  static unprocessable(message = 'Unprocessable Entity', errors = []) {
    return new ApiError(422, message, errors, 'UNPROCESSABLE');
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message, [], 'INTERNAL_ERROR');
  }
}

/**
 * asyncHandler
 * Wraps async route handlers to catch rejected promises
 * and forward them to Express's next(err) error middleware.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiError, asyncHandler };
