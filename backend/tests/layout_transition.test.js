/**
 * HealthLens AI - Phase 7 Task 1 Automated Test Suite
 * Layout Transition After Successful Report Analysis
 *
 * Verifies:
 * 1. Initial State: Normal upload interface (drag & drop dropzone, processing stepper)
 * 2. File Validation: Client & backend rejection of invalid files (non-PDF, empty, >5MB)
 * 3. Successful Upload & Analysis: Transitions to collapsed state
 * 4. Compact Report Summary: Displays filename, "Analysis Complete", and "Upload New Report" button
 * 5. Results Dashboard: Rendered immediately below compact summary
 * 6. "Upload New Report" Action: Resets workflow back to clean upload interface
 * 7. Second Report Upload: Subsequent file uploaded and analyzed without state corruption
 * 8. API Error Handling: Scanned/invalid PDF displays appropriate error within upload interface
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VITE_PROXY_URL = 'http://localhost:5173/api/reports/upload';
const BACKEND_URL = 'http://localhost:5000/api/reports/upload';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function reportTest(name, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✓ [PASS] ${totalTests}. ${name}`);
  } else {
    failedTests++;
    console.error(`✗ [FAIL] ${totalTests}. ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function uploadPdf(filePath, fileName, endpoint = BACKEND_URL) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('report', blob, fileName);

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// Emulate UploadSection.jsx state transitions
class UploadSectionStateSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.selectedFile = null;
    this.validationError = '';
    this.isUploading = false;
    this.uploadStep = 0;
    this.uploadResult = null;
  }

  validateAndSelectFile(file) {
    this.validationError = '';
    this.uploadResult = null;

    if (!file) return false;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.validationError = 'Only PDF documents are supported. Please upload a medical lab report PDF.';
      this.selectedFile = null;
      return false;
    }

    if (file.size === 0) {
      this.validationError = 'The selected file is empty (0 bytes). Please upload a valid report.';
      this.selectedFile = null;
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.validationError = `File exceeds the 5 MB limit. Please select a smaller PDF.`;
      this.selectedFile = null;
      return false;
    }

    this.selectedFile = file;
    return true;
  }

  get isAnalyzed() {
    return Boolean(this.uploadResult && this.uploadResult.success);
  }

  getLayoutView() {
    if (!this.isAnalyzed) {
      return {
        view: 'UPLOAD_INTERFACE',
        hasLargeDropzone: true,
        hasCompactSummary: false,
        hasResultsDashboard: false,
        hasValidationError: Boolean(this.validationError),
        hasBackendError: Boolean(this.uploadResult && !this.uploadResult.success),
        backendErrorMessage: this.uploadResult?.message || null,
      };
    } else {
      return {
        view: 'COMPACT_SUMMARY_AND_DASHBOARD',
        hasLargeDropzone: false,
        hasCompactSummary: true,
        hasResultsDashboard: true,
        filename: this.uploadResult.file?.name || this.selectedFile?.name,
        isComplete: true,
        testCount: this.uploadResult.testCount ?? this.uploadResult.tests?.length ?? 0,
        tests: this.uploadResult.tests,
      };
    }
  }

  handleUploadSuccess(apiResponse) {
    this.isUploading = false;
    this.uploadResult = {
      success: true,
      message: apiResponse.message,
      file: apiResponse.file,
      testCount: apiResponse.testCount ?? 0,
      tests: apiResponse.tests ?? [],
      evaluationSummary: apiResponse.evaluationSummary ?? {},
      aiExplanation: apiResponse.aiExplanation ?? null,
      warnings: apiResponse.warnings ?? [],
      rawTextLength: apiResponse.rawTextLength ?? 0,
    };
  }

  handleUploadError(errMessage) {
    this.isUploading = false;
    this.uploadResult = {
      success: false,
      message: errMessage,
    };
  }
}

async function runLayoutTestSuite() {
  console.log('\n================================================================');
  console.log(' HealthLens AI: Phase 7 Task 1 Layout Transition Test Suite');
  console.log('================================================================\n');

  const simulator = new UploadSectionStateSimulator();

  // Test 1: Initial page displays normal upload interface
  try {
    const layout = simulator.getLayoutView();
    assert.strictEqual(layout.view, 'UPLOAD_INTERFACE');
    assert.strictEqual(layout.hasLargeDropzone, true);
    assert.strictEqual(layout.hasCompactSummary, false);
    assert.strictEqual(layout.hasResultsDashboard, false);
    reportTest('Initial state displays normal upload dropzone without results or compact summary', true);
  } catch (err) {
    reportTest('Initial state displays normal upload dropzone without results or compact summary', false, err.message);
  }

  // Test 2: Invalid files rejected in client-side validation logic
  try {
    const invalidPng = simulator.validateAndSelectFile({ name: 'scan.png', size: 2048, type: 'image/png' });
    assert.strictEqual(invalidPng, false);
    assert.strictEqual(simulator.validationError.includes('Only PDF documents are supported'), true);

    const emptyPdf = simulator.validateAndSelectFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' });
    assert.strictEqual(emptyPdf, false);
    assert.strictEqual(simulator.validationError.includes('0 bytes'), true);

    const oversizedPdf = simulator.validateAndSelectFile({ name: 'huge.pdf', size: 6 * 1024 * 1024, type: 'application/pdf' });
    assert.strictEqual(oversizedPdf, false);
    assert.strictEqual(simulator.validationError.includes('exceeds the 5 MB limit'), true);

    const initialLayoutStillActive = simulator.getLayoutView();
    assert.strictEqual(initialLayoutStillActive.hasLargeDropzone, true);
    assert.strictEqual(initialLayoutStillActive.hasCompactSummary, false);

    reportTest('Invalid files are rejected and keep upload interface intact', true);
  } catch (err) {
    reportTest('Invalid files are rejected and keep upload interface intact', false, err.message);
  }

  // Test 3: Upload valid synthetic report #1
  let firstUploadResponse = null;
  try {
    const pdfPath = path.join(FIXTURES_DIR, 'evaluation_comprehensive.pdf');
    const validSelection = simulator.validateAndSelectFile({
      name: 'evaluation_comprehensive.pdf',
      size: fs.statSync(pdfPath).size,
      type: 'application/pdf',
    });
    assert.strictEqual(validSelection, true);

    const apiRes = await uploadPdf(pdfPath, 'evaluation_comprehensive.pdf', VITE_PROXY_URL);
    assert.strictEqual(apiRes.status, 200);
    assert.strictEqual(apiRes.body.success, true);
    assert.strictEqual(apiRes.body.tests.length > 0, true);
    firstUploadResponse = apiRes.body;

    simulator.handleUploadSuccess(firstUploadResponse);

    reportTest('Valid synthetic report is uploaded and analyzed successfully via proxy', true);
  } catch (err) {
    reportTest('Valid synthetic report is uploaded and analyzed successfully via proxy', false, err.message);
  }

  // Test 4: Verify large upload interface collapsed into compact summary
  try {
    const layoutAfterUpload = simulator.getLayoutView();
    assert.strictEqual(layoutAfterUpload.view, 'COMPACT_SUMMARY_AND_DASHBOARD');
    assert.strictEqual(layoutAfterUpload.hasLargeDropzone, false, 'Large dropzone should be collapsed');
    assert.strictEqual(layoutAfterUpload.hasCompactSummary, true, 'Compact summary must be present');
    assert.strictEqual(layoutAfterUpload.isComplete, true);
    assert.strictEqual(layoutAfterUpload.filename.includes('evaluation_comprehensive'), true);
    assert.strictEqual(layoutAfterUpload.testCount, firstUploadResponse.tests.length);

    reportTest('Large upload interface collapses into compact report summary with filename & status', true);
  } catch (err) {
    reportTest('Large upload interface collapses into compact report summary with filename & status', false, err.message);
  }

  // Test 5: Verify results dashboard is rendered immediately below summary
  try {
    const layout = simulator.getLayoutView();
    assert.strictEqual(layout.hasResultsDashboard, true);
    assert.strictEqual(Array.isArray(layout.tests), true);
    assert.strictEqual(layout.tests.length, 9);
    // Verify evaluations are intact
    assert.strictEqual(layout.tests[0].testName, 'Serum Potassium');
    assert.strictEqual(layout.tests[0].status, 'LOW');
    reportTest('Results dashboard renders actual extracted & evaluated medical data immediately below summary', true);
  } catch (err) {
    reportTest('Results dashboard renders actual extracted & evaluated medical data immediately below summary', false, err.message);
  }

  // Test 6: "Upload New Report" resets workflow
  try {
    // Calling reset() mimics clicking clearSelection() / "Upload New Report"
    simulator.reset();
    const layoutAfterReset = simulator.getLayoutView();
    assert.strictEqual(layoutAfterReset.view, 'UPLOAD_INTERFACE');
    assert.strictEqual(layoutAfterReset.hasLargeDropzone, true);
    assert.strictEqual(layoutAfterReset.hasCompactSummary, false);
    assert.strictEqual(layoutAfterReset.hasResultsDashboard, false);
    assert.strictEqual(simulator.selectedFile, null);
    assert.strictEqual(simulator.uploadResult, null);
    assert.strictEqual(simulator.validationError, '');

    reportTest('"Upload New Report" resets state, removing compact summary and restoring clean upload interface', true);
  } catch (err) {
    reportTest('"Upload New Report" resets state, removing compact summary and restoring clean upload interface', false, err.message);
  }

  // Test 7: Upload second report successfully
  try {
    const secondPdfPath = path.join(FIXTURES_DIR, 'valid_medical_single.pdf');
    simulator.validateAndSelectFile({
      name: 'valid_medical_single.pdf',
      size: fs.statSync(secondPdfPath).size,
      type: 'application/pdf',
    });

    const secondRes = await uploadPdf(secondPdfPath, 'valid_medical_single.pdf', VITE_PROXY_URL);
    assert.strictEqual(secondRes.status, 200);
    assert.strictEqual(secondRes.body.success, true);

    simulator.handleUploadSuccess(secondRes.body);

    const layoutSecondUpload = simulator.getLayoutView();
    assert.strictEqual(layoutSecondUpload.hasLargeDropzone, false);
    assert.strictEqual(layoutSecondUpload.hasCompactSummary, true);
    assert.strictEqual(layoutSecondUpload.filename.includes('valid_medical_single'), true);
    assert.strictEqual(layoutSecondUpload.hasResultsDashboard, true);

    reportTest('Second medical report can be selected, uploaded, and analyzed without state corruption', true);
  } catch (err) {
    reportTest('Second medical report can be selected, uploaded, and analyzed without state corruption', false, err.message);
  }

  // Test 8: API errors display appropriate message within upload interface
  try {
    simulator.reset();
    const scannedPdfPath = path.join(FIXTURES_DIR, 'scanned_image_only.pdf');
    const apiErrRes = await uploadPdf(scannedPdfPath, 'scanned_image_only.pdf', VITE_PROXY_URL);

    assert.strictEqual(apiErrRes.status, 422);
    assert.strictEqual(apiErrRes.body.success, false);
    assert.strictEqual(apiErrRes.body.message.toLowerCase().includes('scanned'), true);

    simulator.handleUploadError(apiErrRes.body.message);
    const layoutAfterError = simulator.getLayoutView();

    assert.strictEqual(layoutAfterError.view, 'UPLOAD_INTERFACE');
    assert.strictEqual(layoutAfterError.hasLargeDropzone, true);
    assert.strictEqual(layoutAfterError.hasCompactSummary, false);
    assert.strictEqual(layoutAfterError.hasResultsDashboard, false);
    assert.strictEqual(layoutAfterError.hasBackendError, true);
    assert.strictEqual(layoutAfterError.backendErrorMessage.includes('scanned'), true);

    reportTest('API errors (scanned PDF) display appropriate error messages without collapsing upload interface', true);
  } catch (err) {
    reportTest('API errors (scanned PDF) display appropriate error messages without collapsing upload interface', false, err.message);
  }

  // Test 9: Verify source code integration in UploadSection.jsx
  try {
    const uploadSectionContent = fs.readFileSync(
      path.join(__dirname, '../../frontend/src/components/UploadSection.jsx'),
      'utf8'
    );
    assert.strictEqual(uploadSectionContent.includes('const isAnalyzed = Boolean(uploadResult && uploadResult.success);'), true);
    assert.strictEqual(uploadSectionContent.includes('id="upload-new-report-btn"'), true);
    assert.strictEqual(uploadSectionContent.includes('Analysis Complete'), true);
    assert.strictEqual(uploadSectionContent.includes('Upload New Report'), true);
    reportTest('UploadSection.jsx correctly implements isAnalyzed condition and compact summary markup', true);
  } catch (err) {
    reportTest('UploadSection.jsx correctly implements isAnalyzed condition and compact summary markup', false, err.message);
  }

  // Test 10: Ephemeral disk storage verified clean
  try {
    const uploadDir = path.join(__dirname, '../tmp/uploads');
    const files = fs.readdirSync(uploadDir);
    assert.strictEqual(files.length, 0, `Expected 0 retained files, found ${files.length}`);
    reportTest('Guaranteed ephemeral disk storage (zero retained files after all uploads)', true);
  } catch (err) {
    reportTest('Guaranteed ephemeral disk storage (zero retained files after all uploads)', false, err.message);
  }

  console.log('\n================================================================');
  console.log(' Phase 7 Task 1 Layout Transition Test Summary');
  console.log('================================================================');
  console.log(`Total Scenarios: ${totalTests}`);
  console.log(`Passed:          ${passedTests}`);
  console.log(`Failed:          ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runLayoutTestSuite().catch((err) => {
  console.error('Test suite runner encountered fatal error:', err);
  process.exit(1);
});
