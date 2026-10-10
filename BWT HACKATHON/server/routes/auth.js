'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const passwordRules = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8–128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate([
    body('name').trim().notEmpty().withMessage('Organization name is required').isLength({ max: 120 }),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    ...passwordRules,
  ]),
  ctrl.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  ctrl.login
);

// POST /api/auth/logout
router.post('/logout', protect, ctrl.logout);

// GET /api/auth/me
router.get('/me', protect, ctrl.getMe);

// POST /api/auth/change-password
router.post(
  '/change-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    ...passwordRules.map((r) => {
      // Re-map 'password' field check to 'newPassword'
      return body('newPassword')
        .isLength({ min: 8, max: 128 }).withMessage('New password must be 8–128 characters')
        .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('New password must contain a number');
    }).slice(0, 1), // one rule object covers all new password validations
  ]),
  ctrl.changePassword
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  validate([body('email').isEmail().withMessage('Valid email required').normalizeEmail()]),
  ctrl.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  validate([
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ]),
  ctrl.resetPassword
);

module.exports = router;
