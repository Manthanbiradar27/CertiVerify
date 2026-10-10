'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/orgController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.use(protect, authorize('organization'));

router.get('/profile', ctrl.getProfile);
router.patch(
  '/profile',
  validate([
    body('name').optional().trim().notEmpty().isLength({ max: 120 }),
    body('description').optional().isLength({ max: 500 }),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('contactPhone').optional().isLength({ max: 30 }),
    body('address').optional().isLength({ max: 300 }),
  ]),
  ctrl.updateProfile
);
router.get('/dashboard', ctrl.getDashboardStats);

module.exports = router;
