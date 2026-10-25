/**
 * Supported clinical laboratory units commonly found in blood tests,
 * metabolic panels, urinalysis, hormone assays, and lipid profiles.
 */
const CLINICAL_UNITS = [
  'mg/dL',
  'g/dL',
  'mmol/L',
  'umol/L',
  'µmol/L',
  'mEq/L',
  'uIU/mL',
  'µIU/mL',
  'ng/mL',
  'pg/mL',
  'IU/L',
  'U/L',
  '%',
  '10\\^3/uL',
  '10\\^6/uL',
  'K/uL',
  'M/uL',
  'x10\\^3/uL',
  'x10\\^6/uL',
  'cells/uL',
  'cells/mcL',
  'mL/min/1\\.73m2',
  'mL/min',
  'ng/dL',
  'ug/dL',
  'µg/dL',
  'fL',
  'pg',
  'g/L',
  'mg/L',
  'ug/L',
  'µg/L',
  'mm/hr',
  'copies/mL',
  'sec',
  'seconds',
  'min',
  'minutes',
  'mOsm/kg',
];

const UNIT_PATTERN = `(?:${CLINICAL_UNITS.join('|')})`;

/**
 * Standard reference range formats:
 * - Interval: "12.0 - 15.5", "70 - 99", "3.5 to 5.0"
 * - Threshold: "< 200", "> 60", "<= 100", ">= 60", "≤ 150", "≥ 90"
 * - Qualitative: "Negative", "Non-reactive", "Normal", "Not Detected"
 */
const RANGE_PATTERN =
  '(?:(?:(?:<|<=|≤|>|>=|≥)\\s*\\d+(?:\\.\\d+)?)|(?:\\d+(?:\\.\\d+)?\\s*(?:-|–|—|to)\\s*\\d+(?:\\.\\d+)?)|(?:Negative|Non-reactive|Normal|Not Detected))';

/**
 * Explicit printed report flags indicating high/low out-of-range status.
 */
const FLAG_PATTERN = '(?:HIGH|LOW|CRITICAL|ABNORMAL|ALERT|H|L|\\*)';

/**
 * Header and administrative metadata prefixes to skip during extraction.
 */
const IGNORE_HEADER_REGEX =
  /^(?:patient|name|dob|date|sample|specimen|collected|reported|received|doctor|physician|dr\.|hospital|clinic|laboratory|lab\s*no|age|gender|sex|page|report|test\s*name|investigation|analyte|result\s*unit|reference\s*range|reference\s*interval|method|comment|note|interpretation|disclaimer|verified|authorized|end\s*of|[-_=+]{3,})/i;

/**
 * Parses raw text extracted from a medical PDF report into structured lab test items.
 *
 * Requirements:
 * - Extracts test name, value (numeric or textual), unit, reference range, and printed flag.
 * - Represents missing fields explicitly as null (zero fabrication).
 * - Preserves uncertainty and does not classify findings as normal/abnormal in this phase.
 *
 * @param {string} rawText - Unstructured text extracted from the report PDF
 * @returns {{ tests: Array<object>, testCount: number, rawTextLength: number, warnings: string[] }}
 */
export function parseMedicalReportText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { tests: [], testCount: 0, rawTextLength: 0, warnings: ['Empty or invalid text input'] };
  }

  const lines = rawText.split(/\r?\n/);
  const tests = [];
  const warnings = [];

  // 1. Regex for standard tabular row: [Test Name] [Value] [Unit] [Reference Range] [Optional Flag]
  const regexStandard = new RegExp(
    '^([A-Za-z0-9][A-Za-z0-9,()_\\/\\-\\.\\s+]+?)\\s+' +
      '([<>]?\\s*\\d+(?:\\.\\d+)?)\\s+' +
      '(' +
      UNIT_PATTERN +
      ')\\s+' +
      '(' +
      RANGE_PATTERN +
      ')' +
      '(?:\\s+(' +
      FLAG_PATTERN +
      '))?$',
    'i'
  );

  // 2. Regex for numeric test with Unit but missing reference range: [Test Name] [Value] [Unit] [Optional Flag]
  const regexUnitNoRange = new RegExp(
    '^([A-Za-z0-9][A-Za-z0-9,()_\\/\\-\\.\\s+]+?)\\s+' +
      '([<>]?\\s*\\d+(?:\\.\\d+)?)\\s+' +
      '(' +
      UNIT_PATTERN +
      ')' +
      '(?:\\s+(' +
      FLAG_PATTERN +
      '))?$',
    'i'
  );

  // 3. Regex for qualitative / categorical findings: [Test Name] [Textual Result] [Reference Range] [Optional Flag]
  const regexQualitative = new RegExp(
    '^([A-Za-z0-9][A-Za-z0-9,()_\\/\\-\\.\\s+]+?)\\s+' +
      '(Negative|Positive|No growth|Non-reactive|Reactive|Not Detected|Detected|Normal|Clear)\\s+' +
      '(' +
      RANGE_PATTERN +
      ')' +
      '(?:\\s+(' +
      FLAG_PATTERN +
      '))?$',
    'i'
  );

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Skip pagination markers
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(trimmed)) continue;

    // Skip horizontal divider lines
    if (/^(?:[-_=\s*#~]+)$/.test(trimmed)) continue;

    // Skip administrative and patient metadata lines
    if (IGNORE_HEADER_REGEX.test(trimmed)) continue;

    // Skip table column header lines
    if (
      /\b(test|analyte|investigation|parameter)\b/i.test(trimmed) &&
      /\b(result|value|observed)\b/i.test(trimmed)
    ) {
      continue;
    }

    // Normalize formatting: replace pipes and multi-whitespace while preserving internal words
    const normalized = trimmed
      .replace(/[|]/g, ' ')
      .replace(/\t+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Strategy 1: Standard Numeric Row with Unit & Reference Range
    let match = normalized.match(regexStandard);
    if (match) {
      const rawVal = match[2].trim();
      const numVal = Number(rawVal);
      tests.push({
        testName: match[1].trim(),
        value: isNaN(numVal) ? rawVal : numVal,
        unit: match[3].trim(),
        referenceRange: match[4].trim(),
        printedFlag: match[5] ? match[5].trim() : null,
        rawLine: trimmed,
      });
      continue;
    }

    // Strategy 2: Numeric Row with Unit, but MISSING Reference Range
    match = normalized.match(regexUnitNoRange);
    if (match) {
      const rawVal = match[2].trim();
      const numVal = Number(rawVal);
      tests.push({
        testName: match[1].trim(),
        value: isNaN(numVal) ? rawVal : numVal,
        unit: match[3].trim(),
        referenceRange: null, // Explicitly preserve uncertainty
        printedFlag: match[4] ? match[4].trim() : null,
        rawLine: trimmed,
      });
      continue;
    }

    // Strategy 3: Qualitative / Textual finding
    match = normalized.match(regexQualitative);
    if (match) {
      tests.push({
        testName: match[1].trim(),
        value: match[2].trim(),
        unit: null, // Qualitative test has no unit
        referenceRange: match[3].trim(),
        printedFlag: match[4] ? match[4].trim() : null,
        rawLine: trimmed,
      });
      continue;
    }
  }

  if (tests.length === 0) {
    warnings.push(
      'No recognizable medical test data found in the document. Please ensure the document is a supported laboratory test report.'
    );
  }

  return {
    tests,
    testCount: tests.length,
    rawTextLength: rawText.length,
    warnings,
  };
}
