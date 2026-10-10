'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, ROLES } = require('../models/User');
const { sendPasswordReset } = require('../services/emailService');
const { log, AUDIT_ACTIONS } = require('../services/auditService');

// ── Helper: sign JWT and attach as HttpOnly cookie ─────────────────────────
const signTokenAndCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const cookieOptions = {
    httpOnly: true,                              // Not accessible via JS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',                          // CSRF protection
    maxAge: (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000,
  };

  res.cookie('token', token, cookieOptions);
  return token; // Also returned for Bearer-token API clients (tests)
};

// ── Helper: extract IP ──────────────────────────────────────────────────────
const getIp = (req) => req.ip || req.headers['x-forwarded-for'] || null;

// ── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    // Only allow organization role via self-registration
    // Admin must be created via script
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      // Generic message — don't reveal whether email exists
      return res.status(409).json({
        success: false,
        message: 'Registration failed. Please check your details or try logging in.',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: ROLES.ORG, // force — never trust client-supplied role
      status: 'active',
    });

    await log({
      actor: user._id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.REGISTER,
      targetType: 'User',
      targetId: user._id,
      meta: { name: user.name },
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
    });

    const token = signTokenAndCookie(res, user._id);

    return res.status(201).json({
      success: true,
      message: 'Organization registered successfully.',
      token, // also in cookie
      user: user.toPublicProfile(),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Select password explicitly (select:false on schema)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Generic error — never reveal whether email exists
    const GENERIC_ERROR = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ success: false, message: GENERIC_ERROR });
    }

    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: GENERIC_ERROR });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support.',
      });
    }

    await log({
      actor: user._id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.LOGIN,
      targetType: 'User',
      targetId: user._id,
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
    });

    const token = signTokenAndCookie(res, user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/logout ───────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Immediately expire the cookie
    });

    if (req.user) {
      await log({
        actor: req.user._id,
        actorEmail: req.user.email,
        action: AUDIT_ACTIONS.LOGOUT,
        targetType: 'User',
        targetId: req.user._id,
        ip: getIp(req),
      });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  return res.status(200).json({ success: true, user: req.user.toPublicProfile() });
};

// ── POST /api/auth/change-password ─────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.correctPassword(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save(); // triggers bcrypt pre-save hook

    // Rotate cookie with new token
    const token = signTokenAndCookie(res, user._id);

    await log({
      actor: user._id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      targetType: 'User',
      targetId: user._id,
      ip: getIp(req),
    });

    return res.status(200).json({ success: true, message: 'Password changed successfully.', token });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password ─────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Intentionally do not reveal whether the account exists
    const GENERIC_RESPONSE = {
      success: true,
      message: 'If that email address is registered, a reset link has been sent.',
    };

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    // Generate cryptographically secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Store only the hash
    user.passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordReset(user.email, resetUrl);
    } catch (emailErr) {
      // Roll back token if email fails
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('[ForgotPassword] Email send failed:', emailErr.message);
      return next(new Error('Failed to send password reset email. Please try again later.'));
    }

    await log({
      actor: user._id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      targetType: 'User',
      targetId: user._id,
      ip: getIp(req),
    });

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password ──────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the raw token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired.',
      });
    }

    user.password = newPassword;
    // Invalidate token (single-use)
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await log({
      actor: user._id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
      targetType: 'User',
      targetId: user._id,
      ip: getIp(req),
    });

    const jwtToken = signTokenAndCookie(res, user._id);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      token: jwtToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    next(err);
  }
};
