'use strict';
const mongoose = require('mongoose');

const CERT_STATUSES = Object.freeze({
  VALID: 'VALID',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
});

const certificateSchema = new mongoose.Schema(
  {
    // ── Public identifier (safe to expose in QR, URL, UI) ─────────────────
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Generated server-side; not accepted from client
    },

    // ── Relationships ──────────────────────────────────────────────────────
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipient',
      required: [true, 'Recipient is required'],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization is required'],
      index: true,
    },

    // ── Certificate content ────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
    },
    expiryDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (val) {
          if (!val) return true;
          return val > this.issueDate;
        },
        message: 'Expiry date must be after issue date',
      },
    },

    // ── Status management ──────────────────────────────────────────────────
    // We store only revocation state; EXPIRED is computed at query time.
    // A revoked cert stays revoked regardless of dates.
    isRevoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date, default: null },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocationReason: { type: String, trim: true, maxlength: 500, default: null },
  },
  { timestamps: true }
);

// Compound indexes for common queries
certificateSchema.index({ organization: 1, createdAt: -1 });
certificateSchema.index({ organization: 1, isRevoked: 1 });
certificateSchema.index({ recipient: 1 });

// ── Virtual: computed status (never stored, always derived server-side) ────
certificateSchema.virtual('status').get(function () {
  if (this.isRevoked) return CERT_STATUSES.REVOKED;
  if (this.expiryDate && new Date() > this.expiryDate) return CERT_STATUSES.EXPIRED;
  return CERT_STATUSES.VALID;
});

// Include virtuals in JSON output
certificateSchema.set('toJSON', { virtuals: true });
certificateSchema.set('toObject', { virtuals: true });

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = { Certificate, CERT_STATUSES };
