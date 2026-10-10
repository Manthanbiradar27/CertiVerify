'use strict';
/**
 * Authentication & Session Tests
 * ─────────────────────────────────────────────────────────────────────────────
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

beforeAll(async () => {
  assertTestDatabase(TEST_MONGO_URI);
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    // Only clean up test-specific records
    await User.deleteMany({ email: /@test\.certiverify\.local$/ });
    await mongoose.disconnect();
  }
});

describe('POST /api/auth/register', () => {
  const email = `reg-test-${Date.now()}@test.certiverify.local`;

  it('registers a new organization successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Org',
      email,
      password: 'TestPass1',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('organization');
    expect(res.body.user.email).toBe(email);
    // Must not return password
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 409 on duplicate email (generic message)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Org 2',
      email,
      password: 'TestPass1',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    // Message must not reveal that the email exists specifically
    expect(res.body.message).not.toMatch(/already.*registered/i);
    expect(res.body.message).not.toMatch(/email.*taken/i);
  });

  it('returns 422 on invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Org',
      email: 'not-an-email',
      password: 'TestPass1',
    });
    expect(res.status).toBe(422);
  });

  it('returns 422 on weak password (no uppercase)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Org',
      email: `weak-${Date.now()}@test.certiverify.local`,
      password: 'weakpass1',
    });
    expect(res.status).toBe(422);
  });

  it('cannot self-register with admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attacker',
      email: `attacker-${Date.now()}@test.certiverify.local`,
      password: 'AttackPass1',
      role: 'admin', // should be ignored
    });
    // If registration succeeds, role must be organization
    if (res.status === 201) {
      expect(res.body.user.role).toBe('organization');
    }
  });
});

describe('POST /api/auth/login', () => {
  const email = `login-test-${Date.now()}@test.certiverify.local`;
  const password = 'LoginPass1';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Login Test Org', email, password });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects wrong password with generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    // Must not reveal whether password or email was wrong
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects non-existent email with same generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.certiverify.local', password: 'SomePass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

describe('GET /api/auth/me — protected route', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    const email = `me-test-${Date.now()}@test.certiverify.local`;
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Me Test',
      email,
      password: 'MePass1',
    });
    const { token } = regRes.body;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
  });
});
