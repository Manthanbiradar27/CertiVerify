'use strict';
/**
 * Admin Bootstrap Script
 * ──────────────────────
 * Creates the initial administrator account.
 * Run ONCE in development or production setup — NEVER exposed as an API.
 *
 * Usage:
 *   cd server
 *   node scripts/createAdmin.js
 *
 * Required environment variables (in server/.env):
 *   MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Security rules:
 *   - Never hardcode credentials here.
 *   - Run from a secure terminal session.
 *   - Rotate ADMIN_PASSWORD after first login using the change-password endpoint.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { User, ROLES } = require('../models/User');

const run = async () => {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Missing required environment variables: MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD'
    );
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
    if (existing) {
      console.log(`User with email ${ADMIN_EMAIL} already exists (role: ${existing.role}). Aborting.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: ROLES.ADMIN,
      status: 'active',
    });

    console.log(`✅ Admin account created: ${admin.name} <${admin.email}>`);
    console.log('⚠️  Remember to rotate the admin password after first login.');
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
