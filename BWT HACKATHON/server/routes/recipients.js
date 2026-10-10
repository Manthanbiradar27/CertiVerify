'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/recipientController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All recipient routes require org (or admin) authentication
router.use(protect, authorize('organization', 'admin'));

router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 150 }),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email').normalizeEmail(),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
  ]),
  ctrl.createRecipient
);

router.get('/', ctrl.listRecipients);

router.get('/:id', ctrl.getRecipient);

router.patch(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty().isLength({ max: 150 }),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('notes').optional().isLength({ max: 500 }),
  ]),
  ctrl.updateRecipient
);

router.delete('/:id', ctrl.deleteRecipient);

module.exports = router;
