import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isAdaptionConfigured,
  estimateInventDataset,
  inventDataset,
  getDatasetStatus,
  downloadDataset,
} from '../src/services/adaptionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../data/adaption_benchmark');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n======================================================');
  console.log(' HealthLens AI — Adaption Labs Dataset Generator');
  console.log('======================================================\n');

  if (!isAdaptionConfigured()) {
    console.warn('[NOTICE] ADAPTION_API_KEY is not configured in backend/.env.');
    console.log('\nHow to configure your live Adaption Labs API Key:');
    console.log('  1. Sign in to Adaption Labs: https://adaptionlabs.ai/app/auth');
    console.log('  2. Create an API key under:  https://adaptionlabs.ai/app/settings?tab=api_keys');
    console.log('  3. Add the key to backend/.env:');
    console.log('       ADAPTION_API_KEY=pt_live_your_actual_key_here');
    console.log('\nHealthLens AI is currently running with the bundled synthetic fallback dataset');
    console.log(`Path: ${path.join(OUTPUT_DIR, 'benchmark_cases.json')}\n`);
    return;
  }

  const prompt =
    'Synthetic laboratory blood test report line items formatted with test name, observed numerical value, unit, and reference range, covering normal ranges, out-of-range values, missing ranges, and qualitative results for evaluating medical report parsers.';

  try {
    // 1. Estimate credits first
    console.log('[1/4] Estimating credit cost with Adaption Labs...');
    const estimate = await estimateInventDataset({
      prompt,
      rows: 25,
      domains: ['medical'],
      subdomains: ['medical.symptoms_diagnosis'],
    });

    console.log(`  Estimated credits required: ${estimate.estimated_credits}`);
    console.log(`  Available account credits:  ${estimate.available_credits}`);

    if (estimate.available_credits !== undefined && estimate.available_credits < estimate.estimated_credits) {
      console.error(
        `[ABORT] Insufficient credits. Account has ${estimate.available_credits}, but ${estimate.estimated_credits} are required.`
      );
      process.exit(1);
    }

    // 2. Launch Dataset Generation
    console.log('\n[2/4] Triggering dataset invention job on Adaption Labs (25 rows)...');
    const job = await inventDataset({
      name: `HealthLens-Benchmark-${Date.now()}`,
      prompt,
      rows: 25,
      domains: ['medical'],
      subdomains: ['medical.symptoms_diagnosis'],
      trainingType: 'instruction_dataset',
    });

    console.log(`  Job started successfully. Dataset ID: ${job.id}`);
    console.log(`  Initial status: ${job.status}`);

    // 3. Poll for Completion
    console.log('\n[3/4] Polling for generation completion...');
    let status = job.status;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (status !== 'succeeded' && status !== 'failed' && attempts < maxAttempts) {
      attempts++;
      await sleep(5000);
      const current = await getDatasetStatus(job.id);
      status = current.status;
      process.stdout.write(`  Attempt ${attempts}: status is "${status}"\r`);
      if (status === 'succeeded' || status === 'failed') break;
    }

    console.log(`\n  Final Status: ${status}`);
    if (status !== 'succeeded') {
      throw new Error(`Adaption dataset generation job ended with status: ${status}`);
    }

    // 4. Download and Save
    console.log('\n[4/4] Downloading generated dataset rows...');
    const rows = await downloadDataset(job.id);

    const liveFile = path.join(OUTPUT_DIR, 'benchmark_cases_live.json');
    fs.writeFileSync(
      liveFile,
      typeof rows === 'string' ? rows : JSON.stringify(rows, null, 2),
      'utf8'
    );

    console.log(`\n[SUCCESS] Live Adaption Labs dataset saved to: ${liveFile}`);
  } catch (err) {
    console.error(`\n[ERROR] Adaption Labs integration failed:`, err.message);
    if (err.details) {
      console.error('Details:', JSON.stringify(err.details, null, 2));
    }
    process.exit(1);
  }
}

main();
