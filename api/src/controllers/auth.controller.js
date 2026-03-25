/**
 * controllers/auth.controller.js
 * Handles HTTP concerns only (req/res).
 * All business logic lives in auth.service.js.
 */

const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/ApiError');
const { sendSuccess, sendCreated } = require('../utils/response');
const { setRefreshCookie, clearRefreshCookie } = require('../utils/jwt');

/**
 * POST /auth/register
 * Create a new customer account.
 */
const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);

  // Refresh token goes in an httpOnly cookie
  setRefreshCookie(res, refreshToken);

  return sendCreated(res, { user, accessToken }, 'Registration successful');
});

/**
 * POST /auth/login
 * Authenticate with email + password.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, { user, accessToken }, 'Login successful');
});

/**
 * POST /auth/refresh
 * Exchange refresh token cookie for a new access token.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    // throw lazily — ApiError will be caught by asyncHandler → errorHandler
    const { ApiError } = require('../utils/ApiError');
    throw ApiError.unauthorized('No refresh token provided');
  }

  const { accessToken, refreshToken: newRefresh } = await authService.refresh(token);
  setRefreshCookie(res, newRefresh); // rotate cookie

  return sendSuccess(res, { accessToken }, 'Token refreshed');
});

/**
 * POST /auth/logout
 * Clear the refresh token cookie. Client must discard the access token.
 */
const logout = asyncHandler(async (req, res) => {
  clearRefreshCookie(res);
  return sendSuccess(res, null, 'Logged out successfully');
});

/**
 * GET /auth/me
 * Return current user profile.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return sendSuccess(res, user);
});

/**
 * PUT /auth/me
 * Update current user's profile (name, phone).
 */
const updateMe = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  const user = await authService.updateProfile(req.user.id, { first_name, last_name, phone });
  return sendSuccess(res, user, 'Profile updated');
});

/**
 * PUT /auth/me/password
 * Change password (requires current password).
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  await authService.changePassword(req.user.id, current_password, new_password);
  return sendSuccess(res, null, 'Password changed successfully');
});

module.exports = { register, login, refresh, logout, getMe, updateMe, changePassword };
