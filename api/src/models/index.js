/**
 * models/index.js
 * Registers all models, defines associations, exposes sequelize instance.
 * Import from here everywhere — never import models individually.
 */

const { sequelize } = require('../config/database');
const User     = require('./User');
const Product  = require('./Product');
const { Order, OrderItem } = require('./Order');
const Review   = require('./Review');
const Wishlist = require('./Wishlist');

// ── Associations ──────────────────────────────────────────────────────────────

// User → Orders
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order → OrderItems
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Product → OrderItems
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product ↔ Reviews
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ Reviews
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ Wishlist ↔ Product (many-to-many)
User.belongsToMany(Product, { through: Wishlist, foreignKey: 'user_id', otherKey: 'product_id', as: 'wishlistProducts' });
Product.belongsToMany(User, { through: Wishlist, foreignKey: 'product_id', otherKey: 'user_id', as: 'wishedByUsers' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Wishlist.belongsTo(User,    { foreignKey: 'user_id',    as: 'user' });

// ── Sync helper ───────────────────────────────────────────────────────────────
async function syncModels(options = {}) {
  const defaultOpts = process.env.NODE_ENV === 'development'
    ? { alter: true }
    : {};
  await sequelize.sync({ ...defaultOpts, ...options });
}

module.exports = { sequelize, User, Product, Order, OrderItem, Review, Wishlist, syncModels };
