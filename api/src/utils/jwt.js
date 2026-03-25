/**
 * utils/jwt.js
 * Sign and verify access + refresh tokens.
 * Access tokens are short-lived; refresh tokens are stored in an
 * httpOnly cookie and can be exchanged for a new access token.
 */

const jwt = require('jsonwebtoken');
const { ApiError } = require('./ApiError');

const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} = process.env;

// ── Sign ──────────────────────────────────────────────────────────

/**
 * Create a short-lived access token.
 * @param   {{ id, email, role }} payload
 * @returns {string}
 */
const signAccessToken = (payload) =>
  jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );

/**
 * Create a long-lived refresh token.
 * Only carries the user's ID — minimal surface area.
 */
const signRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN || '30d', algorithm: 'HS256' }
  );

// ── Verify ────────────────────────────────────────────────────────

/**
 * Verify and decode an access token.
 * Throws ApiError.unauthorized if invalid or expired.
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }
};

/**
 * Verify and decode a refresh token.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token expired — please log in again');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }
};

// ── Cookie helpers ────────────────────────────────────────────────

/**
 * Set the refresh token as an httpOnly, sameSite cookie.
 */
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path: '/api/v1/auth',              // restrict to auth routes
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
