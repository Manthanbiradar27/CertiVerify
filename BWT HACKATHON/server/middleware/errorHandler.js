'use strict';
/**
 * Central error handler.
 * - Never exposes stack traces or internal details in production.
 * - Handles Mongoose validation, cast, and duplicate-key errors cleanly.
 * - Returns consistent JSON error shape.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  // ── Mongoose ValidationError ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(statusCode).json({ success: false, message: 'Validation failed', errors });
  }

  // ── Mongoose CastError (bad ObjectId) ────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier.';
  }

  // ── MongoDB Duplicate Key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists.`;
  }

  // ── JWT errors (should be caught in middleware but belt + suspenders) ────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }

  // Log actual error server-side (but NEVER in response)
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' && statusCode >= 500
        ? 'An internal error occurred. Please try again later.'
        : message,
    // Only include errors array in non-500 cases (already handled above)
  });
};

module.exports = errorHandler;
