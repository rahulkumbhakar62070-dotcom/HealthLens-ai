import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// 1. Genuine minimal valid PDF
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

// 2. Sample PNG image
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89
]);
fs.writeFileSync(path.join(FIXTURES_DIR, 'sample_image.png'), pngHeader);

// 3. Fake renamed text file with .pdf extension
fs.writeFileSync(
  path.join(FIXTURES_DIR, 'fake_renamed.pdf'),
  'Hello world, this is a plain text file pretending to be a medical report PDF.'
);

// 4. Empty file (0 bytes)
fs.writeFileSync(path.join(FIXTURES_DIR, 'empty.pdf'), Buffer.alloc(0));

// 5. Large PDF exceeding 5 MB (5.2 MB)
const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024);
// Add PDF header to large buffer so it passes signature but fails size limit
Buffer.from('%PDF-1.4\n').copy(largeBuffer, 0);
fs.writeFileSync(path.join(FIXTURES_DIR, 'large_report.pdf'), largeBuffer);

console.log('Test fixtures created successfully in:', FIXTURES_DIR);
