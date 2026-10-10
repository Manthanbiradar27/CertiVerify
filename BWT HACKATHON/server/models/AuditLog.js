'use strict';
const mongoose = require('mongoose');

const AUDIT_ACTIONS = Object.freeze({
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  // Org
  ORG_STATUS_CHANGE: 'ORG_STATUS_CHANGE',
  // Recipient
  RECIPIENT_CREATED: 'RECIPIENT_CREATED',
  RECIPIENT_UPDATED: 'RECIPIENT_UPDATED',
  RECIPIENT_DELETED: 'RECIPIENT_DELETED',
  // Certificate
  CERT_ISSUED: 'CERT_ISSUED',
  CERT_REVOKED: 'CERT_REVOKED',
  CERT_DOWNLOADED: 'CERT_DOWNLOADED',
  // Verification
  CERT_VERIFIED: 'CERT_VERIFIED',
  // Admin
  ADMIN_ACTION: 'ADMIN_ACTION',
});

const auditLogSchema = new mongoose.Schema(
  {
    // Actor — null for unauthenticated actions (e.g., public verification)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorEmail: {
      // Denormalized so logs remain readable after user deletion
      type: String,
      default: null,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
    },
    targetType: {
      type: String,
      enum: ['User', 'Recipient', 'Certificate', 'System'],
      required: true,
    },
    targetId: { type: String, default: null }, // string to handle both ObjectId and publicId
    // Safe metadata — MUST NOT contain passwords, tokens, or raw personal data
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: true,
    // Prevent accidental updates — audit records are append-only
    strict: true,
  }
);

// Index for efficient admin queries
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = { AuditLog, AUDIT_ACTIONS };
