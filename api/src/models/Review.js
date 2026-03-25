/**
 * models/Review.js
 * Product review — one review per user per product (enforced by unique index).
 * After create/update/destroy, a hook recalculates Product.rating_avg.
 */

const { DataTypes, literal } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE',
  },

  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },

  rating: {
    type: DataTypes.TINYINT,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Rating must be between 1 and 5' },
      max: { args: [5], msg: 'Rating must be between 1 and 5' },
    },
  },

  title: {
    type: DataTypes.STRING(120),
    allowNull: true,
    validate: { len: { args: [0, 120], msg: 'Title max 120 characters' } },
  },

  body: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: { args: [0, 2000], msg: 'Review body max 2000 characters' } },
  },

  // Moderation
  is_verified_purchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },

  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // auto-approve; flip to false for manual moderation
    allowNull: false,
  },
}, {
  tableName: 'reviews',
  paranoid: true,

  indexes: [
    // One review per user per product
    { unique: true, fields: ['product_id', 'user_id'], name: 'uq_review_product_user' },
    { fields: ['product_id', 'is_approved'], name: 'idx_product_approved' },
    { fields: ['user_id'], name: 'idx_user_reviews' },
  ],

  hooks: {
    /**
     * After any review write, recalculate and persist the product's
     * denormalised rating_avg and rating_count fields.
     */
    afterCreate:  (review) => recalcRating(review.product_id),
    afterUpdate:  (review) => recalcRating(review.product_id),
    afterDestroy: (review) => recalcRating(review.product_id),
  },
});

async function recalcRating(productId) {
  try {
    const { Product } = require('./index');
    const result = await Review.findOne({
      where: { product_id: productId, is_approved: true },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg'],
        [sequelize.fn('COUNT', sequelize.col('id')),   'cnt'],
      ],
      raw: true,
    });

    await Product.update(
      {
        rating_avg:   parseFloat(result?.avg || 0).toFixed(2),
        rating_count: parseInt(result?.cnt  || 0, 10),
      },
      { where: { id: productId } }
    );
  } catch (err) {
    // Non-fatal — log but don't bubble
    const logger = require('../utils/logger');
    logger.error(`Rating recalc failed for product ${productId}: ${err.message}`);
  }
}

module.exports = Review;
