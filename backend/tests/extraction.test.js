import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './create_fixtures.js';
import { evaluateRange } from '../src/services/evaluatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const UPLOAD_TMP_DIR = path.resolve(__dirname, '../tmp/uploads');

const BACKEND_URL = 'http://localhost:5000';
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

async function postReport(endpointUrl, filePath, fieldName = 'report', mimeType = 'application/pdf') {
  const formData = new FormData();
  if (filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append(fieldName, blob, fileName);
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    body: formData,
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  console.log('\n======================================================');
  console.log(' HealthLens AI: Phase 3 PDF Extraction Test Suite');
  console.log('======================================================\n');

  // Test 1: Valid text-based medical PDF (single test)
  await runTest('1. Valid text-based medical PDF extraction', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'valid_medical_single.pdf')
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected body.success === true');
    assert(body.testCount === 1, `Expected 1 test, found ${body.testCount}`);
    const test = body.tests[0];
    assert(test.testName === 'Hemoglobin', `Expected Hemoglobin, got ${test.testName}`);
    assert(test.value === 14.2, `Expected numeric 14.2, got ${test.value}`);
    assert(test.unit === 'g/dL', `Expected g/dL, got ${test.unit}`);
    assert(test.referenceRange === '12.0 - 15.5', `Expected 12.0 - 15.5, got ${test.referenceRange}`);
    assert(test.printedFlag === null, `Expected null printedFlag, got ${test.printedFlag}`);
  });

  // Test 2: PDF containing multiple test results with explicit high/low flags
  await runTest('2. PDF containing multiple test results with flags', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/extract`,
      path.join(FIXTURES_DIR, 'multi_test_report.pdf')
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected body.success === true');
    assert(body.testCount === 7, `Expected 7 tests extracted, got ${body.testCount}`);

    const byName = Object.fromEntries(body.tests.map((t) => [t.testName, t]));

    // Check Hemoglobin
    assert(byName['Hemoglobin'] && byName['Hemoglobin'].value === 14.2, 'Missing Hemoglobin');
    assert(byName['Hemoglobin'].printedFlag === null, 'Hemoglobin flag should be null');

    // Check WBC
    assert(byName['WBC'] && byName['WBC'].value === 7.5, 'Missing WBC');
    assert(byName['WBC'].unit === '10^3/uL', `Expected 10^3/uL, got ${byName['WBC'].unit}`);

    // Check Glucose, Fasting with 'H' flag
    assert(byName['Glucose, Fasting'] && byName['Glucose, Fasting'].value === 126, 'Missing Glucose');
    assert(byName['Glucose, Fasting'].printedFlag === 'H', `Expected H flag, got ${byName['Glucose, Fasting'].printedFlag}`);

    // Check Total Cholesterol with 'HIGH' flag and '< 200' range
    assert(byName['Total Cholesterol'] && byName['Total Cholesterol'].value === 210, 'Missing Cholesterol');
    assert(byName['Total Cholesterol'].referenceRange === '< 200', `Expected < 200, got ${byName['Total Cholesterol'].referenceRange}`);
    assert(byName['Total Cholesterol'].printedFlag === 'HIGH', `Expected HIGH flag, got ${byName['Total Cholesterol'].printedFlag}`);

    // Check HbA1c with '*' flag
    assert(byName['HbA1c'] && byName['HbA1c'].value === 6.8, 'Missing HbA1c');
    assert(byName['HbA1c'].printedFlag === '*', `Expected * flag, got ${byName['HbA1c'].printedFlag}`);

    // Check Vitamin D with 'LOW' flag
    assert(byName['Vitamin D, 25-OH'] && byName['Vitamin D, 25-OH'].value === 22.4, 'Missing Vitamin D');
    assert(byName['Vitamin D, 25-OH'].printedFlag === 'LOW', `Expected LOW flag, got ${byName['Vitamin D, 25-OH'].printedFlag}`);
  });

  // Test 3: Report with missing reference ranges (preserves uncertainty, zero fabrication)
  await runTest('3. Report with missing reference ranges (uncertainty preservation)', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'missing_ranges_report.pdf')
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.testCount === 3, `Expected 3 tests, got ${body.testCount}`);

    const alpha = body.tests.find((t) => t.testName === 'Experimental Biomarker Alpha');
    assert(alpha, 'Missing Experimental Biomarker Alpha');
    assert(alpha.value === 45, `Expected 45, got ${alpha.value}`);
    assert(alpha.unit === 'ng/mL', `Expected ng/mL, got ${alpha.unit}`);
    assert(alpha.referenceRange === null, `Expected null referenceRange, got ${alpha.referenceRange}`);

    const beta = body.tests.find((t) => t.testName === 'Novel Cytokine Beta');
    assert(beta, 'Missing Novel Cytokine Beta');
    assert(beta.referenceRange === null, `Expected null referenceRange, got ${beta.referenceRange}`);

    const hemo = body.tests.find((t) => t.testName === 'Hemoglobin');
    assert(hemo && hemo.referenceRange === '12.0 - 15.5', 'Hemoglobin range should be preserved');
  });

  // Test 4: Unusual formatting, pipes, and extra spaces
  await runTest('4. Unusual formatting and line breaks', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'unusual_formatting_report.pdf')
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.testCount === 3, `Expected 3 tests parsed from unusual formatting, got ${body.testCount}`);
    const glucose = body.tests.find((t) => t.testName === 'Glucose, Fasting');
    assert(glucose && glucose.value === 126 && glucose.printedFlag === 'H', 'Failed parsing piped Glucose row');
  });

  // Test 5: Scanned / Image-only PDF (no digital text stream)
  await runTest('5. Image-only / Scanned PDF rejection (OCR unsupported)', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'scanned_image_only.pdf')
    );
    assert(status === 422, `Expected 422 Unprocessable Entity, got ${status}`);
    assert(body.success === false, 'Expected success: false');
    assert(body.code === 'SCANNED_PDF_NOT_SUPPORTED', `Expected SCANNED_PDF_NOT_SUPPORTED, got ${body.code}`);
    assert(
      body.message.toLowerCase().includes('scanned') && body.message.toLowerCase().includes('ocr'),
      `Expected message explaining scanned/OCR limitation: ${body.message}`
    );
  });

  // Test 6: Empty and malformed PDFs
  await runTest('6. Empty and malformed PDFs handling', async () => {
    // 6a: 0-byte file
    const emptyRes = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'empty.pdf')
    );
    assert(emptyRes.status === 400, `Expected 400 for empty file, got ${emptyRes.status}`);
    assert(emptyRes.body.success === false, 'Expected success: false for empty');

    // 6b: Malformed / Corrupted PDF structure
    const corruptRes = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'corrupt_malformed.pdf')
    );
    assert(corruptRes.status === 400, `Expected 400 for corrupt PDF, got ${corruptRes.status}`);
    assert(corruptRes.body.success === false, 'Expected success: false for corrupt');
    assert(
      corruptRes.body.message.toLowerCase().includes('corrupt') ||
        corruptRes.body.message.toLowerCase().includes('invalid'),
      `Expected corrupt message, got: ${corruptRes.body.message}`
    );
  });

  // Test 7: A PDF without recognizable medical test data
  await runTest('7. PDF without recognizable medical test data', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'non_medical_doc.pdf')
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected success: true');
    assert(body.testCount === 0, `Expected 0 tests, got ${body.testCount}`);
    assert(Array.isArray(body.tests) && body.tests.length === 0, 'Expected empty tests array');
    assert(
      body.warnings && body.warnings.length > 0 && body.warnings[0].includes('No recognizable medical test data'),
      `Expected non-medical warning, got: ${JSON.stringify(body.warnings)}`
    );
  });

  // Test 8: Request without a file
  await runTest('8. Request without a file', async () => {
    const { status, body } = await postReport(`${BACKEND_URL}/api/reports/upload`, null);
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, 'Expected success: false');
    assert(body.message.includes('required'), `Expected file required error, got: ${body.message}`);
  });

  // Test 9: Temporary-file cleanup verification after both success and failure
  await runTest('9. Temporary file cleanup after success and failure', async () => {
    const lingeringFiles = fs.readdirSync(UPLOAD_TMP_DIR);
    assert(
      lingeringFiles.length === 0,
      `Expected 0 leftover files in ${UPLOAD_TMP_DIR}, found: ${lingeringFiles.join(', ')}`
    );
  });

  // Test 10: Regression tests for existing endpoints and Adaption evaluator
  await runTest('10. Regression tests for health, upload, and Adaption evaluator', async () => {
    // Health check
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200 && health.status === 'ok', 'Health check failed');

    // Backward-compatible upload format check
    const uploadRes = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'valid_report.pdf')
    );
    assert(uploadRes.status === 200, 'Upload regression failed');
    assert(uploadRes.body.file && uploadRes.body.file.mimeType === 'application/pdf', 'File info missing');

    // Evaluator unit test regression
    const evalRes = evaluateRange(3.2, '3.5 - 5.1');
    assert(
      evalRes.status === 'LOW' || evalRes.legacyStatus === 'Below Range',
      `Expected LOW or Below Range, got ${evalRes.status}`
    );
  });

  console.log('\n======================================================');
  console.log(' Phase 3 Test Suite Summary');
  console.log('======================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
