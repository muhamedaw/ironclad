/**
 * models/Product.js
 * Car spare part — indexed for brand/model/year lookups.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  // ── Primary key ──────────────────────────────────────────────
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Identity ─────────────────────────────────────────────────
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product name is required' },
      len: { args: [2, 255], msg: 'Name must be 2–255 characters' },
    },
  },

  sku: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: { msg: 'SKU already exists' },
    validate: {
      notEmpty: { msg: 'SKU is required' },
    },
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ── Vehicle compatibility ─────────────────────────────────────
  brand: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: { notEmpty: { msg: 'Brand is required' } },
  },

  model: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'Model is required' } },
  },

  year_from: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    validate: {
      min: { args: [1900], msg: 'Year must be ≥ 1900' },
      max: { args: [2100], msg: 'Year must be ≤ 2100' },
    },
  },

  year_to: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: true,
    validate: {
      yearToAfterFrom(value) {
        if (value && value < this.year_from) {
          throw new Error('year_to must be ≥ year_from');
        }
      },
    },
  },

  // ── Categorisation ────────────────────────────────────────────
  category: {
    type: DataTypes.ENUM(
      'engine', 'brakes', 'electrical', 'body',
      'interior', 'exhaust', 'cooling', 'fuel', 'other'
    ),
    allowNull: false,
    defaultValue: 'other',
  },

  // ── Pricing ───────────────────────────────────────────────────
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price must be ≥ 0' },
    },
  },

  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Original price must be ≥ 0' },
    },
  },

  // ── Inventory ─────────────────────────────────────────────────
  stock_quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    allowNull: false,
  },

  // ── Media ─────────────────────────────────────────────────────
  // Stored as JSON array of URLs
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: false,
  },

  // ── Ratings (denormalised for query performance) ──────────────
  rating_avg: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    allowNull: false,
  },

  rating_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    allowNull: false,
  },

  // ── Metadata ─────────────────────────────────────────────────
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },

  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },

  shipping_days: {
    type: DataTypes.TINYINT.UNSIGNED,
    defaultValue: 3,
    allowNull: false,
  },

  weight_kg: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: true,
  },
}, {
  tableName: 'products',
  paranoid: true, // soft delete via deletedAt

  // ── Database-level indexes ────────────────────────────────────
  indexes: [
    // Core filter index: brand + model + year range
    { fields: ['brand', 'model', 'year_from', 'year_to'], name: 'idx_vehicle' },
    // Category browsing
    { fields: ['category', 'is_active'], name: 'idx_category_active' },
    // Full-text search on name (requires MySQL FULLTEXT)
    { type: 'FULLTEXT', fields: ['name', 'description'], name: 'ft_name_desc' },
    // Price range queries
    { fields: ['price'], name: 'idx_price' },
    // Featured flag
    { fields: ['is_featured', 'is_active'], name: 'idx_featured' },
  ],
});

module.exports = Product;
