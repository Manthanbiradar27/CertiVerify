'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { STATUSES } = require('../models/User');

// All admin routes require both authentication AND admin role — checked server-side
router.use(protect, authorize('admin'));

router.get('/stats', ctrl.getPlatformStats);
router.get('/organizations', ctrl.listOrganizations);
router.get('/organizations/:id', ctrl.getOrganization);
router.patch(
  '/organizations/:id/status',
  validate([
    body('status')
      .notEmpty()
      .isIn(Object.values(STATUSES))
      .withMessage(`Status must be one of: ${Object.values(STATUSES).join(', ')}`),
  ]),
  ctrl.setOrgStatus
);
router.patch('/organizations/:id/profile', ctrl.updateOrgProfile);
router.get('/audit-logs', ctrl.getAuditLogs);
router.get('/certificates', ctrl.listAllCertificates);

module.exports = router;
