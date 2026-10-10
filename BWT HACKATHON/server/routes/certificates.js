'use strict';
const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, authorize('organization', 'admin'));

// Issue certificate
router.post(
  '/',
  validate([
    body('recipientId').notEmpty().withMessage('recipientId is required').isMongoId().withMessage('Invalid recipientId'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').optional().isLength({ max: 1000 }),
    body('issueDate').isISO8601().withMessage('Valid issue date required').toDate(),
    body('expiryDate').optional({ checkFalsy: true }).isISO8601().withMessage('Valid expiry date required').toDate(),
  ]),
  ctrl.issueCertificate
);

// List certificates
router.get('/', ctrl.listCertificates);

// Get single certificate
router.get('/:id', ctrl.getCertificate);

// Revoke
router.patch(
  '/:id/revoke',
  validate([
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
  ]),
  ctrl.revokeCertificate
);

// Download PDF
router.get('/:id/download', ctrl.downloadCertificate);

// Get QR code only
router.get('/:id/qr', ctrl.getCertificateQR);

module.exports = router;
