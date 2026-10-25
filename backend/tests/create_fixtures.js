import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

/**
 * Helper to construct a synthetic valid PDF with specified text lines.
 */
function createSyntheticPdf(lines) {
  const escaped = lines.map((l) =>
    l.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
  );

  const textCommands = [
    'BT',
    '/F1 10 Tf',
    `50 750 Td (${escaped[0] || ''}) Tj`,
    ...escaped.slice(1).map((l) => `0 -20 Td (${l}) Tj`),
    'ET',
  ];

  const content = textCommands.join('\n');
  const streamLen = Buffer.byteLength(content, 'utf8');

  return [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${streamLen} >>`,
    'stream',
    content,
    'endstream',
    'endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000206 00000 n ',
    'trailer << /Size 5 /Root 1 0 R >>',
    'startxref',
    '450',
    '%%EOF',
  ].join('\n');
}

// 1. Genuine minimal valid PDF (Phase 2 backward compatibility)
const validPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 53 >>
stream
BT
/F1 12 Tf
72 712 Td
(HealthLens AI Medical Test Report) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
310
%%EOF`;

fs.writeFileSync(path.join(FIXTURES_DIR, 'valid_report.pdf'), validPdfContent);

// 2. Sample PNG image (Phase 2)
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'sample_image.png'), pngHeader);

// 3. Fake renamed text file with .pdf extension (Phase 2)
fs.writeFileSync(
  path.join(FIXTURES_DIR, 'fake_renamed.pdf'),
  'Hello world, this is a plain text file pretending to be a medical report PDF.'
);

// 4. Empty file (0 bytes) (Phase 2 & 3)
fs.writeFileSync(path.join(FIXTURES_DIR, 'empty.pdf'), Buffer.alloc(0));

// 5. Large PDF exceeding 5 MB (5.2 MB) (Phase 2)
const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024);
Buffer.from('%PDF-1.4\n').copy(largeBuffer, 0);
fs.writeFileSync(path.join(FIXTURES_DIR, 'large_report.pdf'), largeBuffer);

// --- Phase 3 New Fixtures ---

// 6. Valid text-based medical report with single test (Phase 3 Requirement D1)
const singleTestPdf = createSyntheticPdf([
  'CLINICAL LABORATORY SERVICES',
  'Patient: John Doe    Age: 45',
  'Test Name Result Unit Reference Range',
  'Hemoglobin 14.2 g/dL 12.0 - 15.5',
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'valid_medical_single.pdf'), singleTestPdf);

// 7. Multi-test report with 7 medical tests (Phase 3 Requirement D2)
const multiTestPdf = createSyntheticPdf([
  'COMPLETE BLOOD COUNT AND METABOLIC PANEL',
  'Collection Date: 2026-10-24',
  'Test Name Result Unit Reference Interval Flag',
  'Hemoglobin 14.2 g/dL 12.0 - 15.5',
  'WBC 7.5 10^3/uL 4.5 - 11.0',
  'Platelet Count 250 10^3/uL 150 - 450',
  'Glucose, Fasting 126 mg/dL 70 - 99 H',
  'Total Cholesterol 210 mg/dL < 200 HIGH',
  'HbA1c 6.8 % 4.0 - 5.6 *',
  'Vitamin D, 25-OH 22.4 ng/mL 30.0 - 100.0 LOW',
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'multi_test_report.pdf'), multiTestPdf);

// 8. Report with missing reference ranges (Phase 3 Requirement D3)
const missingRangePdf = createSyntheticPdf([
  'SPECIALIZED RESEARCH ASSAYS',
  'Experimental Biomarker Alpha 45.0 ng/mL',
  'Novel Cytokine Beta 12.8 pg/mL',
  'Hemoglobin 14.2 g/dL 12.0 - 15.5',
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'missing_ranges_report.pdf'), missingRangePdf);

// 9. Report with unusual formatting, tabs, and pipes (Phase 3 Requirement D4)
const unusualFormattingPdf = createSyntheticPdf([
  'DIAGNOSTIC PATHOLOGY REPORT',
  'Hemoglobin | 14.2 | g/dL | 12.0 - 15.5',
  'Glucose, Fasting | 126 | mg/dL | 70 - 99 | H',
  'Total Cholesterol   210   mg/dL   < 200   HIGH',
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'unusual_formatting_report.pdf'), unusualFormattingPdf);

// 10. Image-only / Scanned PDF with 0 extractable digital text (Phase 3 Requirement D5)
const scannedPdf = [
  '%PDF-1.4',
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
  '4 0 obj << /Length 0 >>',
  'stream',
  'endstream',
  'endobj',
  'xref',
  '0 5',
  '0000000000 65535 f ',
  '0000000009 00000 n ',
  '0000000058 00000 n ',
  '0000000115 00000 n ',
  '0000000206 00000 n ',
  'trailer << /Size 5 /Root 1 0 R >>',
  'startxref',
  '300',
  '%%EOF',
].join('\n');
fs.writeFileSync(path.join(FIXTURES_DIR, 'scanned_image_only.pdf'), scannedPdf);

// 11. Malformed / Corrupt PDF (Phase 3 Requirement D6)
const corruptPdf = '%PDF-1.4\n1 0 obj << Corrupted xref table and garbage bytes %$@!#?';
fs.writeFileSync(path.join(FIXTURES_DIR, 'corrupt_malformed.pdf'), corruptPdf);

// 12. Valid text PDF without recognizable medical test data (Phase 3 Requirement D7)
const nonMedicalPdf = createSyntheticPdf([
  'A BRIEF ESSAY ON DIGITAL PHOTOGRAPHY',
  'Modern digital cameras use CMOS sensors to capture light.',
  'Shutter speed and aperture determine the depth of field.',
  'Lenses refract light onto the sensor plane to record pixels.',
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'non_medical_doc.pdf'), nonMedicalPdf);

console.log('Test fixtures created successfully in:', FIXTURES_DIR);
