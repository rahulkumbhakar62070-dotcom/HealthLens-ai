/**
 * HealthLens AI - Deterministic Reference Range Evaluator
 *
 * Compares an observed test value strictly against the reference interval
 * stated directly in the lab report.
 *
 * Rules:
 * - Pure deterministic mathematical comparison.
 * - Never guesses missing bounds or fabricates baseline values.
 * - If value or range is qualitative, missing, or unparseable, marks as 'Not Evaluated'
 *   with an explicit human-readable justification.
 */

/**
 * Status enumeration
 */
export const EVAL_STATUS = {
  WITHIN_RANGE: 'Within Range',
  BELOW_RANGE: 'Below Range',
  ABOVE_RANGE: 'Above Range',
  NOT_EVALUATED: 'Not Evaluated',
};

/**
 * Parses numeric reference interval string into structured bounds.
 * Supports:
 * - "min - max" (e.g. "12.0 - 15.5", "70 - 99")
 * - "min to max"
 * - "< max", "<= max"
 * - "> min", ">= min"
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
  const qualitativeKeywords = ['negative', 'positive', 'non-reactive', 'reactive', 'normal', 'absent', 'present'];
  if (qualitativeKeywords.some((kw) => trimmed.toLowerCase().includes(kw)) && !/\d/.test(trimmed)) {
    return {
      type: 'qualitative',
      raw: trimmed,
      reason: 'Reference range is qualitative or non-numeric',
    };
  }

  // 1. Inequality: "< X" or "<= X"
  const lessThanMatch = trimmed.match(/^<(=)?\s*([0-9.]+)/i);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[2]);
    if (isNaN(max)) return { type: 'invalid', reason: 'Could not parse upper bound number' };
    return { type: 'upper_bound', max, inclusive: true, raw: trimmed };
  }

  // 2. Inequality: "> X" or ">= X"
  const greaterThanMatch = trimmed.match(/^>(=)?\s*([0-9.]+)/i);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[2]);
    if (isNaN(min)) return { type: 'invalid', reason: 'Could not parse lower bound number' };
    return { type: 'lower_bound', min, inclusive: true, raw: trimmed };
  }

  // 3. Two-sided interval: "min - max" or "min to max"
  const intervalMatch = trimmed.match(/^([0-9.]+)\s*(?:-|–|—|to)\s*([0-9.]+)/i);
  if (intervalMatch) {
    const min = parseFloat(intervalMatch[1]);
    const max = parseFloat(intervalMatch[2]);
    if (isNaN(min) || isNaN(max)) {
      return { type: 'invalid', reason: 'Reference range values are not valid numbers' };
    }
    return { type: 'interval', min, max, raw: trimmed };
  }

  // If there are numbers but format does not match recognized intervals
  return {
    type: 'unrecognized',
    raw: trimmed,
    reason: 'Reference range format is unparseable or unrecognized',
  };
};

/**
 * Evaluates an observed test value against a reference range.
 *
 * @param {number|string|null} observedValue - The observed lab test value
 * @param {string|null} referenceRangeStr - The reference range string from the report
 * @returns {{ status: string, reason?: string, observed: number|null, range: object }}
 */
export const evaluateRange = (observedValue, referenceRangeStr) => {
  // Check observed value
  if (observedValue === null || observedValue === undefined || observedValue === '') {
    return {
      status: EVAL_STATUS.NOT_EVALUATED,
      reason: 'Observed test value is missing or unparseable',
      observed: null,
      range: null,
    };
  }

  const numValue = typeof observedValue === 'number' ? observedValue : parseFloat(String(observedValue).trim());

  if (isNaN(numValue)) {
    return {
      status: EVAL_STATUS.NOT_EVALUATED,
      reason: 'Observed value is qualitative or non-numeric',
      observed: observedValue,
      range: referenceRangeStr,
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
        reason: parsedRange.reason,
        observed: numValue,
        range: parsedRange,
      };

    case 'interval':
      if (numValue < parsedRange.min) {
        return {
          status: EVAL_STATUS.BELOW_RANGE,
          observed: numValue,
          min: parsedRange.min,
          max: parsedRange.max,
        };
      }
      if (numValue > parsedRange.max) {
        return {
          status: EVAL_STATUS.ABOVE_RANGE,
          observed: numValue,
          min: parsedRange.min,
          max: parsedRange.max,
        };
      }
      return {
        status: EVAL_STATUS.WITHIN_RANGE,
        observed: numValue,
        min: parsedRange.min,
        max: parsedRange.max,
      };

    case 'upper_bound':
      if (numValue > parsedRange.max) {
        return {
          status: EVAL_STATUS.ABOVE_RANGE,
          observed: numValue,
          max: parsedRange.max,
        };
      }
      return {
        status: EVAL_STATUS.WITHIN_RANGE,
        observed: numValue,
        max: parsedRange.max,
      };

    case 'lower_bound':
      if (numValue < parsedRange.min) {
        return {
          status: EVAL_STATUS.BELOW_RANGE,
          observed: numValue,
          min: parsedRange.min,
        };
      }
      return {
        status: EVAL_STATUS.WITHIN_RANGE,
        observed: numValue,
        min: parsedRange.min,
      };

    default:
      return {
        status: EVAL_STATUS.NOT_EVALUATED,
        reason: 'Unknown evaluation condition',
        observed: numValue,
      };
  }
};
