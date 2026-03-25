/**
 * validators/auth.validator.js
 * express-validator chains for authentication endpoints.
 */

const { body } = require('express-validator');

const registerValidator = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 1, max: 80 }).withMessage('First name must be 1–80 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('First name contains invalid characters'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 1, max: 80 }).withMessage('Last name must be 1–80 characters'),

  body('email')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .isLength({ max: 255 }).withMessage('Email too long'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+\d\s()\-]{7,20}$/).withMessage('Invalid phone number format'),
];

const loginValidator = [
  body('email')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),

  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .custom((val, { req }) => {
      if (val === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

module.exports = { registerValidator, loginValidator, changePasswordValidator };
