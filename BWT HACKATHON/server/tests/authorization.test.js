'use strict';
/**
 * Cross-Organization Isolation & Authorization Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that Organization A cannot:
 *   - View Organization B's recipients
 *   - Update Organization B's recipients
 *   - View Organization B's certificates
 *   - Revoke Organization B's certificates
 *   - Download Organization B's certificates
 *
 * Also verifies that:
 *   - Non-admin cannot access admin endpoints
 *   - Public verification reveals only permitted fields
 *
 * Safety rules enforced in this file:
 *   1. TEST_MONGO_URI MUST be set explicitly — never falls back to MONGO_URI.
 *   2. TEST_MONGO_URI MUST reference a database named with the prefix "test_"
 *      or ending with "_test" to prevent accidentally targeting production data.
 *   3. Destructive cleanup (deleteMany) only runs after those guards pass.
 *   4. No database changes are made if the connection fails.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { User } = require('../models/User');
const Recipient = require('../models/Recipient');
const { Certificate } = require('../models/Certificate');

// ── Test Database Safety Guard ─────────────────────────────────────────────
const TEST_MONGO_URI = process.env.TEST_MONGO_URI;

function assertTestDatabase(uri) {
  if (!uri) {
    throw new Error(
      '[SAFETY] TEST_MONGO_URI is not set.\n' +
      'Set it in server/.env pointing to a SEPARATE test database.\n' +
      'Example: TEST_MONGO_URI=mongodb://127.0.0.1:27017/certiverify_test\n' +
      'Never use the same URI as MONGO_URI (the application database).'
    );
  }
  const dbName = uri.split('/').pop().split('?')[0];
  if (!dbName.startsWith('test_') && !dbName.endsWith('_test')) {
    throw new Error(
      `[SAFETY] TEST_MONGO_URI points to database "${dbName}".\n` +
      'The database name must start with "test_" or end with "_test" to confirm it is isolated.\n' +
      'Example: certiverify_test, test_certiverify\n' +
      'This guard prevents accidental cleanup of production data.'
    );
  }
  const mainUri = process.env.MONGO_URI;
  if (mainUri && uri.trim() === mainUri.trim()) {
    throw new Error(
      '[SAFETY] TEST_MONGO_URI and MONGO_URI point to the same database.\n' +
      'Tests must use a completely separate database.'
    );
  }
}

let orgAToken, orgBToken;
let orgA, orgB;
let recipientA, recipientB;
let certA, certB;

beforeAll(async () => {
  assertTestDatabase(TEST_MONGO_URI);
  await mongoose.connect(TEST_MONGO_URI);

  const ts = Date.now();

  // Create two orgs
  const resA = await request(app).post('/api/auth/register').send({
    name: 'Org Alpha',
    email: `org-a-${ts}@test.certiverify.local`,
    password: 'OrgAlpha1',
  });
  const resB = await request(app).post('/api/auth/register').send({
    name: 'Org Beta',
    email: `org-b-${ts}@test.certiverify.local`,
    password: 'OrgBeta1',
  });

  orgAToken = resA.body.token;
  orgBToken = resB.body.token;
  orgA = resA.body.user;
  orgB = resB.body.user;

  // Create a recipient for each org
  const rA = await request(app)
    .post('/api/recipients')
    .set('Authorization', `Bearer ${orgAToken}`)
    .send({ name: 'Alice', email: `alice-${ts}@demo.local` });
  recipientA = rA.body.recipient;

  const rB = await request(app)
    .post('/api/recipients')
    .set('Authorization', `Bearer ${orgBToken}`)
    .send({ name: 'Bob', email: `bob-${ts}@demo.local` });
  recipientB = rB.body.recipient;

  // Issue a certificate for each org
  const cA = await request(app)
    .post('/api/certificates')
    .set('Authorization', `Bearer ${orgAToken}`)
    .send({ recipientId: recipientA._id, title: 'Cert A', issueDate: '2024-01-01' });
  certA = cA.body.certificate;

  const cB = await request(app)
    .post('/api/certificates')
    .set('Authorization', `Bearer ${orgBToken}`)
    .send({ recipientId: recipientB._id, title: 'Cert B', issueDate: '2024-01-01' });
  certB = cB.body.certificate;
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    // Safety guard is already validated in beforeAll; this runs only if connection succeeded
    await User.deleteMany({ email: /@test\.certiverify\.local$/ });
    await Recipient.deleteMany({ email: /@demo\.local$/ });
    await Certificate.deleteMany({ title: /^Cert (A|B)$/ });
    await mongoose.disconnect();
  }
});

describe('Cross-Organization Isolation', () => {
  it("Org A cannot view Org B's recipient", async () => {
    const res = await request(app)
      .get(`/api/recipients/${recipientB._id}`)
      .set('Authorization', `Bearer ${orgAToken}`);
    expect(res.status).toBe(404); // 404 not 403 — prevents enumeration
  });

  it("Org A cannot update Org B's recipient", async () => {
    const res = await request(app)
      .patch(`/api/recipients/${recipientB._id}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });

  it("Org A cannot view Org B's certificate", async () => {
    const res = await request(app)
      .get(`/api/certificates/${certB._id}`)
      .set('Authorization', `Bearer ${orgAToken}`);
    expect(res.status).toBe(404);
  });

  it("Org A cannot revoke Org B's certificate", async () => {
    const res = await request(app)
      .patch(`/api/certificates/${certB._id}/revoke`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ reason: 'Unauthorized revocation' });
    expect(res.status).toBe(404);
    // Verify cert B is NOT actually revoked
    const cert = await Certificate.findById(certB._id);
    expect(cert.isRevoked).toBe(false);
  });

  it("Org A cannot download Org B's certificate", async () => {
    const res = await request(app)
      .get(`/api/certificates/${certB._id}/download`)
      .set('Authorization', `Bearer ${orgAToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Admin Endpoint Protection', () => {
  it('org cannot access admin stats endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${orgAToken}`);
    expect(res.status).toBe(403);
  });

  it('org cannot list all organizations via admin route', async () => {
    const res = await request(app)
      .get('/api/admin/organizations')
      .set('Authorization', `Bearer ${orgAToken}`);
    expect(res.status).toBe(403);
  });

  it("org cannot change another org's status", async () => {
    const res = await request(app)
      .patch(`/api/admin/organizations/${orgB.id}/status`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'suspended' });
    expect(res.status).toBe(403);
    // Verify org B is still active
    const b = await User.findById(orgB.id);
    expect(b.status).toBe('active');
  });

  it('unauthenticated request to admin endpoint returns 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('Public Verification Safety', () => {
  it('returns valid status for an active certificate', async () => {
    const res = await request(app).get(`/api/public/verify/${certA.publicId}`);
    expect(res.status).toBe(200);
    expect(res.body.result.status).toBe('VALID');
    expect(res.body.result.certificateId).toBe(certA.publicId);
    // Must NOT expose internal IDs or org credentials
    expect(res.body.result._id).toBeUndefined();
    expect(res.body.result.organization?._id).toBeUndefined();
  });

  it('returns NOT_FOUND for unknown certificate ID', async () => {
    const res = await request(app).get('/api/public/verify/UNKNOWNID999');
    expect(res.status).toBe(200);
    expect(res.body.result.status).toBe('NOT_FOUND');
  });

  it('returns REVOKED status after revocation', async () => {
    // Revoke cert A using its owner (Org A)
    await request(app)
      .patch(`/api/certificates/${certA._id}/revoke`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ reason: 'Test revocation' });

    // Public verification should now show REVOKED
    const res = await request(app).get(`/api/public/verify/${certA.publicId}`);
    expect(res.status).toBe(200);
    expect(res.body.result.status).toBe('REVOKED');
  });
});
