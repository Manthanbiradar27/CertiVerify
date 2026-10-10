'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/publicController');
const { verifyLimiter } = require('../middleware/rateLimiter');

// GET /api/public/verify/:publicId
// No authentication — strictly public; rate-limited
router.get('/verify/:publicId', verifyLimiter, ctrl.verifyCertificate);

module.exports = router;
