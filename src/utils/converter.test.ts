import { describe, it, expect } from 'vitest';
import {
  autoDetectBase,
  convertNumber,
  sanitizeInput,
  isValidForRadix,
  calculateTwosComplement,
  fractionDigitsToExactDecimal,
  decimalIntToBase,
} from './converter';

describe('autoDetectBase', () => {
  it('detects explicit prefixes with high confidence', () => {
    expect(autoDetectBase('0x2A').detectedBase).toBe('16');
    expect(autoDetectBase('0x2A').confidence).toBe('high');
    expect(autoDetectBase('0b101').detectedBase).toBe('2');
    expect(autoDetectBase('0b101').confidence).toBe('high');
    expect(autoDetectBase('0o17').detectedBase).toBe('8');
    expect(autoDetectBase('0o17').confidence).toBe('high');
  });

  it('detects hex letters unambiguously', () => {
    const r = autoDetectBase('FF');
    expect(r.detectedBase).toBe('16');
    expect(r.confidence).toBe('high');
  });

  it('treats digits 8/9 as decimal, not binary/octal', () => {
    expect(autoDetectBase('89').detectedBase).toBe('10');
  });

  it('flags a short all-binary-digit string as only medium confidence', () => {
    // "10" could plausibly be decimal or binary — this is the exact
    // ambiguity chatIntent.ts must not silently resolve to "verified".
    const r = autoDetectBase('10');
    expect(r.detectedBase).toBe('2');
    expect(r.confidence).toBe('medium');
  });

  it('is higher confidence for a longer pure-binary string', () => {
    const r = autoDetectBase('10110');
    expect(r.detectedBase).toBe('2');
    expect(r.confidence).toBe('high');
  });
});

describe('convertNumber — round trips across bases', () => {
  const cases: Array<[string, '2' | '8' | '10' | '16', string]> = [
    ['255', '10', '11111111'],
    ['0', '10', '0'],
    ['-42', '10', '-101010'],
  ];

  it('converts basic decimal -> binary values', () => {
    for (const [input, srcBase, expectedBinary] of cases) {
      const result = convertNumber(input, srcBase, '2');
      expect(result.isValid).toBe(true);
      expect(result.binary).toBe(expectedBinary);
    }
  });

  it('converts decimal to hex and octal correctly', () => {
    const r = convertNumber('255', '10', '16');
    expect(r.hexadecimal).toBe('FF');
    const r2 = convertNumber('64', '10', '8');
    expect(r2.octal).toBe('100');
  });

  it('round-trips hex -> decimal -> hex', () => {
    const toDec = convertNumber('2A', '16', '10');
    expect(toDec.denary).toBe('42');
    const backToHex = convertNumber('42', '10', '16');
    expect(backToHex.hexadecimal).toBe('2A');
  });

  it('handles zero', () => {
    const r = convertNumber('0', '10', '2');
    expect(r.isValid).toBe(true);
    expect(r.binary).toBe('0');
  });

  it('handles negative values', () => {
    const r = convertNumber('-15', '10', '16');
    expect(r.isValid).toBe(true);
    expect(r.hexadecimal).toBe('-F');
  });

  it('handles large integers exactly (beyond Number.MAX_SAFE_INTEGER)', () => {
    // 2^70 - well beyond safe float precision; must be exact via BigInt.
    const big = (2n ** 70n).toString();
    const r = convertNumber(big, '10', '16');
    expect(r.isValid).toBe(true);
    expect(BigInt('0x' + r.hexadecimal)).toBe(2n ** 70n);
  });

  it('rejects invalid digits for the stated base', () => {
    const r = convertNumber('129', '2', '10'); // '9' is not a valid binary digit
    expect(r.isValid).toBe(false);
  });

  it('accepts 0b/0o/0x prefixes on the raw input', () => {
    expect(convertNumber('0x1F', '16', '10').denary).toBe('31');
    expect(convertNumber('0b1010', '2', '10').denary).toBe('10');
    expect(convertNumber('0o17', '8', '10').denary).toBe('15');
  });

  it('converts using a custom radix', () => {
    const r = convertNumber('100', '10', 'custom', 7); // 100 decimal in base 7
    expect(r.isValid).toBe(true);
    expect(r.customBaseValue).toBe('202'); // 2*49 + 0*7 + 2 = 100
  });

  it('handles boundary values around common bit widths', () => {
    expect(convertNumber('255', '10', '2').binary).toBe('11111111'); // 8-bit max unsigned
    expect(convertNumber('256', '10', '2').binary).toBe('100000000');
    expect(convertNumber('65535', '10', '16').hexadecimal).toBe('FFFF');
  });
});

describe('fractional conversion (exact BigInt long division)', () => {
  it('produces an exact terminating decimal when one exists', () => {
    // 3/8 = 0.375 exactly (radix 8, one fraction digit worth 3/8)
    const r = fractionDigitsToExactDecimal('3', 8);
    expect(r.isExact).toBe(true);
    expect(r.display).toBe('375');
  });

  it('marks a non-terminating decimal expansion and shows the repeating cycle', () => {
    // 3 in base 7 as a single fractional digit = 3/7 = 0.428571428571...
    const r = fractionDigitsToExactDecimal('3', 7, 12);
    expect(r.isExact).toBe(false);
    // The repeating cycle for 3/7 is "428571"
    expect(r.display).toContain('(');
    expect(r.digits.length).toBeGreaterThan(0);
  });

  it('never produces raw floating-point noise like "...142857142855"', () => {
    const r = fractionDigitsToExactDecimal('3', 7, 12);
    // A float artifact would show a non-repeating tail with mismatched digits;
    // our digits must all belong to the true repeating decimal for 3/7.
    expect(r.digits).toMatch(/^(428571)+4?2?8?5?7?1?$/);
  });

  it('returns an empty result for an empty fraction', () => {
    const r = fractionDigitsToExactDecimal('', 10);
    expect(r.display).toBe('');
    expect(r.isExact).toBe(true);
  });
});

describe('sanitizeInput', () => {
  it('strips base-specific prefixes and uppercases hex digits', () => {
    expect(sanitizeInput('0b101', '2')).toBe('101');
    expect(sanitizeInput('0o17', '8')).toBe('17');
    expect(sanitizeInput('0xff', '16')).toBe('FF');
    expect(sanitizeInput('123', '10')).toBe('123');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeInput('   ', '10')).toBe('');
  });
});

describe('isValidForRadix', () => {
  it('accepts valid digits for each base', () => {
    expect(isValidForRadix('101', 2)).toBe(true);
    expect(isValidForRadix('17', 8)).toBe(true);
    expect(isValidForRadix('FF', 16)).toBe(true);
    expect(isValidForRadix('123', 10)).toBe(true);
  });

  it('rejects invalid digits for the base', () => {
    expect(isValidForRadix('129', 2)).toBe(false); // '2' and '9' invalid in binary
    expect(isValidForRadix('89', 8)).toBe(false); // '8', '9' invalid in octal
    expect(isValidForRadix('GG', 16)).toBe(false); // 'G' invalid in hex
  });

  it('rejects malformed decimal points and sign-only input', () => {
    expect(isValidForRadix('.', 10)).toBe(false);
    expect(isValidForRadix('-', 10)).toBe(false);
    expect(isValidForRadix('1.2.3', 10)).toBe(false);
  });
});

describe("calculateTwosComplement", () => {
  it('handles zero', () => {
    const r = calculateTwosComplement(0, 8);
    expect(r.twosComplement).toBe('00000000');
  });

  it('handles positive values', () => {
    const r = calculateTwosComplement(5, 8);
    expect(r.twosComplement).toBe('00000101');
  });

  it('handles -1 at every common width', () => {
    expect(calculateTwosComplement(-1, 4).twosComplement).toBe('1111');
    expect(calculateTwosComplement(-1, 8).twosComplement).toBe('11111111');
    expect(calculateTwosComplement(-1, 16).twosComplement).toBe('1111111111111111');
    expect(calculateTwosComplement(-1, 32).twosComplement).toBe('11111111111111111111111111111111'.slice(0, 32));
  });

  it('handles the minimum signed value at each width (no overflow)', () => {
    expect(calculateTwosComplement(-8, 4).twosComplement).toBe('1000');
    expect(calculateTwosComplement(-128, 8).twosComplement).toBe('10000000');
    expect(calculateTwosComplement(-32768, 16).twosComplement).toBe('1000000000000000');
  });

  it('handles the maximum signed value at each width (no overflow)', () => {
    expect(calculateTwosComplement(7, 4).twosComplement).toBe('0111');
    expect(calculateTwosComplement(127, 8).twosComplement).toBe('01111111');
    expect(calculateTwosComplement(32767, 16).twosComplement).toBe('0111111111111111');
  });

  it('flags overflow one past the minimum/maximum signed range', () => {
    expect(calculateTwosComplement(-129, 8).binaryStr).toBe('Overflow');
    expect(calculateTwosComplement(128, 8).binaryStr).toBe('Overflow');
    expect(calculateTwosComplement(-9, 4).binaryStr).toBe('Overflow');
    expect(calculateTwosComplement(8, 4).binaryStr).toBe('Overflow');
  });

  it('defaults to 8-bit width when none is given', () => {
    const r = calculateTwosComplement(-1);
    expect(r.twosComplement).toBe('11111111');
  });
});

describe('decimalIntToBase', () => {
  it('handles zero', () => {
    expect(decimalIntToBase(0n, 2)).toBe('0');
  });

  it('is exact for values beyond float precision', () => {
    const big = 2n ** 64n;
    const hex = decimalIntToBase(big, 16);
    expect(BigInt('0x' + hex)).toBe(big);
  });
});
