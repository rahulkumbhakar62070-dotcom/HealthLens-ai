/**
 * HealthLens AI - Deterministic Medical Reference-Range Evaluator
 *
 * Compares an observed test value strictly against the reference interval
 * stated directly in the uploaded lab report.
 *
 * Requirements (Phase 4):
 * 1. Evaluates actual test records extracted from uploaded PDF reports.
 * 2. Supports:
 *    - "min - max" (e.g., "12.0 - 15.5", "70 - 99", "3.5 to 5.0")
 *    - "< max", "<= max", "≤ max" (e.g., "< 200")
 *    - "> min", ">= min", "≥ min" (e.g., "> 10")
 *    - Missing or unrecognized ranges (e.g. null, qualitative text, malformed formats)
 * 3. Returns strictly one of:
 *    - "LOW"
 *    - "NORMAL"
 *    - "HIGH"
 *    - "NOT_EVALUATED"
 * 4. Explicitly defines and documents boundary behavior:
 *    - For intervals [min, max]: boundaries are inclusive; min <= val <= max is NORMAL.
 *    - For strict inequalities (< max, > min): boundary equality is NOT normal.
 *      val === max for "< max" evaluates to HIGH; val === min for "> min" evaluates to LOW.
 *    - For inclusive inequalities (<= max, >= min): boundary equality is NORMAL.
 * 5. Returns NOT_EVALUATED with explicit human-readable reasons when range is missing,
 *    qualitative, or unparseable, or when observed value is qualitative or missing.
 * 6. Keeps printed report flags separate from calculated status. Detects and reports
 *    discrepancies explicitly without silently altering either value.
 * 7. Zero fabrication: never invents reference ranges or medical facts.
 */

/**
 * Standard Evaluation Status Enumeration
 */
export const EVAL_STATUS = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  NOT_EVALUATED: 'NOT_EVALUATED',

  // Backward compatibility aliases
  WITHIN_RANGE: 'Within Range',
  BELOW_RANGE: 'Below Range',
  ABOVE_RANGE: 'Above Range',
};

/**
 * Legacy status mapping for backward compatibility with Adaption benchmark cases
 */
const LEGACY_STATUS_MAP = {
  NORMAL: 'Within Range',
  LOW: 'Below Range',
  HIGH: 'Above Range',
  NOT_EVALUATED: 'Not Evaluated',
};

/**
 * Parses numeric reference interval string into structured bounds.
 *
 * @param {string|null} rangeStr
 * @returns {object} Structured range definition
 */
export const parseReferenceRange = (rangeStr) => {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return { type: 'missing', reason: 'No reference range provided in report' };
  }

  const trimmed = rangeStr.trim();
  if (trimmed.length === 0) {
    return { type: 'missing', reason: 'No reference range provided in report' };
  }

  // Check for qualitative text like "Negative", "Non-reactive", "Normal", "Absent"
  const qualitativeKeywords = [
    'negative',
    'positive',
    'non-reactive',
    'reactive',
    'normal',
    'absent',
    'present',
    'not detected',
    'detected',
  ];
  if (
    qualitativeKeywords.some((kw) => trimmed.toLowerCase().includes(kw)) &&
    !/\d/.test(trimmed)
  ) {
    return {
      type: 'qualitative',
      raw: trimmed,
      reason: 'Reference range is qualitative or non-numeric',
    };
  }

  // 1. Inequality: "< X", "<= X", "≤ X"
  const lessThanMatch = trimmed.match(/^<(=|≤)?\s*([0-9.]+)/i);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[2]);
    if (isNaN(max)) {
      return { type: 'invalid', reason: 'Could not parse upper bound number' };
    }
    const isInclusive =
      lessThanMatch[1] === '=' ||
      lessThanMatch[1] === '≤' ||
      trimmed.startsWith('<=') ||
      trimmed.startsWith('≤');
    return { type: 'upper_bound', max, inclusive: isInclusive, raw: trimmed };
  }

  // 2. Inequality: "> X", ">= X", "≥ X"
  const greaterThanMatch = trimmed.match(/^>(=|≥)?\s*([0-9.]+)/i);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[2]);
    if (isNaN(min)) {
      return { type: 'invalid', reason: 'Could not parse lower bound number' };
    }
    const isInclusive =
      greaterThanMatch[1] === '=' ||
      greaterThanMatch[1] === '≥' ||
      trimmed.startsWith('>=') ||
      trimmed.startsWith('≥');
    return { type: 'lower_bound', min, inclusive: isInclusive, raw: trimmed };
  }

  // 3. Two-sided interval: "min - max" or "min to max"
  const intervalMatch = trimmed.match(/^([0-9.]+)\s*(?:-|–|—|to)\s*([0-9.]+)/i);
  if (intervalMatch) {
    const min = parseFloat(intervalMatch[1]);
    const max = parseFloat(intervalMatch[2]);
    if (isNaN(min) || isNaN(max)) {
      return { type: 'invalid', reason: 'Reference range values are not valid numbers' };
    }
    return { type: 'interval', min, max, inclusive: true, raw: trimmed };
  }

  // If there are numbers or text that do not match recognized interval patterns
  return {
    type: 'unrecognized',
    raw: trimmed,
    reason: 'Reference range format is unparseable or unrecognized',
  };
};

/**
 * Checks for conflicts between explicit printed report flags and calculated status.
 *
 * @param {string|null} printedFlag - The flag printed on the laboratory report (e.g. "H", "L", "*")
 * @param {string} calculatedStatus - The status calculated by deterministic range evaluation
 * @returns {{ hasDiscrepancy: boolean, message: string|null }}
 */
export const checkFlagDiscrepancy = (printedFlag, calculatedStatus) => {
  if (!printedFlag || typeof printedFlag !== 'string') {
    return { hasDiscrepancy: false, message: null };
  }

  const cleanFlag = printedFlag.trim().toUpperCase();

  // Flag indicates HIGH ("H", "HIGH", "ALERT")
  if (['H', 'HIGH', 'ALERT'].includes(cleanFlag)) {
    if (calculatedStatus === EVAL_STATUS.NORMAL) {
      return {
        hasDiscrepancy: true,
        message: `Report printed flag "${printedFlag}" indicates HIGH, but calculated status is NORMAL based on the report reference range.`,
      };
    }
    if (calculatedStatus === EVAL_STATUS.LOW) {
      return {
        hasDiscrepancy: true,
        message: `Report printed flag "${printedFlag}" indicates HIGH, but calculated status is LOW based on the report reference range.`,
      };
    }
  }

  // Flag indicates LOW ("L", "LOW")
  if (['L', 'LOW'].includes(cleanFlag)) {
    if (calculatedStatus === EVAL_STATUS.NORMAL) {
      return {
        hasDiscrepancy: true,
        message: `Report printed flag "${printedFlag}" indicates LOW, but calculated status is NORMAL based on the report reference range.`,
      };
    }
    if (calculatedStatus === EVAL_STATUS.HIGH) {
      return {
        hasDiscrepancy: true,
        message: `Report printed flag "${printedFlag}" indicates LOW, but calculated status is HIGH based on the report reference range.`,
      };
    }
  }

  // Flag indicates general out-of-range ("*", "ABNORMAL", "CRITICAL")
  if (['*', 'ABNORMAL', 'CRITICAL'].includes(cleanFlag)) {
    if (calculatedStatus === EVAL_STATUS.NORMAL) {
      return {
        hasDiscrepancy: true,
        message: `Report printed flag "${printedFlag}" indicates an out-of-range result, but calculated status is NORMAL based on the report reference range.`,
      };
    }
  }

  return { hasDiscrepancy: false, message: null };
};

/**
 * Evaluates an observed test value against a reference range string.
 *
 * @param {number|string|null} observedValue - The observed lab test value
 * @param {string|null} referenceRangeStr - The reference range string from the report
 * @returns {{
 *   status: string,
 *   legacyStatus: string,
 *   reason?: string,
 *   observed: number|null,
 *   boundaryInfo: { isBoundary: boolean, boundaryType: string|null, inclusive: boolean, note?: string }
 * }}
 */
export const evaluateRange = (observedValue, referenceRangeStr) => {
  // Check observed value
  if (observedValue === null || observedValue === undefined || observedValue === '') {
    return {
      status: EVAL_STATUS.NOT_EVALUATED,
      legacyStatus: LEGACY_STATUS_MAP.NOT_EVALUATED,
      reason: 'Observed test value is missing or unparseable',
      observed: null,
      boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
    };
  }

  const numValue =
    typeof observedValue === 'number'
      ? observedValue
      : parseFloat(String(observedValue).trim());

  if (isNaN(numValue)) {
    return {
      status: EVAL_STATUS.NOT_EVALUATED,
      legacyStatus: LEGACY_STATUS_MAP.NOT_EVALUATED,
      reason: 'Observed value is qualitative or non-numeric',
      observed: observedValue,
      boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
    };
  }

  // Parse reference range
  const parsedRange = parseReferenceRange(referenceRangeStr);

  switch (parsedRange.type) {
    case 'missing':
    case 'qualitative':
    case 'invalid':
    case 'unrecognized':
      return {
        status: EVAL_STATUS.NOT_EVALUATED,
        legacyStatus: LEGACY_STATUS_MAP.NOT_EVALUATED,
        reason: parsedRange.reason,
        observed: numValue,
        boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
      };

    case 'interval': {
      // Standard clinical interval convention: [min, max] inclusive
      if (numValue < parsedRange.min) {
        return {
          status: EVAL_STATUS.LOW,
          legacyStatus: LEGACY_STATUS_MAP.LOW,
          observed: numValue,
          min: parsedRange.min,
          max: parsedRange.max,
          boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: true },
        };
      }
      if (numValue > parsedRange.max) {
        return {
          status: EVAL_STATUS.HIGH,
          legacyStatus: LEGACY_STATUS_MAP.HIGH,
          observed: numValue,
          min: parsedRange.min,
          max: parsedRange.max,
          boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: true },
        };
      }

      // Within [min, max]
      const isMinBoundary = numValue === parsedRange.min;
      const isMaxBoundary = numValue === parsedRange.max;
      return {
        status: EVAL_STATUS.NORMAL,
        legacyStatus: LEGACY_STATUS_MAP.NORMAL,
        observed: numValue,
        min: parsedRange.min,
        max: parsedRange.max,
        boundaryInfo: {
          isBoundary: isMinBoundary || isMaxBoundary,
          boundaryType: isMinBoundary ? 'min' : isMaxBoundary ? 'max' : null,
          inclusive: true,
          note: isMinBoundary
            ? 'Value equals established lower interval boundary (min)'
            : isMaxBoundary
            ? 'Value equals established upper interval boundary (max)'
            : undefined,
        },
      };
    }

    case 'upper_bound': {
      if (parsedRange.inclusive) {
        // "<= max" or "≤ max"
        if (numValue <= parsedRange.max) {
          const isMaxBoundary = numValue === parsedRange.max;
          return {
            status: EVAL_STATUS.NORMAL,
            legacyStatus: LEGACY_STATUS_MAP.NORMAL,
            observed: numValue,
            max: parsedRange.max,
            boundaryInfo: {
              isBoundary: isMaxBoundary,
              boundaryType: isMaxBoundary ? 'max' : null,
              inclusive: true,
            },
          };
        }
        return {
          status: EVAL_STATUS.HIGH,
          legacyStatus: LEGACY_STATUS_MAP.HIGH,
          observed: numValue,
          max: parsedRange.max,
          boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: true },
        };
      } else {
        // Strict "< max" (e.g. "< 200")
        if (numValue < parsedRange.max) {
          return {
            status: EVAL_STATUS.NORMAL,
            legacyStatus: LEGACY_STATUS_MAP.NORMAL,
            observed: numValue,
            max: parsedRange.max,
            boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
          };
        }
        // numValue >= max
        const isMaxBoundary = numValue === parsedRange.max;
        return {
          status: EVAL_STATUS.HIGH,
          legacyStatus: LEGACY_STATUS_MAP.HIGH,
          observed: numValue,
          max: parsedRange.max,
          boundaryInfo: {
            isBoundary: isMaxBoundary,
            boundaryType: isMaxBoundary ? 'max' : null,
            inclusive: false,
            note: isMaxBoundary
              ? 'Value is exactly equal to strict upper limit (< max)'
              : undefined,
          },
        };
      }
    }

    case 'lower_bound': {
      if (parsedRange.inclusive) {
        // ">= min" or "≥ min"
        if (numValue >= parsedRange.min) {
          const isMinBoundary = numValue === parsedRange.min;
          return {
            status: EVAL_STATUS.NORMAL,
            legacyStatus: LEGACY_STATUS_MAP.NORMAL,
            observed: numValue,
            min: parsedRange.min,
            boundaryInfo: {
              isBoundary: isMinBoundary,
              boundaryType: isMinBoundary ? 'min' : null,
              inclusive: true,
            },
          };
        }
        return {
          status: EVAL_STATUS.LOW,
          legacyStatus: LEGACY_STATUS_MAP.LOW,
          observed: numValue,
          min: parsedRange.min,
          boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: true },
        };
      } else {
        // Strict "> min" (e.g. "> 10")
        if (numValue > parsedRange.min) {
          return {
            status: EVAL_STATUS.NORMAL,
            legacyStatus: LEGACY_STATUS_MAP.NORMAL,
            observed: numValue,
            min: parsedRange.min,
            boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
          };
        }
        // numValue <= min
        const isMinBoundary = numValue === parsedRange.min;
        return {
          status: EVAL_STATUS.LOW,
          legacyStatus: LEGACY_STATUS_MAP.LOW,
          observed: numValue,
          min: parsedRange.min,
          boundaryInfo: {
            isBoundary: isMinBoundary,
            boundaryType: isMinBoundary ? 'min' : null,
            inclusive: false,
            note: isMinBoundary
              ? 'Value is exactly equal to strict lower limit (> min)'
              : undefined,
          },
        };
      }
    }

    default:
      return {
        status: EVAL_STATUS.NOT_EVALUATED,
        legacyStatus: LEGACY_STATUS_MAP.NOT_EVALUATED,
        reason: 'Unknown evaluation condition',
        observed: numValue,
        boundaryInfo: { isBoundary: false, boundaryType: null, inclusive: false },
      };
  }
};

/**
 * Evaluates an entire structured medical test record extracted from a report.
 *
 * Preserves original fields, adds deterministic status and boundary metadata,
 * and checks for printed flag discrepancies.
 *
 * @param {object} test - Extracted test item { testName, value, unit, referenceRange, printedFlag, rawLine }
 * @returns {object} Evaluated test record
 */
export const evaluateMedicalTest = (test) => {
  const { testName, value, unit, referenceRange, printedFlag, rawLine } = test;

  // Perform deterministic reference range evaluation
  const evalResult = evaluateRange(value, referenceRange);

  // Check for printed flag discrepancy
  const discrepancy = checkFlagDiscrepancy(printedFlag, evalResult.status);

  return {
    testName,
    value,
    unit: unit ?? null,
    referenceRange: referenceRange ?? null,
    status: evalResult.status, // Strictly: 'LOW' | 'NORMAL' | 'HIGH' | 'NOT_EVALUATED'
    legacyStatus: evalResult.legacyStatus,
    evaluationReason: evalResult.reason ?? null,
    boundaryInfo: evalResult.boundaryInfo ?? {
      isBoundary: false,
      boundaryType: null,
      inclusive: true,
    },
    printedFlag: printedFlag ?? null,
    flagDiscrepancy: discrepancy,
    rawLine: rawLine ?? null,
  };
};
