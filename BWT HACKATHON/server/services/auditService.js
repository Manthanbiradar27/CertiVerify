'use strict';
const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');

/**
 * Append an audit record. Errors are swallowed so a logging failure
 * never breaks the main request flow, but they are console-logged.
 *
 * @param {object} opts
 * @param {mongoose.ObjectId|null} opts.actor
 * @param {string|null} opts.actorEmail
 * @param {string} opts.action       - one of AUDIT_ACTIONS
 * @param {string} opts.targetType
 * @param {string|null} opts.targetId
 * @param {object} opts.meta         - safe metadata only — no secrets
 * @param {string|null} opts.ip
 * @param {string|null} opts.userAgent
 */
const log = async (opts) => {
  try {
    await AuditLog.create({
      actor: opts.actor || null,
      actorEmail: opts.actorEmail || null,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId ? String(opts.targetId) : null,
      meta: opts.meta || {},
      ip: opts.ip || null,
      userAgent: opts.userAgent || null,
    });
  } catch (err) {
    // Never let audit failure break the request
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
};

module.exports = { log, AUDIT_ACTIONS };
