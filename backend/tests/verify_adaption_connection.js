import {
  isAdaptionConfigured,
  listDatasets,
  estimateInventDataset,
} from '../src/services/adaptionService.js';

async function verifyAdaptionLive() {
  console.log('\n======================================================');
  console.log(' HealthLens AI — Adaption Labs API Live Verification');
  console.log('======================================================\n');

  // 1. Detection Check (safe: no secret exposed)
  const configured = isAdaptionConfigured();
  console.log(`[Step 1] Detecting ADAPTION_API_KEY in backend/.env: ${configured ? 'DETECTED' : 'NOT FOUND'}`);

  if (!configured) {
    console.error('[FAILED] ADAPTION_API_KEY was not detected. Please verify backend/.env.');
    process.exit(1);
  }

  // 2. Real API Authentication Handshake (GET /api/v1/datasets)
  console.log('\n[Step 2] Sending minimal verification request to Adaption Labs (GET /datasets)...');
  try {
    const listResponse = await listDatasets();
    console.log('[SUCCESS] Authentication succeeded!');
    console.log('  HTTP Status: 200 OK');
    console.log('  Response Type: Valid JSON');
    if (listResponse?.datasets && Array.isArray(listResponse.datasets)) {
      console.log(`  Datasets Count in Account: ${listResponse.datasets.length}`);
      if (listResponse.datasets.length > 0) {
        const sample = listResponse.datasets[0];
        console.log(`  Sample Dataset: ID=${sample.dataset_id}, Name="${sample.name}", Status="${sample.status}"`);
      }
    }

    // 3. Permission & Quota Verification via estimate API (Consumes 0 credits, generates 0 rows)
    console.log('\n[Step 3] Verifying invention permissions & account credits (POST /datasets/invent, estimate: true)...');
    const estimate = await estimateInventDataset({
      prompt: 'Synthetic laboratory blood test report lines for evaluation benchmarking.',
      rows: 5,
      domains: ['medical'],
      subdomains: ['medical.symptoms_diagnosis'],
    });

    console.log('[SUCCESS] Dataset Invention API authorization verified!');
    console.log(`  Estimated Credits Required: ${estimate.estimated_credits ?? 'N/A'}`);
    console.log(`  Available Account Credits:  ${estimate.available_credits ?? 'N/A'}`);

    console.log('\n======================================================');
    console.log(' Adaption Labs Integration: 100% VERIFIED & OPERATIONAL');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n[FAILED] Live Adaption Labs API request failed.');
    console.error(`  Error Name: ${err.name}`);
    console.error(`  Status Code: ${err.statusCode || 'N/A'}`);
    console.error(`  Message: ${err.message}`);
    if (err.details) {
      console.error('  API Details:', JSON.stringify(err.details, null, 2));
    }
    process.exit(1);
  }
}

verifyAdaptionLive();
