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

async function uploadPdf(targetUrl, filePath, fieldName = 'report', mimeType = 'application/pdf') {
  const formData = new FormData();
  if (filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });
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
  console.log('\n================================================================');
  console.log(' HealthLens AI: Phase 6 End-to-End Dashboard Flow Test Suite');
  console.log('================================================================\n');

  // Test 1: Complete PDF Upload-to-Dashboard API Flow (Comprehensive Report)
  await runTest('1. Complete PDF upload-to-dashboard API flow (actual data)', async () => {
    const { status, body } = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'evaluation_comprehensive.pdf')
    );

    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected body.success === true');
    assert(body.testCount === 9, `Expected 9 extracted tests, got ${body.testCount}`);
    assert(body.evaluationSummary, 'Expected evaluationSummary in response');
    assert(body.evaluationSummary.total === 9, 'evaluationSummary total mismatch');
    assert(body.aiExplanation, 'Expected aiExplanation in response');
    assert(body.aiExplanation.overallSummary, 'Expected overallSummary in aiExplanation');
    assert(body.aiExplanation.disclaimer, 'Expected medical disclaimer in aiExplanation');
  });

  // Test 2: Dashboard data schema integrity (zero hardcoded values, full fidelity)
  await runTest('2. Dashboard data schema integrity for each extracted test record', async () => {
    const { status, body } = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'evaluation_comprehensive.pdf')
    );

    for (const test of body.tests) {
      assert(typeof test.testName === 'string' && test.testName.length > 0, 'Invalid testName');
      assert(test.value !== undefined && test.value !== null, 'Value must be present');
      assert(test.status !== undefined, 'status must be defined');
      assert(
        ['LOW', 'NORMAL', 'HIGH', 'NOT_EVALUATED'].includes(test.status),
        `Status ${test.status} is not one of canonical enum`
      );
      assert(test.boundaryInfo !== undefined, 'boundaryInfo must be defined');
      assert(typeof test.boundaryInfo.isBoundary === 'boolean', 'isBoundary must be boolean');
      assert(test.flagDiscrepancy !== undefined, 'flagDiscrepancy must be defined');
      assert(typeof test.flagDiscrepancy.hasDiscrepancy === 'boolean', 'hasDiscrepancy must be boolean');
    }
  });

  // Test 3: Missing reference range handling (NOT_EVALUATED, no fabrication)
  await runTest('3. Missing reference ranges properly marked NOT_EVALUATED', async () => {
    const { status, body } = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'missing_ranges_report.pdf')
    );

    assert(status === 200, `Expected 200, got ${status}`);
    const alpha = body.tests.find((t) => t.testName === 'Experimental Biomarker Alpha');
    assert(alpha, 'Missing biomarker Alpha');
    assert(alpha.status === 'NOT_EVALUATED', `Expected NOT_EVALUATED, got ${alpha.status}`);
    assert(alpha.referenceRange === null, 'referenceRange should be null');
    assert(alpha.evaluationReason.includes('No reference range provided'), 'Reason mismatch');
  });

  // Test 4: Printed flag conflict detection & reporting
  await runTest('4. Printed report flag conflicts detected without silent mutation', async () => {
    const { status, body } = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'evaluation_comprehensive.pdf')
    );

    const conflicting = body.tests.find((t) => t.testName === 'Conflicting Marker');
    assert(conflicting, 'Missing Conflicting Marker');
    assert(conflicting.printedFlag === 'H', 'Printed flag must be preserved as H');
    assert(conflicting.status === 'NORMAL', 'Calculated status must be NORMAL based on range');
    assert(
      conflicting.flagDiscrepancy.message.includes('conflicts') ||
        conflicting.flagDiscrepancy.message.includes('indicates HIGH, but calculated status is NORMAL'),
      'Message must explain conflict'
    );
  });

  // Test 5: Rejection of invalid non-PDF and renamed files (Authoritative backend)
  await runTest('5. Rejection of invalid non-PDF formats (PNG & renamed text)', async () => {
    // 5a. PNG
    const pngRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'sample_image.png'),
      'report',
      'image/png'
    );
    assert(pngRes.status === 400, `Expected 400 for PNG, got ${pngRes.status}`);
    assert(pngRes.body.success === false, 'Expected success: false');

    // 5b. Renamed text file
    const fakeRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'fake_renamed.pdf')
    );
    assert(fakeRes.status === 400, `Expected 400 for fake PDF, got ${fakeRes.status}`);
    assert(fakeRes.body.message.toLowerCase().includes('signature') || fakeRes.body.message.toLowerCase().includes('invalid'), 'Signature mismatch');
  });

  // Test 6: Rejection of empty, oversized, and corrupt PDFs
  await runTest('6. Handling of empty (0B), oversized (>5MB), and corrupt PDFs', async () => {
    // Empty
    const emptyRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'empty.pdf')
    );
    assert(emptyRes.status === 400, `Expected 400 for empty PDF, got ${emptyRes.status}`);

    // Oversized
    const largeRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'large_report.pdf')
    );
    assert(largeRes.status === 400, `Expected 400 for large PDF, got ${largeRes.status}`);

    // Corrupt
    const corruptRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'corrupt_malformed.pdf')
    );
    assert(corruptRes.status === 400, `Expected 400 for corrupt PDF, got ${corruptRes.status}`);
  });

  // Test 7: Scanned / Image-Only PDF graceful rejection with OCR notice
  await runTest('7. Scanned / image-only PDF rejection with explicit OCR notice', async () => {
    const scannedRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'scanned_image_only.pdf')
    );
    assert(scannedRes.status === 422, `Expected 422 for scanned PDF, got ${scannedRes.status}`);
    assert(scannedRes.body.code === 'SCANNED_PDF_NOT_SUPPORTED', 'Code mismatch');
    assert(
      scannedRes.body.message.toLowerCase().includes('scanned') &&
        scannedRes.body.message.toLowerCase().includes('ocr'),
      'Expected OCR and scanned explanation'
    );
  });

  // Test 8: Non-medical document handling (0 tests, graceful empty state)
  await runTest('8. PDF without recognizable medical test data (empty results state)', async () => {
    const nonMedRes = await uploadPdf(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'non_medical_doc.pdf')
    );
    assert(nonMedRes.status === 200, `Expected 200, got ${nonMedRes.status}`);
    assert(nonMedRes.body.testCount === 0, 'Expected 0 tests');
    assert(Array.isArray(nonMedRes.body.tests) && nonMedRes.body.tests.length === 0, 'Expected empty array');
    assert(nonMedRes.body.warnings && nonMedRes.body.warnings.length > 0, 'Expected warning message');
  });

  // Test 9: End-to-end communication via Vite frontend proxy
  await runTest('9. End-to-end communication via Vite frontend proxy (http://localhost:5173/api/reports/upload)', async () => {
    const proxyRes = await uploadPdf(
      `${FRONTEND_PROXY_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'valid_medical_single.pdf')
    );
    assert(proxyRes.status === 200, `Expected 200 via Vite proxy, got ${proxyRes.status}`);
    assert(proxyRes.body.success === true, 'Expected success: true');
    assert(proxyRes.body.testCount === 1, 'Expected 1 test');
    assert(proxyRes.body.tests[0].testName === 'Hemoglobin', 'Expected Hemoglobin');
    assert(proxyRes.body.tests[0].status === 'NORMAL', 'Expected NORMAL');
    assert(proxyRes.body.aiExplanation, 'aiExplanation must pass through proxy');
  });

  // Test 10: Temporary file cleanup verification
  await runTest('10. Guaranteed ephemeral disk cleanup (zero leftover files in tmp/uploads)', async () => {
    const lingeringFiles = fs.readdirSync(UPLOAD_TMP_DIR);
    assert(
      lingeringFiles.length === 0,
      `Expected 0 leftover files in ${UPLOAD_TMP_DIR}, found: ${lingeringFiles.join(', ')}`
    );
  });

  console.log('\n================================================================');
  console.log(' Phase 6 End-to-End Dashboard Flow Test Summary');
  console.log('================================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
