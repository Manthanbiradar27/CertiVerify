'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = Object.freeze({ ADMIN: 'admin', ORG: 'organization' });
const STATUSES = Object.freeze({ ACTIVE: 'active', SUSPENDED: 'suspended', PENDING: 'pending' });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ORG,
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.ACTIVE,
    },
    // Organization profile fields (not applicable to admin)
    description: { type: String, trim: true, maxlength: 500 },
    website: { type: String, trim: true, maxlength: 200 },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },

    // Password reset
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Track password changes — used to invalidate old JWTs
    passwordChangedAt: { type: Date, select: false },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// email unique index is created by unique:true above.
// Additional index on role for admin queries.
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// ── Pre-save: hash password ────────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  // Record when password was changed so old tokens become invalid
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // 1 s buffer for token iat
  }
});

// ── Instance method: compare passwords ────────────────────────────────────
userSchema.methods.correctPassword = async function (candidate, hashed) {
  return bcrypt.compare(candidate, hashed);
};

// ── Instance method: was password changed after token issued? ─────────────
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (this.passwordChangedAt) {
    const changedTs = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtIat < changedTs;
  }
  return false;
};

// ── Instance method: safe public profile ─────────────────────────────────
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    description: this.description,
    website: this.website,
    contactPhone: this.contactPhone,
    address: this.address,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = { User, ROLES, STATUSES };
