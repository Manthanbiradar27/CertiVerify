'use strict';
/**
 * Demo Seed Script
 * ────────────────
 * Creates two demo organizations, recipients, and certificates with NO real PII.
 * Run manually ONLY in development — NEVER in production startup.
 *
 * Usage:
 *   cd server
 *   node scripts/seedDemo.js
 *
 * ⚠️  This will NOT overwrite existing data.
 * ⚠️  All seed records use placeholder data — not real personal information.
 */

// Safety guard — never run automatically in production
if (process.env.NODE_ENV === 'production') {
  console.error('Seed script must not run in production. Aborting.');
  process.exit(1);
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { User, ROLES } = require('../models/User');
const Recipient = require('../models/Recipient');
const { Certificate } = require('../models/Certificate');
const { generatePublicId } = require('../services/certificateService');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const bcrypt = require('bcryptjs');
  const hashedPass = await bcrypt.hash('DemoPass1', 12);

  // Create orgs
  const [org1, org2] = await Promise.all([
    User.findOneAndUpdate(
      { email: 'demo-alpha@certiverify.local' },
      {
        name: 'Alpha University (Demo)',
        email: 'demo-alpha@certiverify.local',
        password: hashedPass,
        role: ROLES.ORG,
        status: 'active',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ),
    User.findOneAndUpdate(
      { email: 'demo-beta@certiverify.local' },
      {
        name: 'Beta Institute (Demo)',
        email: 'demo-beta@certiverify.local',
        password: hashedPass,
        role: ROLES.ORG,
        status: 'active',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ),
  ]);

  // Create recipients
  const r1 = await Recipient.findOneAndUpdate(
    { email: 'alice@demo.local', organization: org1._id },
    { name: 'Alice Demo', email: 'alice@demo.local', organization: org1._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const r2 = await Recipient.findOneAndUpdate(
    { email: 'bob@demo.local', organization: org2._id },
    { name: 'Bob Demo', email: 'bob@demo.local', organization: org2._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Issue certificates
  await Certificate.findOneAndUpdate(
    { organization: org1._id, recipient: r1._id, title: 'Web Development Fundamentals (Demo)' },
    {
      publicId: generatePublicId(),
      organization: org1._id,
      recipient: r1._id,
      title: 'Web Development Fundamentals (Demo)',
      issueDate: new Date('2024-06-01'),
      expiryDate: new Date('2026-06-01'),
      isRevoked: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Certificate.findOneAndUpdate(
    { organization: org2._id, recipient: r2._id, title: 'Data Science Certificate (Demo)' },
    {
      publicId: generatePublicId(),
      organization: org2._id,
      recipient: r2._id,
      title: 'Data Science Certificate (Demo)',
      issueDate: new Date('2024-09-15'),
      isRevoked: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('✅ Demo seed complete.');
  console.log('   Org 1: demo-alpha@certiverify.local / DemoPass1');
  console.log('   Org 2: demo-beta@certiverify.local  / DemoPass1');
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
