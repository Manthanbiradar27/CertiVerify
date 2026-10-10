'use strict';
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

/**
 * Authentication middleware.
 * Reads JWT from HttpOnly cookie or Authorization Bearer header.
 * Attaches verified user to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Prefer HttpOnly cookie (most secure)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fall back to Authorization header for API clients / tests
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token — throws if expired or tampered
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please log in again.',
      });
    }

    // Load the current user from DB — ensures account status changes are respected
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists.',
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support.',
      });
    }

    // Check if password changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password recently changed. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based authorization middleware.
 * Call after protect().
 *
 * @param {...string} roles - allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
