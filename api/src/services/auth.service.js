/**
 * services/auth.service.js
 * All authentication business logic lives here.
 * Controllers stay thin — they delegate to this service.
 */

const { User } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user.
   * @param {{first_name, last_name, email, password, phone}} data
   * @returns {{ user, accessToken, refreshToken }}
   */
  async register(data) {
    const { first_name, last_name, email, password, phone } = data;

    // 1. Check for duplicate email (case-insensitive)
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
      paranoid: false, // include soft-deleted
    });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // 2. Create user (password hashed by beforeSave hook)
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(),
      password,
      phone: phone || null,
      role: 'customer',
    });

    logger.info(`New user registered: ${user.email} [${user.id}]`);

    // 3. Issue tokens
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    return { user: user.toSafeJSON(), accessToken, refreshToken };
  }

  /**
   * Authenticate with email + password.
   * Returns tokens on success, throws on failure.
   */
  async login(email, password) {
    // 1. Fetch user (include password for comparison)
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // Use constant-time check even when user not found to prevent timing attacks
    const isValid = user ? await user.comparePassword(password) : false;

    if (!user || !isValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Account is suspended. Please contact support.');
    }

    // 2. Update last_login
    await user.update({ last_login: new Date() });

    logger.info(`User logged in: ${user.email} [${user.id}]`);

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    return { user: user.toSafeJSON(), accessToken, refreshToken };
  }

  /**
   * Exchange a refresh token for a new access token.
   */
  async refresh(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken); // throws on invalid

    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'email', 'role', 'is_active'],
    });

    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User not found or account suspended');
    }

    const accessToken     = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user.id); // rotate

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get the currently authenticated user's profile.
   */
  async getProfile(userId) {
    const user = await User.scope('safe').findByPk(userId);
    if (!user) throw ApiError.notFound('User');
    return user;
  }

  /**
   * Update profile fields (not password — use changePassword for that).
   */
  async updateProfile(userId, updates) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.notFound('User');

    const allowed = ['first_name', 'last_name', 'phone'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );

    await user.update(filtered);
    return user.toSafeJSON();
  }

  /**
   * Change password (requires current password verification).
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.notFound('User');

    const valid = await user.comparePassword(currentPassword);
    if (!valid) throw ApiError.unauthorized('Current password is incorrect');

    await user.update({ password: newPassword });
    logger.info(`Password changed for user ${user.email}`);
    return true;
  }
}

module.exports = new AuthService();
