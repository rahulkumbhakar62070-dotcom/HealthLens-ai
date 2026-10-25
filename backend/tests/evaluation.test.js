import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './create_fixtures.js';
import {
  evaluateRange,
  evaluateMedicalTest,
  checkFlagDiscrepancy,
  EVAL_STATUS,
} from '../src/services/evaluatorService.js';

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
  console.log('\n================================================================');
  console.log(' HealthLens AI: Phase 4 Reference-Range Evaluation Test Suite');
  console.log('================================================================\n');

  // Test 1: Value below a numeric range (LOW)
  await runTest('1. Value below numeric range -> LOW', async () => {
    const res = evaluateRange(3.1, '3.5 - 5.1');
    assert(res.status === EVAL_STATUS.LOW, `Expected LOW, got ${res.status}`);
    assert(res.legacyStatus === 'Below Range', `Expected Below Range legacy status`);
    assert(res.observed === 3.1, `Expected observed 3.1`);
    assert(res.min === 3.5 && res.max === 5.1, `Expected bounds 3.5 and 5.1`);
  });

  // Test 2: Value within a numeric range (NORMAL)
  await runTest('2. Value within numeric range -> NORMAL', async () => {
    const res = evaluateRange(140, '136 - 145');
    assert(res.status === EVAL_STATUS.NORMAL, `Expected NORMAL, got ${res.status}`);
    assert(res.legacyStatus === 'Within Range', `Expected Within Range legacy status`);
    assert(res.boundaryInfo && res.boundaryInfo.isBoundary === false, 'Should not be flagged as boundary');
  });

  // Test 3: Value above a numeric range (HIGH)
  await runTest('3. Value above numeric range -> HIGH', async () => {
    const res = evaluateRange(135, '70 - 99');
    assert(res.status === EVAL_STATUS.HIGH, `Expected HIGH, got ${res.status}`);
    assert(res.legacyStatus === 'Above Range', `Expected Above Range legacy status`);
    assert(res.observed === 135, `Expected observed 135`);
  });

  // Test 4: Values at range boundaries (Explicit boundary behavior)
  await runTest('4. Range boundary evaluation behavior', async () => {
    // 4a. Exact min bound on interval [12.0, 15.5] -> NORMAL
    const minRes = evaluateRange(12.0, '12.0 - 15.5');
    assert(minRes.status === EVAL_STATUS.NORMAL, `Expected min bound 12.0 to be NORMAL, got ${minRes.status}`);
    assert(minRes.boundaryInfo.isBoundary === true, 'Expected isBoundary: true for min bound');
    assert(minRes.boundaryInfo.boundaryType === 'min', 'Expected boundaryType: min');
    assert(minRes.boundaryInfo.inclusive === true, 'Expected inclusive: true');

    // 4b. Exact max bound on interval [8.6, 10.2] -> NORMAL
    const maxRes = evaluateRange(10.2, '8.6 - 10.2');
    assert(maxRes.status === EVAL_STATUS.NORMAL, `Expected max bound 10.2 to be NORMAL, got ${maxRes.status}`);
    assert(maxRes.boundaryInfo.isBoundary === true, 'Expected isBoundary: true for max bound');
    assert(maxRes.boundaryInfo.boundaryType === 'max', 'Expected boundaryType: max');

    // 4c. Strict inequality upper limit: value 200 on "< 200"
    // Since notation is strict "<", a value of 200 is NOT less than 200 -> HIGH
    const strictUpper = evaluateRange(200, '< 200');
    assert(strictUpper.status === EVAL_STATUS.HIGH, `Expected 200 on "< 200" to evaluate to HIGH, got ${strictUpper.status}`);
    assert(strictUpper.boundaryInfo.isBoundary === true, 'Expected isBoundary: true');
    assert(strictUpper.boundaryInfo.inclusive === false, 'Expected inclusive: false');
    assert(strictUpper.boundaryInfo.note.includes('strict upper limit'), 'Expected boundary note');

    // 4d. Strict inequality lower limit: value 60 on "> 60"
    // Since notation is strict ">", a value of 60 is NOT greater than 60 -> LOW
    const strictLower = evaluateRange(60, '> 60');
    assert(strictLower.status === EVAL_STATUS.LOW, `Expected 60 on "> 60" to evaluate to LOW, got ${strictLower.status}`);
    assert(strictLower.boundaryInfo.isBoundary === true, 'Expected isBoundary: true');
    assert(strictLower.boundaryInfo.inclusive === false, 'Expected inclusive: false');
    assert(strictLower.boundaryInfo.note.includes('strict lower limit'), 'Expected boundary note');

    // 4e. Inclusive inequality: value 60 on ">= 60" -> NORMAL
    const inclusiveLower = evaluateRange(60, '>= 60');
    assert(inclusiveLower.status === EVAL_STATUS.NORMAL, `Expected 60 on ">= 60" to be NORMAL, got ${inclusiveLower.status}`);
    assert(inclusiveLower.boundaryInfo.inclusive === true, 'Expected inclusive: true');
  });

  // Test 5: "<" and ">" reference ranges
  await runTest('5. Inequality reference ranges (< and >)', async () => {
    // Upper bound: < 200
    const normalChol = evaluateRange(185, '< 200');
    assert(normalChol.status === EVAL_STATUS.NORMAL, `Expected NORMAL for 185 < 200, got ${normalChol.status}`);

    const highChol = evaluateRange(240, '< 200');
    assert(highChol.status === EVAL_STATUS.HIGH, `Expected HIGH for 240 < 200, got ${highChol.status}`);

    // Lower bound: > 60
    const normalEgfr = evaluateRange(85, '> 60');
    assert(normalEgfr.status === EVAL_STATUS.NORMAL, `Expected NORMAL for 85 > 60, got ${normalEgfr.status}`);

    const lowEgfr = evaluateRange(45, '> 60');
    assert(lowEgfr.status === EVAL_STATUS.LOW, `Expected LOW for 45 > 60, got ${lowEgfr.status}`);
  });

  // Test 6: Missing reference range -> NOT_EVALUATED
  await runTest('6. Missing reference range -> NOT_EVALUATED with reason', async () => {
    const resNull = evaluateRange(45.0, null);
    assert(resNull.status === EVAL_STATUS.NOT_EVALUATED, `Expected NOT_EVALUATED for null range, got ${resNull.status}`);
    assert(resNull.reason.includes('No reference range provided'), `Expected missing reason, got: ${resNull.reason}`);

    const resEmpty = evaluateRange(45.0, '   ');
    assert(resEmpty.status === EVAL_STATUS.NOT_EVALUATED, `Expected NOT_EVALUATED for empty range`);
  });

  // Test 7: Malformed or unsupported reference range
  await runTest('7. Malformed or unsupported reference range -> NOT_EVALUATED', async () => {
    // Qualitative text range
    const resQual = evaluateRange('No growth', 'Negative');
    assert(resQual.status === EVAL_STATUS.NOT_EVALUATED, `Expected NOT_EVALUATED for qualitative range`);
    assert(resQual.reason.includes('qualitative'), `Expected qualitative reason, got: ${resQual.reason}`);

    // Unrecognized text
    const resUnrec = evaluateRange(50, 'see attached clinical chart');
    assert(resUnrec.status === EVAL_STATUS.NOT_EVALUATED, `Expected NOT_EVALUATED for unrecognized text`);
    assert(resUnrec.reason.includes('unparseable') || resUnrec.reason.includes('unrecognized'), 'Expected unparseable reason');
  });

  // Test 8: Printed flag conflicting with calculated status
  await runTest('8. Printed flag conflicting with calculated status (discrepancy reporting)', async () => {
    // Hemoglobin 14.0 is within 12.0 - 15.5 (calculated NORMAL), but report printed "H"
    const testRecord = {
      testName: 'Hemoglobin',
      value: 14.0,
      unit: 'g/dL',
      referenceRange: '12.0 - 15.5',
      printedFlag: 'H',
      rawLine: 'Hemoglobin 14.0 g/dL 12.0 - 15.5 H',
    };

    const evaluated = evaluateMedicalTest(testRecord);

    // 8a. Original fields preserved
    assert(evaluated.testName === 'Hemoglobin', 'testName altered');
    assert(evaluated.value === 14.0, 'value altered');
    assert(evaluated.unit === 'g/dL', 'unit altered');
    assert(evaluated.referenceRange === '12.0 - 15.5', 'referenceRange altered');
    assert(evaluated.printedFlag === 'H', 'printedFlag altered');

    // 8b. Calculated status is NORMAL (pure math)
    assert(evaluated.status === EVAL_STATUS.NORMAL, `Expected calculated status NORMAL, got ${evaluated.status}`);

    // 8c. Discrepancy detected and reported
    assert(evaluated.flagDiscrepancy.hasDiscrepancy === true, 'Expected flag discrepancy to be true');
    assert(
      evaluated.flagDiscrepancy.message.includes('conflicts') ||
        evaluated.flagDiscrepancy.message.includes('indicates HIGH, but calculated status is NORMAL'),
      `Expected conflict explanation, got: ${evaluated.flagDiscrepancy.message}`
    );

    // 8d. Agreement case: Glucose 135 mg/dL 70-99 with "H" -> hasDiscrepancy: false
    const agreeRecord = {
      testName: 'Glucose',
      value: 135,
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      printedFlag: 'H',
    };
    const agreeEvaluated = evaluateMedicalTest(agreeRecord);
    assert(agreeEvaluated.status === EVAL_STATUS.HIGH, 'Expected HIGH');
    assert(agreeEvaluated.flagDiscrepancy.hasDiscrepancy === false, 'Agreement should not be a discrepancy');
  });

  // Test 9: Multiple tests in one report evaluated end-to-end via API
  await runTest('9. Multiple tests in one report evaluated end-to-end via API', async () => {
    const { status, body } = await postReport(
      `${BACKEND_URL}/api/reports/upload`,
      path.join(FIXTURES_DIR, 'evaluation_comprehensive.pdf')
    );

    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected success: true');
    assert(body.testCount === 9, `Expected 9 tests in comprehensive report, got ${body.testCount}`);

    // Check evaluationSummary
    assert(body.evaluationSummary, 'Expected evaluationSummary object in response');
    const summary = body.evaluationSummary;
    assert(summary.total === 9, `Expected total 9, got ${summary.total}`);
    assert(summary.lowCount >= 2, `Expected at least 2 LOW tests (Potassium, eGFR), got ${summary.lowCount}`);
    assert(summary.normalCount >= 3, `Expected at least 3 NORMAL tests, got ${summary.normalCount}`);
    assert(summary.highCount >= 2, `Expected at least 2 HIGH tests (Glucose, Cholesterol boundary), got ${summary.highCount}`);
    assert(summary.notEvaluatedCount >= 1, `Expected at least 1 NOT_EVALUATED (Alpha), got ${summary.notEvaluatedCount}`);
    assert(summary.discrepancyCount >= 1, `Expected at least 1 discrepancy (Conflicting Marker), got ${summary.discrepancyCount}`);

    // Verify individual test evaluations from live API
    const byName = Object.fromEntries(body.tests.map((t) => [t.testName, t]));

    // Potassium (3.1 < 3.5 - 5.1 -> LOW)
    assert(byName['Serum Potassium'].status === 'LOW', `Potassium status should be LOW, got ${byName['Serum Potassium'].status}`);

    // Sodium (140 in 136 - 145 -> NORMAL)
    assert(byName['Serum Sodium'].status === 'NORMAL', `Sodium status should be NORMAL, got ${byName['Serum Sodium'].status}`);

    // Glucose (135 > 70 - 99 -> HIGH)
    assert(byName['Glucose, Fasting'].status === 'HIGH', `Glucose status should be HIGH, got ${byName['Glucose, Fasting'].status}`);

    // Hemoglobin (12.0 exact min boundary -> NORMAL)
    assert(byName['Hemoglobin'].status === 'NORMAL', `Hemoglobin status should be NORMAL, got ${byName['Hemoglobin'].status}`);
    assert(byName['Hemoglobin'].boundaryInfo.isBoundary === true, 'Hemoglobin should be flagged as boundary');

    // Cholesterol (200 on < 200 -> HIGH)
    assert(byName['Total Cholesterol'].status === 'HIGH', `Cholesterol status should be HIGH, got ${byName['Total Cholesterol'].status}`);

    // Conflicting Marker (14.0 on 12.0 - 15.5 with flag "H" -> NORMAL with discrepancy)
    assert(byName['Conflicting Marker'].status === 'NORMAL', 'Conflicting marker status should be NORMAL');
    assert(byName['Conflicting Marker'].flagDiscrepancy.hasDiscrepancy === true, 'Discrepancy should be true');
  });

  // Test 10: Regression tests for upload, health, extraction, and temp file cleanup
  await runTest('10. Regression tests for upload, health, extraction, and temp file cleanup', async () => {
    // 10a. Health endpoint
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200 && health.status === 'ok', 'Health check regression failed');

    // 10b. Temp folder cleanup verification
    const lingeringFiles = fs.readdirSync(UPLOAD_TMP_DIR);
    assert(
      lingeringFiles.length === 0,
      `Expected 0 leftover files in ${UPLOAD_TMP_DIR}, found: ${lingeringFiles.join(', ')}`
    );
  });

  console.log('\n================================================================');
  console.log(' Phase 4 Reference-Range Evaluation Test Summary');
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
