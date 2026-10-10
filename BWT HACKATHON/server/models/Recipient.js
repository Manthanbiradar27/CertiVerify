'use strict';
const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email too long'],
      // Optional but validated when present
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    // Owning organization — enforces data isolation
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization reference is required'],
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Compound index: org + name for fast searches within an org
recipientSchema.index({ organization: 1, name: 1 });
// Compound unique: one email per org (allows same email across different orgs)
recipientSchema.index(
  { organization: 1, email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $exists: true, $ne: '' } } }
);

const Recipient = mongoose.model('Recipient', recipientSchema);
module.exports = Recipient;
