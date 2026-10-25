import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAdaptionConfigured, inventDataset, AdaptionConfigurationError } from '../src/services/adaptionService.js';
import { evaluateRange, EVAL_STATUS } from '../src/services/evaluatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARK_FILE = path.resolve(__dirname, '../data/adaption_benchmark/benchmark_cases.json');

const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    testResults.push({ name, status: 'PASS' });
    console.log(`✓ [PASS] ${name}`);
  } catch (err) {
    testResults.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ [FAIL] ${name}: ${err.message}`);
  }
}

async function main() {
  console.log('\n--- HealthLens AI: Adaption Labs Scaffolding & Benchmark Suite ---\n');

  // Test 1: Configuration Validation
  await runTest('1. Configuration Validation: isAdaptionConfigured() reflects environment state', async () => {
    const isConfigured = isAdaptionConfigured();
    // Since ADAPTION_API_KEY is currently empty/unset
    assert(typeof isConfigured === 'boolean', 'Expected boolean return value');
    console.log(`     -> Live Adaption API configured: ${isConfigured}`);
  });

  // Test 2: Safe Rejection without Credentials
  await runTest('2. Error Guard: Calling Adaption API without key throws AdaptionConfigurationError', async () => {
    if (!isAdaptionConfigured()) {
      let threw = false;
      try {
        await inventDataset({ prompt: 'Test Prompt', rows: 5 });
      } catch (err) {
        threw = true;
        assert(
          err instanceof AdaptionConfigurationError,
          `Expected AdaptionConfigurationError, got ${err.name}`
        );
        assert(
          err.message.includes('ADAPTION_API_KEY is missing'),
          `Expected missing key message: ${err.message}`
        );
      }
      assert(threw, 'Expected inventDataset to throw when unconfigured');
    } else {
      console.log('     -> Skipped: Key is already configured in environment.');
    }
  });

  // Test 3: Fallback Dataset Integrity
  await runTest('3. Fallback Dataset Integrity: benchmark_cases.json format and provenance', async () => {
    assert(fs.existsSync(BENCHMARK_FILE), `Benchmark file does not exist at ${BENCHMARK_FILE}`);
    const raw = fs.readFileSync(BENCHMARK_FILE, 'utf8');
    const data = JSON.parse(raw);

    assert(data._provenance, 'Expected _provenance metadata in benchmark dataset');
    assert(data._provenance.is_synthetic === true, 'Dataset must be flagged as synthetic');
    assert(data._provenance.disclaimer.includes('SYNTHETIC TEST DATA ONLY'), 'Must include ethical medical disclaimer');
    assert(Array.isArray(data.cases) && data.cases.length >= 10, 'Must have at least 10 benchmark test cases');
  });

  // Test 4: Deterministic Evaluator Testing Against Benchmark Cases
  const rawData = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf8'));
  const cases = rawData.cases;

  console.log(`\n--- Evaluating ${cases.length} Synthetic Lab Cases Against HealthLens Engine ---\n`);

  let evalPassed = 0;
  for (const c of cases) {
    await runTest(`Case ${c.id}: ${c.test_name} (${c.category})`, async () => {
      const result = evaluateRange(c.observed_value, c.reference_range);
      assert(
        result.status === c.expected_status || result.legacyStatus === c.expected_status,
        `Expected status "${c.expected_status}", got "${result.status}" for observed=${c.observed_value}, range=${c.reference_range}`
      );

      if (c.expected_reason) {
        assert(
          result.reason === c.expected_reason,
          `Expected reason "${c.expected_reason}", got "${result.reason}"`
        );
      }
      evalPassed++;
    });
  }

  console.log('\n======================================================');
  console.log(' Benchmark Summary');
  console.log('======================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;

  console.log(`Total Unit/Benchmark Checks: ${total}`);
  console.log(`Passed:                      ${passed}`);
  console.log(`Failed:                      ${failed}`);
  console.log(`Deterministic Accuracy:      ${((evalPassed / cases.length) * 100).toFixed(1)}% (${evalPassed}/${cases.length})`);
  console.log(`Live API Status:             ${isAdaptionConfigured() ? 'READY (Key configured)' : 'BLOCKED (Pending ADAPTION_API_KEY; Fallback Active)'}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
