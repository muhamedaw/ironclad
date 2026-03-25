/**
 * models/Wishlist.js
 * User wishlist — a saved set of product IDs per user.
 * Simple join table: user_id + product_id (unique pair).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },

  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'wishlists',
  timestamps: true,
  updatedAt: false,
  paranoid: false,

  indexes: [
    // Each product can only appear once per user
    { unique: true, fields: ['user_id', 'product_id'], name: 'uq_wishlist_user_product' },
    { fields: ['user_id'], name: 'idx_wishlist_user' },
  ],
});

module.exports = Wishlist;
