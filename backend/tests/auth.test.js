import assert from 'assert';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const BASE_URL = 'http://localhost:5000';
let total = 0;
let passed = 0;
let failed = 0;

function report(name, isPass, detail = '') {
  total++;
  if (isPass) {
    passed++;
    console.log(`✓ [PASS] ${total}. ${name}`);
  } else {
    failed++;
    console.error(`✗ [FAIL] ${total}. ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function runAuthTests() {
  console.log('================================================================');
  console.log(' HealthLens AI: Authentication & User Registration Test Suite');
  console.log('================================================================\n');

  // Connect direct to test database to verify password hashing
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthlens');
  
  // Clean test users before starting
  const testEmail = `testuser_${Date.now()}@healthlens.ai`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Dr. Sarah Connor';

  let authCookie = null;
  let authToken = null;

  // 1. Successful Registration
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: testName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, `Expected status 201, got ${res.status}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail.toLowerCase());
    assert.strictEqual(data.user.fullName, testName);
    assert.strictEqual(data.user.password, undefined, 'Password must not be returned in response');
    assert.ok(data.token, 'Token should be returned');

    // Extract cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'HttpOnly cookie should be set');
    assert.ok(setCookie.includes('token='), 'Cookie should contain token');
    assert.ok(setCookie.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly');

    authCookie = setCookie.split(';')[0];
    authToken = data.token;

    report('Successful registration with required fields and HttpOnly cookie', true);
  } catch (err) {
    report('Successful registration with required fields and HttpOnly cookie', false, err.message);
  }

  // 2. Reject Missing Required Fields
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: '',
        email: 'bad@example.com',
        password: '123',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    report('Registration rejects missing/short required fields with 400', true);
  } catch (err) {
    report('Registration rejects missing/short required fields with 400', false, err.message);
  }

  // 3. Reject Duplicate Email
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another User',
        email: testEmail, // duplicate
        password: 'Password999!',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.toLowerCase().includes('already exists'));
    report('Registration rejects duplicate email addresses with 409', true);
  } catch (err) {
    report('Registration rejects duplicate email addresses with 409', false, err.message);
  }

  // 4. Verify Password Hashing in MongoDB (Never Plaintext)
  try {
    const dbUser = await User.findOne({ email: testEmail.toLowerCase() }).select('+password');
    assert.ok(dbUser, 'User must exist in MongoDB');
    assert.notStrictEqual(dbUser.password, testPassword, 'Password must NOT be stored in plaintext');
    assert.ok(dbUser.password.startsWith('$2'), 'Password must be hashed with bcrypt ($2a$ or $2b$)');

    const compareMatch = await dbUser.comparePassword(testPassword);
    assert.strictEqual(compareMatch, true, 'bcrypt compare must validate original password');

    const compareWrong = await dbUser.comparePassword('WrongPassword!');
    assert.strictEqual(compareWrong, false, 'bcrypt compare must reject wrong password');

    report('Password is securely hashed with bcrypt in MongoDB (never plaintext)', true);
  } catch (err) {
    report('Password is securely hashed with bcrypt in MongoDB (never plaintext)', false, err.message);
  }

  // 5. Successful Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail.toLowerCase());
    assert.strictEqual(data.user.password, undefined);
    assert.ok(data.token);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie.includes('token='));
    authCookie = setCookie.split(';')[0];

    report('Successful login issues JWT and sets HttpOnly cookie', true);
  } catch (err) {
    report('Successful login issues JWT and sets HttpOnly cookie', false, err.message);
  }

  // 6. Invalid Password Rejection (Generic Error)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword!',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Invalid email or password.');
    report('Invalid login rejects wrong password with generic error (401)', true);
  } catch (err) {
    report('Invalid login rejects wrong password with generic error (401)', false, err.message);
  }

  // 7. Non-Existent Email Rejection (Generic Error)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody_does_not_exist@healthlens.ai',
        password: testPassword,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Invalid email or password.');
    report('Invalid login rejects unknown email with same generic error (401)', true);
  } catch (err) {
    report('Invalid login rejects unknown email with same generic error (401)', false, err.message);
  }

  // 8. Protected Route Access with Cookie
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail.toLowerCase());
    assert.strictEqual(data.user.fullName, testName);
    report('Protected route (/api/auth/me) accepts valid HttpOnly cookie session', true);
  } catch (err) {
    report('Protected route (/api/auth/me) accepts valid HttpOnly cookie session', false, err.message);
  }

  // 9. Protected Route Access with Authorization Header
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail.toLowerCase());
    report('Protected route (/api/auth/me) accepts valid Bearer Authorization header', true);
  } catch (err) {
    report('Protected route (/api/auth/me) accepts valid Bearer Authorization header', false, err.message);
  }

  // 10. Protected Route Rejects Unauthenticated Requests
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    report('Protected route rejects unauthenticated requests with 401', true);
  } catch (err) {
    report('Protected route rejects unauthenticated requests with 401', false, err.message);
  }

  // 11. Logout Clears Cookie
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    // Cookie cleared check (expires in past or empty value)
    assert.ok(setCookie.includes('token=;') || setCookie.includes('Expires=Thu, 01 Jan 1970'));
    report('Logout endpoint (/api/auth/logout) clears authentication cookie', true);
  } catch (err) {
    report('Logout endpoint (/api/auth/logout) clears authentication cookie', false, err.message);
  }

  // 12. Verify Existing PDF Analysis Pipeline Still Works
  try {
    const validPdfPath = path.join(FIXTURES_DIR, 'valid_medical_single.pdf');
    const fileBuffer = fs.readFileSync(validPdfPath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('report', blob, 'valid_medical_single.pdf');

    const res = await fetch(`${BASE_URL}/api/reports/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.tests && data.tests.length > 0);
    report('Existing PDF report upload and analysis pipeline functions normally', true);
  } catch (err) {
    report('Existing PDF report upload and analysis pipeline functions normally', false, err.message);
  }

  // Clean up test user
  await User.deleteOne({ email: testEmail.toLowerCase() });
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(' Authentication Test Suite Summary');
  console.log('================================================================');
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Fatal error during auth test runner:', err);
  process.exit(1);
});
