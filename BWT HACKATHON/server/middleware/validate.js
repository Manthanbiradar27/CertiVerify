'use strict';
const { validationResult } = require('express-validator');

/**
 * Run an array of express-validator checks then call next() or return 422.
 *
 * Usage:
 *   router.post('/route', validate([body('field').notEmpty()]), controller);
 */
const validate = (checks) => {
  return async (req, res, next) => {
    // Run all checks
    await Promise.all(checks.map((check) => check.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  };
};

module.exports = validate;
