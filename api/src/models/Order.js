/**
 * models/Order.js
 * Order header + line-item snapshot.
 * Prices are snapshotted at order time — never reference Product live.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── Order header ─────────────────────────────────────────────────
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Human-readable order number, generated in service
  order_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },

  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'RESTRICT',
  },

  // ── Financials ────────────────────────────────────────────────
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
  },

  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
  },

  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  // ── Status ────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM(
      'pending', 'confirmed', 'processing',
      'shipped', 'delivered', 'cancelled', 'refunded'
    ),
    defaultValue: 'pending',
    allowNull: false,
  },

  // ── Shipping address snapshot ─────────────────────────────────
  // Stored as JSON so the order stays accurate if user changes their address
  shipping_address: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidAddress(value) {
        if (!value?.street || !value?.city || !value?.country) {
          throw new Error('Shipping address must include street, city, and country');
        }
      },
    },
  },

  // ── Payment ───────────────────────────────────────────────────
  payment_method: {
    type: DataTypes.ENUM('card', 'paypal', 'bank_transfer', 'cod'),
    defaultValue: 'card',
    allowNull: false,
  },

  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false,
  },

  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Tracking ─────────────────────────────────────────────────
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  paranoid: true,
  indexes: [
    { fields: ['user_id', 'status'], name: 'idx_user_status' },
    { fields: ['order_number'], name: 'idx_order_number' },
    { fields: ['status', 'created_at'], name: 'idx_status_date' },
  ],
});

// ── Order line item ───────────────────────────────────────────────
const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'orders', key: 'id' },
    onDelete: 'CASCADE',
  },

  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'RESTRICT',
  },

  // ── Price snapshot ─────────────────────────────────────────────
  // Saved at order time — immutable after creation
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  product_sku: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },

  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0], msg: 'Unit price must be ≥ 0' } },
  },

  quantity: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
    validate: { min: { args: [1], msg: 'Quantity must be ≥ 1' } },
  },

  line_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'order_items',
  timestamps: true,
  updatedAt: false, // line items don't update
  indexes: [
    { fields: ['order_id'], name: 'idx_order_id' },
    { fields: ['product_id'], name: 'idx_product_id' },
  ],
});

module.exports = { Order, OrderItem };
