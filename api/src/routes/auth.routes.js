/**
 * routes/auth.routes.js
 */

const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/security');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');

const router = Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/register', authLimiter, registerValidator, handleValidation, ctrl.register);
router.post('/login',    authLimiter, loginValidator,    handleValidation, ctrl.login);
router.post('/refresh',  ctrl.refresh);
router.post('/logout',   ctrl.logout);

// ── Protected ─────────────────────────────────────────────────────
router.get('/me',  protect, ctrl.getMe);
router.put('/me',  protect, ctrl.updateMe);
router.put('/me/password', protect, changePasswordValidator, handleValidation, ctrl.changePassword);

module.exports = router;
