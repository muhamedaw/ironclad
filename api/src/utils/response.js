/**
 * utils/response.js
 * Standardised JSON response helpers.
 *
 * Every response follows this envelope:
 * {
 *   success: boolean,
 *   message: string,
 *   data:    any | null,
 *   meta:    object | null,   ← pagination, counts, etc.
 *   errors:  array  | null
 * }
 */

/**
 * Send a successful response.
 * @param {Response} res
 * @param {any}      data     Payload
 * @param {string}   message
 * @param {number}   statusCode  Default 200
 * @param {object}   meta     Optional pagination / extra metadata
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send a created (201) response.
 */
const sendCreated = (res, data, message = 'Created successfully') =>
  sendSuccess(res, data, message, 201);

/**
 * Send a paginated list response.
 * @param {Response} res
 * @param {Array}    rows
 * @param {number}   total   Total record count before pagination
 * @param {number}   page    Current page (1-indexed)
 * @param {number}   limit   Page size
 */
const sendPaginated = (res, rows, total, page, limit, message = 'OK') => {
  const totalPages = Math.ceil(total / limit);
  return sendSuccess(res, rows, message, 200, {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });
};

/**
 * Build Sequelize pagination options from request query.
 * @param {object} query  req.query
 * @param {number} maxLimit  Cap to prevent abuse
 */
const getPagination = (query, maxLimit = 100) => {
  const page  = Math.max(1, parseInt(query.page, 10)  || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { sendSuccess, sendCreated, sendPaginated, getPagination };
