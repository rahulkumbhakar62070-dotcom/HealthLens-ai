import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadDataset, getDatasetStatus } from '../src/services/adaptionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data/adaption_benchmark');

const DATASET_ID = 'c591c498-495c-45a1-8d72-6355c2624f0a';

/**
 * Robust CSV parser that handles multiline quoted values.
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip CRLF
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function main() {
  console.log('\n--- Inspecting & Saving Adaption Labs Dataset c591c498 ---\n');

  // 1. Check Job Status
  const statusInfo = await getDatasetStatus(DATASET_ID);
  console.log('1. Job Status:', statusInfo.status);
  console.log('   Reported Row Count:', statusInfo.row_count);
  console.log('   Created At:', statusInfo.created_at);
  console.log('   Updated At:', statusInfo.updated_at);

  if (statusInfo.status !== 'succeeded') {
    console.error(`Dataset job is not completed. Current status: ${statusInfo.status}`);
    process.exit(1);
  }

  // 2. Download Content
  console.log('\n2. Downloading dataset from Adaption Labs...');
  const csvRaw = await downloadDataset(DATASET_ID);
  console.log(`   Downloaded ${csvRaw.length} bytes.`);

  // 3. Save Raw CSV
  const csvPath = path.join(DATA_DIR, 'benchmark_cases_live.csv');
  fs.writeFileSync(csvPath, csvRaw, 'utf8');
  console.log('   Saved raw CSV to:', csvPath);

  // 4. Parse CSV Rows & Validate Schema
  const parsedRows = parseCSV(csvRaw);
  const header = parsedRows[0];
  const dataRows = parsedRows.slice(1);

  console.log('\n3. Dataset Schema & Structure:');
  console.log('   Header Columns:', header);
  console.log('   Data Rows Count:', dataRows.length);

  // Validate columns
  const hasExpectedColumns =
    header.includes('enhanced_prompt') && header.includes('enhanced_completion');
  console.log('   Schema Validation (enhanced_prompt, enhanced_completion):', hasExpectedColumns ? 'VALID' : 'INVALID');

  // 5. Inspect Rows and Validate Data Integrity
  const structuredCases = [];
  let emptyPromptCount = 0;
  let emptyCompletionCount = 0;

  dataRows.forEach((row, index) => {
    const prompt = row[0] || '';
    const completion = row[1] || '';

    if (!prompt.trim()) emptyPromptCount++;
    if (!completion.trim()) emptyCompletionCount++;

    structuredCases.push({
      index: index + 1,
      prompt,
      completion,
    });
  });

  console.log('\n4. Data Integrity Check:');
  console.log('   Total Rows Parsed:', structuredCases.length);
  console.log('   Empty Prompt Count:', emptyPromptCount);
  console.log('   Empty Completion Count:', emptyCompletionCount);
  console.log(
    '   Data Integrity Status:',
    emptyPromptCount === 0 && emptyCompletionCount === 0 ? '100% VALID (Zero empty fields)' : 'HAS EMPTY FIELDS'
  );

  // 6. Save Structured JSON for Analysis
  const jsonPath = path.join(DATA_DIR, 'benchmark_cases_live.json');
  const jsonPayload = {
    _provenance: {
      source: 'Adaption Labs API (Adaptive Data invent)',
      dataset_id: DATASET_ID,
      created_at: statusInfo.created_at,
      completed_at: statusInfo.updated_at,
      row_count: structuredCases.length,
      format: 'instruction_dataset (prompt, completion)',
      is_synthetic: true,
      disclaimer: 'SYNTHETIC TEST DATA ONLY. Not real medical reports or clinical facts.',
    },
    cases: structuredCases,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');
  console.log('   Saved structured JSON to:', jsonPath);

  // Preview first 2 cases
  console.log('\n5. Sample Live Cases Preview:');
  console.log('--- Sample Case 1 ---');
  console.log('Prompt Snippet:', structuredCases[0]?.prompt.slice(0, 180), '...');
  console.log('Completion Snippet:', structuredCases[0]?.completion.slice(0, 220), '...');

  console.log('\n--- Sample Case 2 ---');
  console.log('Prompt Snippet:', structuredCases[1]?.prompt.slice(0, 180), '...');
  console.log('Completion Snippet:', structuredCases[1]?.completion.slice(0, 220), '...');
}

main();
