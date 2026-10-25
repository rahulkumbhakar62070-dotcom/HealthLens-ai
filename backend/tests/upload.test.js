import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './create_fixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const UPLOAD_TMP_DIR = path.resolve(__dirname, '../tmp/uploads');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_PROXY_URL = 'http://localhost:5173';

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`✓ [PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ [FAIL] ${name}: ${err.message}`);
  }
}

async function uploadFile(targetUrl, filePath, fieldName = 'report', mimeType = null) {
  const formData = new FormData();
  if (filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType || 'application/pdf' });
    formData.append(fieldName, blob, fileName);
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  console.log('\n--- Running HealthLens AI Phase 2 Test Suite ---\n');

  // Test 1: Upload a valid, non-empty PDF
  await runTest('1. Upload valid non-empty PDF', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'valid_report.pdf'),
      'report',
      'application/pdf'
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, `Expected body.success === true`);
    assert(body.file && body.file.name.includes('valid_report'), `Expected valid filename`);
    assert(body.file.size > 0, `Expected non-zero file size`);
    assert(body.file.mimeType === 'application/pdf', `Expected application/pdf`);
  });

  // Test 2: Upload a PNG file (rejected by MIME/ext filter)
  await runTest('2. Upload non-PDF file (PNG image)', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'sample_image.png'),
      'report',
      'image/png'
    );
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, `Expected body.success === false`);
    assert(body.message.includes('PDF'), `Expected error message mentioning PDF requirement: ${body.message}`);
  });

  // Test 3: Upload renamed text file with .pdf extension (signature inspection)
  await runTest('3. Upload renamed text file with .pdf extension (signature inspection)', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'fake_renamed.pdf'),
      'report',
      'application/pdf'
    );
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, `Expected body.success === false`);
    assert(
      body.message.toLowerCase().includes('signature') || body.message.toLowerCase().includes('invalid'),
      `Expected signature rejection message: ${body.message}`
    );
  });

  // Test 4: Upload an empty file (0 bytes)
  await runTest('4. Upload empty file (0 bytes)', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'empty.pdf'),
      'report',
      'application/pdf'
    );
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, `Expected body.success === false`);
    assert(
      body.message.toLowerCase().includes('empty'),
      `Expected error message mentioning empty file: ${body.message}`
    );
  });

  // Test 5: Upload a file exceeding 5 MB limit
  await runTest('5. Upload file exceeding 5 MB limit', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'large_report.pdf'),
      'report',
      'application/pdf'
    );
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, `Expected body.success === false`);
    assert(
      body.message.toLowerCase().includes('5 mb') || body.message.toLowerCase().includes('exceeds'),
      `Expected message mentioning size limit: ${body.message}`
    );
  });

  // Test 6: Submit request without a file
  await runTest('6. Submit request without file', async () => {
    const { status, body } = await uploadFile(
      `${BACKEND_URL}/api/reports/upload`,
      null
    );
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, `Expected body.success === false`);
    assert(body.message.includes('required'), `Expected file required error: ${body.message}`);
  });

  // Test 7: Verify temporary files are cleaned up from disk
  await runTest('7. Verify temporary upload directory is clean (zero retained files)', async () => {
    const files = fs.readdirSync(UPLOAD_TMP_DIR);
    assert(
      files.length === 0,
      `Expected 0 leftover files in ${UPLOAD_TMP_DIR}, found: ${files.join(', ')}`
    );
  });

  // Test 8: Upload through Vite proxy to verify full frontend-to-backend communication
  await runTest('8. Upload valid PDF through Vite frontend proxy (http://localhost:5173/api/reports/upload)', async () => {
    const { status, body } = await uploadFile(
      `${FRONTEND_PROXY_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'valid_report.pdf'),
      'report',
      'application/pdf'
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, `Expected body.success === true`);
    assert(body.file && body.file.size > 0, `Expected file size in proxy response`);
  });

  // Test 9: Verify Phase 1 health check regression test
  await runTest('9. Re-verify GET /api/health endpoint', async () => {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(data.status === 'ok', `Expected data.status === 'ok'`);
    assert(data.service === 'HealthLens AI API', `Expected service name match`);
  });

  // Test 10: Verify second check that tmp remains clean after proxy upload
  await runTest('10. Re-verify temporary storage after proxy upload', async () => {
    const files = fs.readdirSync(UPLOAD_TMP_DIR);
    assert(
      files.length === 0,
      `Expected 0 leftover files in ${UPLOAD_TMP_DIR}, found: ${files.join(', ')}`
    );
  });

  console.log('\n--- Test Summary ---');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
