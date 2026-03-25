/**
 * middleware/requestId.js
 * Attaches a unique UUID to every request as req.id.
 * The ID is echoed back in the X-Request-Id response header
 * so clients can correlate their request with server logs.
 */

const { v4: uuidv4 } = require('uuid');

const requestId = (req, res, next) => {
  // Respect an upstream ID (e.g., from a load balancer or API gateway)
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
};

module.exports = requestId;
