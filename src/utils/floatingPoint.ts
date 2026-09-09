/**
 * Generalized IEEE 754-style floating-point engine.
 *
 * Every entry point takes a `FloatFormat` (exponent bit width + fraction bit
 * width) and works for the three IEEE 754 standard formats (Binary16,
 * Binary32, Binary64) as well as any user-defined Custom Format.
 *
 * Design note on correctness: rather than relying on a native type (only
 * Binary32/64 have one in JS) to get the rounding right, this derives the
 * *exact* binary expansion of the input double via repeated division
 * (integer part) and repeated multiplication (fractional part) — a JS
 * number is itself an IEEE 754 double, so this expansion is always exact
 * and always finite. From that exact expansion, a single generic
 * round-to-nearest-even routine extracts however many fraction bits the
 * target format needs, using the standard guard/round/sticky-bit rule.
 * This means one code path is correct for every format, and is verified
 * against native `DataView` ground truth for Binary32/Binary64 in tests.
 *
 * Design note on "exactness" terminology: this engine can tell you whether
 * encoding a JS number into a target format changed that number (i.e.
 * whether decoding the stored bits reproduces the same JS number). It does
 * NOT attempt to determine whether the original *decimal* text the user
 * typed has an exact finite binary representation — that's a distinct,
 * harder question (e.g. 0.1 has no exact binary form at all, in any
 * precision, even though it round-trips through a JS double unchanged
 * because JS already rounded it once on parse). To avoid overclaiming,
 * everything here is phrased as "round-trip preserved" / "the conversion
 * changed the value", never as "exact".
 */

export interface FloatFormat {
  id: string;
  label: string;
  exponentBits: number;
  fractionBits: number;
  isStandard: boolean;
}

export const STANDARD_FORMATS: Record<'binary16' | 'binary32' | 'binary64', FloatFormat> = {
  binary16: { id: 'binary16', label: 'Binary16', exponentBits: 5, fractionBits: 10, isStandard: true },
  binary32: { id: 'binary32', label: 'Binary32', exponentBits: 8, fractionBits: 23, isStandard: true },
  binary64: { id: 'binary64', label: 'Binary64', exponentBits: 11, fractionBits: 52, isStandard: true },
};

export const CUSTOM_FORMAT_LIMITS = {
  exponentBits: { min: 2, max: 15 },
  fractionBits: { min: 1, max: 52 },
};

export function makeCustomFormat(exponentBits: number, fractionBits: number): FloatFormat {
  return { id: 'custom', label: 'Custom', exponentBits, fractionBits, isStandard: false };
}

/** Returns a plain-language validation message, or null if the configuration is usable. */
export function validateCustomFormat(exponentBits: number, fractionBits: number): string | null {
  const { exponentBits: eLim, fractionBits: fLim } = CUSTOM_FORMAT_LIMITS;
  if (!Number.isFinite(exponentBits) || !Number.isFinite(fractionBits)) {
    return 'Invalid format: enter a whole number of bits for both the exponent and the fraction.';
  }
  if (!Number.isInteger(exponentBits) || !Number.isInteger(fractionBits)) {
    return 'Invalid format: bit widths must be whole numbers.';
  }
  if (exponentBits < eLim.min || exponentBits > eLim.max) {
    return `Invalid format: exponent width must be between ${eLim.min} and ${eLim.max} bits.`;
  }
  if (fractionBits < fLim.min || fractionBits > fLim.max) {
    return `Invalid format: fraction width must be between ${fLim.min} and ${fLim.max} bits.`;
  }
  return null;
}

export function totalBits(format: FloatFormat): number {
  return 1 + format.exponentBits + format.fractionBits;
}

export function biasOf(format: FloatFormat): number {
  return Math.pow(2, format.exponentBits - 1) - 1;
}

/** Rough (not exact) order-of-magnitude scale the format can reach, for "approximate range" messaging. */
export function approxMaxMagnitude(format: FloatFormat): number {
  return Math.pow(2, biasOf(format));
}

/** Rough (not exact) number of significant decimal digits the fraction width buys, for "approximate precision" messaging. */
export function approxDecimalDigits(format: FloatFormat): number {
  return Math.floor(format.fractionBits * Math.log10(2));
}

export type FloatCategory = 'zero' | 'normal' | 'subnormal' | 'infinity' | 'nan';

export interface RadixRow { before: string; after: string; bit: string; }
export interface MultiplyRow { before: string; after: string; bit: string; }

export interface FPStep {
  id: string;
  title: string;
  explanation: string;
  equationLines: string[];
  finalResult: string;
  detailsLabel?: string;
}

export interface FloatBreakdown {
  input: string;
  value: number;
  storedValue: number;
  /** Does decoding the stored bits reproduce the exact same JS number that was encoded? */
  roundTripPreserved: boolean;
  /** Did fitting the value into this format's bit widths change it (rounding/truncation)? Equivalent to !roundTripPreserved, named separately for UI clarity. */
  conversionChangedValue: boolean;

  format: FloatFormat;
  category: FloatCategory;
  signBit: 0 | 1;

  intPart: string;
  fracPart: string;

  normalizedFraction: string; // full-precision, pre-rounding
  unbiasedExponent: number;

  biasedExponent: number;
  exponentBits: string;
  fractionBits: string;

  bitString: string; // sign + exponent + fraction, length = totalBits(format)
  hex: string | null; // null when totalBits isn't a multiple of 4

  integerDivisionRows: RadixRow[];
  integerDivisionTruncated: boolean;
  fractionMultiplyRows: MultiplyRow[];
  fractionMultiplyTruncated: boolean;

  /** Rounding diagnostics, present whenever a normal/subnormal value needed extraction. */
  rounding?: { guardBit: '0' | '1'; stickyBit: boolean; roundedUp: boolean };

  steps: FPStep[];
}

// ---------------------------------------------------------------------------
// Shared bit-level plumbing
// ---------------------------------------------------------------------------

function bitsToHex(bits: string): string | null {
  if (bits.length % 4 !== 0) return null;
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16).toUpperCase();
  }
  return hex;
}

function padBits(n: number, width: number): string {
  return Math.max(0, n).toString(2).padStart(width, '0');
}

/** Repeated-division-by-2 trace for a non-negative BigInt. */
function integerToBinary(n: bigint): { digits: string; rows: RadixRow[]; truncated: boolean } {
  if (n === 0n) return { digits: '0', rows: [{ before: '0', after: '0', bit: '0' }], truncated: false };
  const MAX_ROWS = 1200;
  const rows: RadixRow[] = [];
  const bits: string[] = [];
  let cur = n;
  let count = 0;
  while (cur > 0n) {
    const next = cur / 2n;
    const bit = cur % 2n;
    if (count < MAX_ROWS) rows.push({ before: cur.toString(), after: next.toString(), bit: bit.toString() });
    bits.push(bit.toString());
    cur = next;
    count++;
  }
  return { digits: bits.reverse().join(''), rows, truncated: count > MAX_ROWS };
}

/**
 * Repeated-multiply-by-2 trace for a fractional value in [0, 1). Since the
 * caller always passes the fractional part of an actual JS double, this is
 * mathematically guaranteed to terminate at frac === 0 (a double's binary
 * expansion is always finite) well within this iteration cap.
 */
function fractionToBinary(frac: number): { digits: string; rows: MultiplyRow[]; truncated: boolean } {
  const HARD_CAP = 1200; // comfortably covers even double subnormal precision
  const MAX_ROWS = 1200;
  const rows: MultiplyRow[] = [];
  const bits: string[] = [];
  let cur = frac;
  let i = 0;
  while (cur > 0 && i < HARD_CAP) {
    const doubled = cur * 2;
    const bit = doubled >= 1 ? 1 : 0;
    const next = doubled - bit;
    if (i < MAX_ROWS) {
      rows.push({ before: cur.toFixed(Math.min(20, 10 + i)), after: doubled.toFixed(Math.min(20, 10 + i)), bit: bit.toString() });
    }
    bits.push(bit.toString());
    cur = next;
    i++;
  }
  return { digits: bits.join(''), rows, truncated: i > MAX_ROWS };
}

/** Digit at positional weight 2^exp within a point-free digit string, given where its point sits. */
function bitAtWeight(combined: string, pointIndex: number, exp: number): '0' | '1' {
  const idx = pointIndex - 1 - exp;
  if (idx < 0 || idx >= combined.length) return '0';
  return combined[idx] as '0' | '1';
}

/** True if any '1' exists in combined at or after digit index `fromIdx`. */
function anyOneFrom(combined: string, fromIdx: number): boolean {
  for (let i = Math.max(0, fromIdx); i < combined.length; i++) {
    if (combined[i] === '1') return true;
  }
  return false;
}

interface RoundResult { bits: string; carry: boolean; guardBit: '0' | '1'; stickyBit: boolean; roundedUp: boolean; }

/**
 * Extracts `width` fraction bits starting right after positional weight
 * `refExp`, applying round-to-nearest-even using the guard bit (the next
 * bit down) and a sticky bit (OR of every bit beyond that). Works
 * identically for the normal case (refExp = the value's own leading-1
 * exponent) and the subnormal case (refExp = the format's fixed minimum
 * exponent), since it only ever reads positional weights off the exact
 * digit string — it doesn't assume where the leading 1 is.
 */
function extractRounded(combined: string, pointIndex: number, refExp: number, width: number): RoundResult {
  const bits: string[] = [];
  for (let i = 1; i <= width; i++) bits.push(bitAtWeight(combined, pointIndex, refExp - i));
  const guardBit = bitAtWeight(combined, pointIndex, refExp - width - 1);
  const guardIdx = pointIndex - 1 - (refExp - width - 1);
  const stickyBit = anyOneFrom(combined, guardIdx + 1);

  const lastBit = bits.length > 0 ? bits[bits.length - 1] : '0';
  const roundedUp = guardBit === '1' && (stickyBit || lastBit === '1');

  let carry = false;
  if (roundedUp) {
    const arr = bits.slice();
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === '0') { arr[i] = '1'; break; }
      arr[i] = '0';
      i--;
    }
    if (i < 0) carry = true;
    return { bits: arr.join(''), carry, guardBit, stickyBit, roundedUp };
  }
  return { bits: bits.join(''), carry, guardBit, stickyBit, roundedUp };
}

function superscript(n: number): string {
  const map: Record<string, string> = {
    '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
    '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207b',
  };
  return n.toString().split('').map(ch => map[ch] ?? ch).join('');
}

// ---------------------------------------------------------------------------
// Decimal / Number -> Floating Point
// ---------------------------------------------------------------------------

export function parseDecimalInput(raw: string): { value: number; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+') {
    return { value: NaN, error: 'Enter a decimal number.' };
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
    return { value: NaN, error: 'Enter a decimal number, e.g. 13.25 or 6.02e23.' };
  }
  const value = Number(trimmed);
  if (Number.isNaN(value)) return { value: NaN, error: 'That value could not be parsed as a decimal number.' };
  return { value };
}

/**
 * Encodes an already-parsed JS number into the given format. This is the
 * core numeric path shared by `decimalToFloatBreakdown` (which parses a
 * decimal string first) and by direct re-encoding, e.g. when the person
 * switches formats in Decode mode and BitForge needs to re-derive the same
 * numerical value's representation under the new format rather than just
 * resizing the old bit pattern.
 */
export function numberToFloatBreakdown(value: number, raw: string, format: FloatFormat): FloatBreakdown {
  const bias = biasOf(format);
  const maxNormalExp = bias;
  const minNormalExp = 1 - bias;

  const signBit: 0 | 1 = value < 0 || Object.is(value, -0) ? 1 : 0;
  const absValue = Math.abs(value);

  const zeroBits = () => `${signBit}${'0'.repeat(format.exponentBits)}${'0'.repeat(format.fractionBits)}`;
  const infBits = () => `${signBit}${'1'.repeat(format.exponentBits)}${'0'.repeat(format.fractionBits)}`;
  const nanBits = () => `0${'1'.repeat(format.exponentBits)}1${'0'.repeat(Math.max(0, format.fractionBits - 1))}`;

  if (Number.isNaN(value)) {
    return buildSpecial('nan', raw, value, NaN, format, 0, nanBits(), { intPart: '0', fracPart: '0' });
  }
  if (absValue === 0) {
    return buildSpecial('zero', raw, value, value, format, signBit, zeroBits(), { intPart: '0', fracPart: '0' });
  }
  if (!Number.isFinite(absValue)) {
    return buildSpecial('infinity', raw, value, signBit ? -Infinity : Infinity, format, signBit, infBits(), { intPart: absValue.toString(), fracPart: '' });
  }

  const intAbs = Math.trunc(absValue);
  const fracAbs = absValue - intAbs;
  const intBig = BigInt(intAbs); // exact: absValue is a double, its truncated integer part is exact as a double

  const { digits: intDigits, rows: intRows, truncated: intTrunc } = integerToBinary(intBig);
  const { digits: fracDigits, rows: fracRows, truncated: fracTrunc } = fractionToBinary(fracAbs);

  const combined = intDigits + fracDigits;
  const pointIndex = intDigits.length;
  const firstOneIdx = combined.indexOf('1');

  if (firstOneIdx === -1) {
    return buildSpecial('zero', raw, value, value, format, signBit, zeroBits(), { intPart: intDigits, fracPart: fracDigits });
  }

  const e = pointIndex - 1 - firstOneIdx;
  const normalizedFraction = combined.slice(firstOneIdx + 1) || '0';

  let category: FloatCategory;
  let biasedExponent: number;
  let fractionBitsStr: string;
  let unbiasedExponent: number;
  let rounding: FloatBreakdown['rounding'];

  if (e > maxNormalExp) {
    return buildSpecial('infinity', raw, value, signBit ? -Infinity : Infinity, format, signBit, infBits(), { intPart: intDigits, fracPart: fracDigits });
  }

  if (e >= minNormalExp) {
    const r = extractRounded(combined, pointIndex, e, format.fractionBits);
    rounding = { guardBit: r.guardBit, stickyBit: r.stickyBit, roundedUp: r.roundedUp };
    if (r.carry) {
      const newE = e + 1;
      if (newE > maxNormalExp) {
        return buildSpecial('infinity', raw, value, signBit ? -Infinity : Infinity, format, signBit, infBits(), { intPart: intDigits, fracPart: fracDigits });
      }
      unbiasedExponent = newE;
      biasedExponent = newE + bias;
      fractionBitsStr = '0'.repeat(format.fractionBits);
    } else {
      unbiasedExponent = e;
      biasedExponent = e + bias;
      fractionBitsStr = r.bits;
    }
    category = 'normal';
  } else {
    const r = extractRounded(combined, pointIndex, minNormalExp, format.fractionBits);
    rounding = { guardBit: r.guardBit, stickyBit: r.stickyBit, roundedUp: r.roundedUp };
    if (r.carry) {
      unbiasedExponent = minNormalExp;
      biasedExponent = 1;
      fractionBitsStr = '0'.repeat(format.fractionBits);
      category = 'normal';
    } else if (!r.bits.includes('1')) {
      unbiasedExponent = 0;
      biasedExponent = 0;
      fractionBitsStr = '0'.repeat(format.fractionBits);
      category = 'zero';
    } else {
      unbiasedExponent = minNormalExp;
      biasedExponent = 0;
      fractionBitsStr = r.bits;
      category = 'subnormal';
    }
  }

  const exponentBitsStr = padBits(biasedExponent, format.exponentBits);
  const bitString = `${signBit}${exponentBitsStr}${fractionBitsStr}`;
  const hex = bitsToHex(bitString);
  const reconstructed = decodeBits(signBit, exponentBitsStr, fractionBitsStr, format).value;

  const steps = buildEncodeSteps({
    raw, value, signBit, absValue, format, bias,
    intDigits, fracDigits, intRows, intTrunc, fracRows, fracTrunc,
    category, unbiasedExponent, biasedExponent, exponentBitsStr, fractionBitsStr,
    normalizedFraction, bitString, hex, reconstructed, rounding,
  });

  const roundTripPreserved = reconstructed === value;

  return {
    input: raw,
    value,
    storedValue: reconstructed,
    roundTripPreserved,
    conversionChangedValue: !roundTripPreserved,
    format,
    category,
    signBit,
    intPart: intDigits,
    fracPart: fracDigits,
    normalizedFraction,
    unbiasedExponent,
    biasedExponent,
    exponentBits: exponentBitsStr,
    fractionBits: fractionBitsStr,
    bitString,
    hex,
    integerDivisionRows: intRows,
    integerDivisionTruncated: intTrunc,
    fractionMultiplyRows: fracRows,
    fractionMultiplyTruncated: fracTrunc,
    rounding,
    steps,
  };
}

export function decimalToFloatBreakdown(raw: string, format: FloatFormat): FloatBreakdown | { error: string } {
  const { value, error } = parseDecimalInput(raw);
  if (error) return { error };
  return numberToFloatBreakdown(value, raw, format);
}

function buildSpecial(
  category: FloatCategory,
  raw: string,
  value: number,
  storedValue: number,
  format: FloatFormat,
  signBit: 0 | 1,
  bitString: string,
  plain: { intPart: string; fracPart: string }
): FloatBreakdown {
  const hex = bitsToHex(bitString);
  const exponentBitsStr = bitString.slice(1, 1 + format.exponentBits);
  const fractionBitsStr = bitString.slice(1 + format.exponentBits);
  const label = category === 'zero' ? (signBit ? '\u22120' : '0') : category === 'nan' ? 'NaN' : signBit ? '\u2212\u221e' : '\u221e';

  const steps: FPStep[] = [
    {
      id: 'sign', title: 'Sign',
      explanation: category === 'nan' ? 'NaN has no meaningful sign; BitForge stores it with sign bit 0.' : `${raw} is ${signBit ? 'negative' : 'non-negative'}, so the sign bit is ${signBit}.`,
      equationLines: [`sign = ${signBit}`], finalResult: `Sign bit = ${signBit}`,
    },
    {
      id: 'binary', title: category === 'zero' ? 'Zero is a Reserved Pattern' : category === 'nan' ? 'NaN is a Reserved Pattern' : 'Overflow to Infinity',
      explanation: category === 'zero'
        ? 'Zero has no leading 1 to normalize around, so this format reserves the all-zero exponent and fraction for it.'
        : category === 'nan'
        ? 'NaN represents a result that is not a valid number (like 0/0), so it uses a reserved pattern rather than an encoded magnitude.'
        : `This magnitude is larger than the largest finite value ${format.label} can hold, so it rounds to infinity — the reserved pattern with an all-one exponent and an all-zero fraction.`,
      equationLines: [`|value| = ${Math.abs(value)}`], finalResult: label,
    },
    { id: 'normalize', title: 'Normalization', explanation: 'Not applicable — this is a reserved special pattern, not a normalized value.', equationLines: ['\u2014'], finalResult: 'Not applicable' },
    { id: 'exponent', title: 'Exponent', explanation: `${category === 'zero' ? 'Zero' : category === 'nan' ? 'NaN' : 'Infinity'} always uses the reserved all-${category === 'zero' ? 'zero' : 'one'} exponent field.`, equationLines: [`exponent bits = ${exponentBitsStr}`], finalResult: `Exponent = ${exponentBitsStr}` },
    { id: 'fraction', title: 'Fraction', explanation: category === 'nan' ? 'NaN is marked by a nonzero fraction alongside the all-one exponent.' : `${category === 'zero' ? 'Zero' : 'Infinity'} always uses an all-zero fraction field.`, equationLines: [`fraction bits = ${fractionBitsStr}`], finalResult: `Fraction = ${fractionBitsStr}` },
  ];

  return {
    input: raw, value, storedValue, roundTripPreserved: true, conversionChangedValue: false,
    format, category, signBit,
    intPart: plain.intPart, fracPart: plain.fracPart,
    normalizedFraction: fractionBitsStr, unbiasedExponent: 0,
    biasedExponent: category === 'zero' ? 0 : Math.pow(2, format.exponentBits) - 1,
    exponentBits: exponentBitsStr, fractionBits: fractionBitsStr,
    bitString, hex,
    integerDivisionRows: [], integerDivisionTruncated: false,
    fractionMultiplyRows: [], fractionMultiplyTruncated: false,
    steps,
  };
}

interface StepArgs {
  raw: string; value: number; signBit: 0 | 1; absValue: number; format: FloatFormat; bias: number;
  intDigits: string; fracDigits: string; intRows: RadixRow[]; intTrunc: boolean;
  fracRows: MultiplyRow[]; fracTrunc: boolean;
  category: FloatCategory; unbiasedExponent: number; biasedExponent: number;
  exponentBitsStr: string; fractionBitsStr: string; normalizedFraction: string;
  bitString: string; hex: string | null; reconstructed: number;
  rounding?: FloatBreakdown['rounding'];
}

function buildEncodeSteps(a: StepArgs): FPStep[] {
  const plainBinary = `${a.intDigits}.${a.fracDigits || '0'}`;
  const shiftAmount = Math.abs(a.unbiasedExponent);
  const shiftDirection = a.unbiasedExponent >= 0 ? 'left' : 'right';
  const isNeg = a.value < 0 || Object.is(a.value, -0);
  const changed = a.reconstructed !== a.value;

  const sign: FPStep = {
    id: 'sign', title: 'Sign',
    explanation: `${a.raw} is ${isNeg ? 'negative' : 'positive (or zero)'}, so the sign bit is ${a.signBit}. 0 means positive, 1 means negative.`,
    equationLines: [`value = ${a.raw}`, `sign = ${a.signBit} (${isNeg ? 'negative' : 'positive'})`],
    finalResult: `Sign bit = ${a.signBit}`,
  };

  const binary: FPStep = {
    id: 'binary', title: 'Binary Conversion',
    explanation: `${a.raw}\u2081\u2080 \u2192 ${plainBinary}\u2082. The integer and fractional parts are converted to binary separately.`,
    equationLines: [`${Math.trunc(a.absValue)} \u2192 ${a.intDigits}\u2082`, ...(a.fracDigits ? [`0.${(a.absValue - Math.trunc(a.absValue)).toString().split('.')[1] || '0'} \u2192 0.${a.fracDigits}\u2082`] : [])],
    finalResult: `${plainBinary}\u2082`,
    detailsLabel: 'Show conversion method',
  };

  const normalize: FPStep = {
    id: 'normalize', title: 'Normalization',
    explanation: a.category === 'subnormal'
      ? `The value is too small to reach a leading 1 within the normal exponent range, so it's kept denormalized, scaled by a fixed exponent of ${a.unbiasedExponent}.`
      : `Move the binary point until exactly one non-zero digit remains on the left: ${plainBinary}\u2082 \u2192 1.${a.normalizedFraction}\u2082 \u00d7 2${superscript(a.unbiasedExponent)}.`,
    equationLines: a.category === 'subnormal'
      ? [`0.${a.fractionBitsStr}\u2082 \u00d7 2${superscript(a.unbiasedExponent)}`]
      : [`${plainBinary}\u2082 \u2192 1.${a.normalizedFraction}\u2082 \u00d7 2${superscript(a.unbiasedExponent)}`, `Point moved ${shiftAmount} place${shiftAmount === 1 ? '' : 's'} ${shiftDirection}`],
    finalResult: a.category === 'subnormal' ? `0.${a.fractionBitsStr}\u2082 \u00d7 2${superscript(a.unbiasedExponent)}` : `1.${a.normalizedFraction}\u2082 \u00d7 2${superscript(a.unbiasedExponent)}`,
    detailsLabel: 'Show normalization details',
  };

  const exponent: FPStep = {
    id: 'exponent', title: 'Exponent',
    explanation: a.category === 'subnormal'
      ? `Subnormal values always store an all-zero exponent field and use a fixed scale instead of an encoded exponent.`
      : `The stored exponent uses a bias so that both positive and negative exponents can be represented: ${a.unbiasedExponent} + ${a.bias} = ${a.biasedExponent}.`,
    equationLines: a.category === 'subnormal' ? [`exponent bits = ${a.exponentBitsStr} (reserved)`] : [`${a.format.label}'s bias is ${a.bias}.`, `E = e + bias = ${a.unbiasedExponent} + ${a.bias} = ${a.biasedExponent}`, `${a.biasedExponent} in binary = ${a.exponentBitsStr}`],
    finalResult: `Exponent bits = ${a.exponentBitsStr} (${a.biasedExponent})`,
    detailsLabel: 'Show exponent & bias details',
  };

  const fraction: FPStep = {
    id: 'fraction', title: 'Fraction',
    explanation: a.category === 'subnormal'
      ? `With no implicit leading bit, all ${a.format.fractionBits} stored bits come directly from the value's own fraction.`
      : `Only the ${a.format.fractionBits} bits after the normalized leading "1." are stored — the leading 1 is implicit.${changed ? ' This value needed more bits than the format stores, so it was rounded to the nearest representable value.' : ''}`,
    equationLines: [`fraction bits = ${a.fractionBitsStr}`],
    finalResult: `Fraction bits = ${a.fractionBitsStr}`,
    detailsLabel: 'Show fraction details',
  };

  return [sign, binary, normalize, exponent, fraction];
}

// ---------------------------------------------------------------------------
// Floating Point -> Decimal
// ---------------------------------------------------------------------------

export interface BitDecodeResult {
  signBit: 0 | 1;
  exponentBits: string;
  fractionBits: string;
  biasedExponent: number;
  unbiasedExponent: number;
  category: FloatCategory;
  value: number;
  hex: string | null;
  bitString: string;
  formula: string;
  steps: FPStep[];
}

export function decodeBits(signBit: 0 | 1, exponentBits: string, fractionBits: string, format: FloatFormat): BitDecodeResult {
  const bias = biasOf(format);
  const maxBiasedExp = Math.pow(2, format.exponentBits) - 1;
  const biasedExponent = parseInt(exponentBits, 2);
  const fractionIsZero = !fractionBits.includes('1');

  let category: FloatCategory;
  if (biasedExponent === 0) category = fractionIsZero ? 'zero' : 'subnormal';
  else if (biasedExponent === maxBiasedExp) category = fractionIsZero ? 'infinity' : 'nan';
  else category = 'normal';

  let fractionValue = 0;
  for (let i = 0; i < fractionBits.length; i++) {
    if (fractionBits[i] === '1') fractionValue += Math.pow(2, -(i + 1));
  }

  const sign = signBit ? -1 : 1;
  let value: number;
  let unbiasedExponent: number;
  let formula: string;
  const signStr = signBit ? '\u2212' : '';

  switch (category) {
    case 'zero': value = signBit ? -0 : 0; unbiasedExponent = 0; formula = `${signStr}0`; break;
    case 'infinity': value = sign * Infinity; unbiasedExponent = 0; formula = `${signStr}\u221e`; break;
    case 'nan': value = NaN; unbiasedExponent = 0; formula = 'NaN'; break;
    case 'subnormal':
      unbiasedExponent = 1 - bias;
      value = sign * fractionValue * Math.pow(2, unbiasedExponent);
      formula = `${signStr}0.${fractionBits} \u00d7 2${superscript(unbiasedExponent)}`;
      break;
    default:
      unbiasedExponent = biasedExponent - bias;
      value = sign * (1 + fractionValue) * Math.pow(2, unbiasedExponent);
      formula = `${signStr}1.${fractionBits} \u00d7 2${superscript(unbiasedExponent)}`;
  }

  const bitString = `${signBit}${exponentBits}${fractionBits}`;
  const hex = bitsToHex(bitString);
  const steps = buildDecodeSteps({ signBit, exponentBits, fractionBits, biasedExponent, unbiasedExponent, category, value, bias, format, formula, fractionValue });

  return { signBit, exponentBits, fractionBits, biasedExponent, unbiasedExponent, category, value, hex, bitString, formula, steps };
}

interface DecodeStepArgs {
  signBit: 0 | 1; exponentBits: string; fractionBits: string; biasedExponent: number;
  unbiasedExponent: number; category: FloatCategory; value: number; bias: number;
  format: FloatFormat; formula: string; fractionValue: number;
}

function buildDecodeSteps(a: DecodeStepArgs): FPStep[] {
  const isSpecial = a.category === 'zero' || a.category === 'infinity' || a.category === 'nan';

  const sign: FPStep = {
    id: 'sign', title: 'Sign',
    explanation: `The sign bit determines whether the number is positive or negative: ${a.signBit} means ${a.signBit ? 'negative' : 'positive'}.`,
    equationLines: [`sign = ${a.signBit}`],
    finalResult: `${a.signBit ? 'Negative' : 'Positive'}`,
  };

  const exponent: FPStep = {
    id: 'exponent', title: 'Exponent',
    explanation: isSpecial
      ? `The exponent field is ${a.exponentBits} \u2014 the reserved all-${a.biasedExponent === 0 ? 'zero' : 'one'} pattern.`
      : `Read the stored exponent bits and interpret them using ${a.format.label}'s bias: stored value = ${a.biasedExponent}.`,
    equationLines: [`exponent bits = ${a.exponentBits}`, `stored (biased) exponent = ${a.biasedExponent}`],
    finalResult: `Stored exponent = ${a.biasedExponent}`,
    detailsLabel: 'Show exponent details',
  };

  const removeBias: FPStep = {
    id: 'removeBias', title: 'Remove Bias',
    explanation: isSpecial
      ? 'Special patterns don\u2019t use a normal biased exponent, so this step doesn\u2019t apply.'
      : `Subtract the format's bias to recover the true exponent: ${a.biasedExponent} \u2212 ${a.bias} = ${a.unbiasedExponent}.`,
    equationLines: isSpecial ? ['\u2014'] : [`e = E \u2212 bias = ${a.biasedExponent} \u2212 ${a.bias} = ${a.unbiasedExponent}`],
    finalResult: isSpecial ? 'Not applicable' : `True exponent = ${a.unbiasedExponent}`,
    detailsLabel: 'Show bias details',
  };

  const fraction: FPStep = {
    id: 'fraction', title: 'Fraction',
    explanation: isSpecial
      ? `Fraction bits = ${a.fractionBits}.`
      : `The fraction bits provide the significant binary digits after the (${a.category === 'subnormal' ? 'absent, subnormal' : 'implicit'}) leading digit.`,
    equationLines: [`fraction bits = ${a.fractionBits}`, ...(isSpecial ? [] : [`fraction value = ${a.fractionValue}`])],
    finalResult: `Fraction bits = ${a.fractionBits}`,
    detailsLabel: 'Show fraction details',
  };

  const reconstruct: FPStep = {
    id: 'reconstruct', title: 'Reconstruct Value',
    explanation: `Putting sign, exponent, and fraction together: ${a.formula} = ${formatValueForStep(a.value)}.`,
    equationLines: [`value = ${a.formula}`, `= ${formatValueForStep(a.value)}`],
    finalResult: formatValueForStep(a.value),
    detailsLabel: 'Show reconstruction details',
  };

  return [sign, exponent, removeBias, fraction, reconstruct];
}

function formatValueForStep(v: number): string {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return '\u221e';
  if (v === -Infinity) return '\u2212\u221e';
  if (Object.is(v, -0)) return '\u22120';
  return String(v);
}

/** Builds the bit pattern for a named special value in the given format, for the Special Values explorer. */
export function specialValueBits(kind: 'zero' | 'negativeZero' | 'infinity' | 'negativeInfinity' | 'nan' | 'subnormal', format: FloatFormat): string {
  const e = format.exponentBits;
  const f = format.fractionBits;
  switch (kind) {
    case 'zero': return `0${'0'.repeat(e)}${'0'.repeat(f)}`;
    case 'negativeZero': return `1${'0'.repeat(e)}${'0'.repeat(f)}`;
    case 'infinity': return `0${'1'.repeat(e)}${'0'.repeat(f)}`;
    case 'negativeInfinity': return `1${'1'.repeat(e)}${'0'.repeat(f)}`;
    case 'nan': return `0${'1'.repeat(e)}1${'0'.repeat(Math.max(0, f - 1))}`;
    case 'subnormal': return `0${'0'.repeat(e)}${'0'.repeat(Math.max(0, f - 1))}1`;
  }
}

export const SPECIAL_VALUE_BLURBS: Record<'zero' | 'infinity' | 'nan' | 'subnormal', string> = {
  zero: 'Represents zero, including a separate negative-zero representation.',
  infinity: 'Represents a value beyond the finite range of the format.',
  nan: 'Represents a result that is not a valid numerical value.',
  subnormal: 'Represents very small values using a special representation once normal numbers can no longer be represented.',
};
