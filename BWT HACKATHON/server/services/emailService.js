'use strict';
const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Returns (and lazily creates) a nodemailer transporter.
 * If SMTP credentials are missing, returns null so callers can
 * fall back to logging the link in development.
 */
const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Email not configured
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

/**
 * Send a password-reset email.
 * If SMTP is not configured, logs the reset URL to the console in dev mode.
 *
 * @param {string} to    - recipient email
 * @param {string} resetUrl - the full password-reset URL (with token in path, not query)
 */
const sendPasswordReset = async (to, resetUrl) => {
  const t = getTransporter();
  const emailFrom = process.env.EMAIL_FROM || 'CertiVerify <noreply@example.com>';

  if (!t) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('─────────────────────────────────────────────────');
      console.log('[DEV] Password reset link (SMTP not configured):');
      console.log(resetUrl);
      console.log('─────────────────────────────────────────────────');
    }
    return;
  }

  await t.sendMail({
    from: emailFrom,
    to,
    subject: 'CertiVerify — Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a2e">Password Reset Request</h2>
        <p>You requested a password reset for your CertiVerify account.</p>
        <p>Click the link below to set a new password. This link expires in <strong>10 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px">If you did not request this, ignore this email. Your password will not change.</p>
        <p style="color:#666;font-size:13px">For security, this link can only be used once.</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordReset };
