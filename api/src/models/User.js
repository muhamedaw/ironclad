/**
 * models/User.js
 * User account — stores hashed passwords, role-based access.
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  // ── Primary key ──────────────────────────────────────────────
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Identity ─────────────────────────────────────────────────
  first_name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'First name is required' },
      len: { args: [1, 80], msg: 'First name must be 1–80 chars' },
    },
  },

  last_name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Last name is required' },
    },
  },

  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: { msg: 'Email already registered' },
    validate: {
      isEmail: { msg: 'Must be a valid email address' },
    },
  },

  // ── Auth ─────────────────────────────────────────────────────
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: { args: [8, 255], msg: 'Password must be at least 8 characters' },
    },
  },

  role: {
    type: DataTypes.ENUM('customer', 'admin'),
    defaultValue: 'customer',
    allowNull: false,
  },

  // ── Profile ───────────────────────────────────────────────────
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      is: { args: /^[+\d\s()\-]{7,20}$/, msg: 'Invalid phone number format' },
    },
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },

  // ── Password reset ────────────────────────────────────────────
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',

  // ── Hooks ─────────────────────────────────────────────────────
  hooks: {
    /**
     * Hash password before every create/update that changes it.
     * Only re-hashes when the field is dirty.
     */
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
        user.password = await bcrypt.hash(user.password, rounds);
      }
    },
  },

  // ── Scopes ────────────────────────────────────────────────────
  scopes: {
    // Never expose the password hash in a query unless explicitly needed
    safe: {
      attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] },
    },
  },
});

// ── Instance methods ─────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 * @param  {string}  candidate
 * @returns {Promise<boolean>}
 */
User.prototype.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Return a safe JSON representation (no sensitive fields).
 */
User.prototype.toSafeJSON = function () {
  const { password, password_reset_token, password_reset_expires, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
