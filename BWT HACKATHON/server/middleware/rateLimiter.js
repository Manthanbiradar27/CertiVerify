'use strict';
const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const max = Number(process.env.RATE_LIMIT_MAX) || 100;

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  });
};

const isTest = () => process.env.NODE_ENV === 'test';

/** General API limiter */
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  handler,
});

/** Stricter limiter for auth endpoints (login, register, password reset) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  handler,
});

/** Very strict limiter for public verification */
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  handler,
});

module.exports = { apiLimiter, authLimiter, verifyLimiter };
