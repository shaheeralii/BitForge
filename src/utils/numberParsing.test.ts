import { describe, it, expect } from 'vitest';
import {
  isValidRadix,
  stripSignAndPrefix,
  parseNumericLiteral,
  parseSignedIntegerLiteral,
} from './numberParsing';

describe('isValidRadix', () => {
  it('accepts every integer from 2 to 36', () => {
    for (let r = 2; r <= 36; r++) expect(isValidRadix(r)).toBe(true);
  });
  it('rejects out-of-range, non-integer, and non-finite values', () => {
    expect(isValidRadix(1)).toBe(false);
    expect(isValidRadix(37)).toBe(false);
    expect(isValidRadix(0)).toBe(false);
    expect(isValidRadix(-2)).toBe(false);
    expect(isValidRadix(2.5)).toBe(false);
    expect(isValidRadix(NaN)).toBe(false);
    expect(isValidRadix(Infinity)).toBe(false);
  });
});

describe('stripSignAndPrefix — sign and prefix are independent', () => {
  it('detects a prefix with no sign', () => {
    expect(stripSignAndPrefix('0xFF')).toEqual({ isNegative: false, prefix: '0x', impliedRadix: 16, body: 'FF' });
    expect(stripSignAndPrefix('0b1010')).toEqual({ isNegative: false, prefix: '0b', impliedRadix: 2, body: '1010' });
    expect(stripSignAndPrefix('0o17')).toEqual({ isNegative: false, prefix: '0o', impliedRadix: 8, body: '17' });
  });

  it('detects a prefix behind a leading sign — the exact bug being fixed', () => {
    expect(stripSignAndPrefix('-0xFF')).toEqual({ isNegative: true, prefix: '0x', impliedRadix: 16, body: 'FF' });
    expect(stripSignAndPrefix('+0x2A')).toEqual({ isNegative: false, prefix: '0x', impliedRadix: 16, body: '2A' });
    expect(stripSignAndPrefix('-0b1010')).toEqual({ isNegative: true, prefix: '0b', impliedRadix: 2, body: '1010' });
    expect(stripSignAndPrefix('-0o17')).toEqual({ isNegative: true, prefix: '0o', impliedRadix: 8, body: '17' });
  });

  it('handles a sign with no prefix, and neither', () => {
    expect(stripSignAndPrefix('-42')).toEqual({ isNegative: true, prefix: '', impliedRadix: null, body: '42' });
    expect(stripSignAndPrefix('+42')).toEqual({ isNegative: false, prefix: '', impliedRadix: null, body: '42' });
    expect(stripSignAndPrefix('42')).toEqual({ isNegative: false, prefix: '', impliedRadix: null, body: '42' });
  });

  it('is case-insensitive on the prefix letter', () => {
    expect(stripSignAndPrefix('0XFF').prefix).toBe('0x');
    expect(stripSignAndPrefix('0B101').prefix).toBe('0b');
    expect(stripSignAndPrefix('0O17').prefix).toBe('0o');
  });
});

describe('parseNumericLiteral — signed prefixed inputs', () => {
  it('parses -0xFF, +0x2A, -0b1010, -0o17 with sign and prefix independent', () => {
    expect(parseNumericLiteral('-0xFF')).toMatchObject({ valid: true, isNegative: true, radix: 16, integerDigits: 'FF' });
    expect(parseNumericLiteral('+0x2A')).toMatchObject({ valid: true, isNegative: false, radix: 16, integerDigits: '2A' });
    expect(parseNumericLiteral('-0b1010')).toMatchObject({ valid: true, isNegative: true, radix: 2, integerDigits: '1010' });
    expect(parseNumericLiteral('-0o17')).toMatchObject({ valid: true, isNegative: true, radix: 8, integerDigits: '17' });
  });

  it('a prefix overrides radixHint — explicit notation always wins', () => {
    expect(parseNumericLiteral('0x2A', 2)).toMatchObject({ valid: true, radix: 16, integerDigits: '2A' });
  });

  it('bare values use radixHint, defaulting to 10', () => {
    expect(parseNumericLiteral('42')).toMatchObject({ valid: true, radix: 10, integerDigits: '42' });
    expect(parseNumericLiteral('101', 2)).toMatchObject({ valid: true, radix: 2, integerDigits: '101' });
  });
});

describe('parseNumericLiteral — decimal fractions', () => {
  it('parses negative fractions such as -.5', () => {
    expect(parseNumericLiteral('-.5')).toMatchObject({ valid: true, isNegative: true, integerDigits: '0', fractionDigits: '5' });
  });
  it('parses a trailing-dot integer and a leading-dot fraction', () => {
    expect(parseNumericLiteral('5.')).toMatchObject({ valid: true, integerDigits: '5', fractionDigits: '' });
    expect(parseNumericLiteral('.5')).toMatchObject({ valid: true, integerDigits: '0', fractionDigits: '5' });
  });
  it('parses tiny fractions without truncating any digits', () => {
    const r = parseNumericLiteral('0.0000000000001');
    expect(r.valid).toBe(true);
    expect(r.fractionDigits).toBe('0000000000001');
  });
  it('rejects a lone decimal point, with or without a sign', () => {
    expect(parseNumericLiteral('.').valid).toBe(false);
    expect(parseNumericLiteral('-.').valid).toBe(false);
    expect(parseNumericLiteral('+.').valid).toBe(false);
  });
  it('rejects more than one decimal point', () => {
    expect(parseNumericLiteral('1.2.3').valid).toBe(false);
  });
});

describe('parseNumericLiteral — prefixed fractions', () => {
  it('parses a hexadecimal fraction like 0x2A.8', () => {
    expect(parseNumericLiteral('0x2A.8')).toMatchObject({ valid: true, radix: 16, integerDigits: '2A', fractionDigits: '8' });
  });
  it('parses a binary fraction like 0b101.101', () => {
    expect(parseNumericLiteral('0b101.101')).toMatchObject({ valid: true, radix: 2, integerDigits: '101', fractionDigits: '101' });
  });
  it('parses an octal fraction like 0o17.4', () => {
    expect(parseNumericLiteral('0o17.4')).toMatchObject({ valid: true, radix: 8, integerDigits: '17', fractionDigits: '4' });
  });
  it('parses a signed prefixed fraction', () => {
    expect(parseNumericLiteral('-0x2A.8')).toMatchObject({ valid: true, isNegative: true, radix: 16, integerDigits: '2A', fractionDigits: '8' });
  });
});

describe('parseNumericLiteral — radices 2 through 36', () => {
  it('accepts a valid digit string at every radix from 2 to 36', () => {
    for (let radix = 2; radix <= 36; radix++) {
      const highestDigit = 'ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210'.slice(-radix)[0];
      expect(parseNumericLiteral(highestDigit, radix).valid).toBe(true);
    }
  });
  it('rejects a digit at or above the given radix', () => {
    expect(parseNumericLiteral('2', 2).valid).toBe(false);
    expect(parseNumericLiteral('8', 8).valid).toBe(false);
    expect(parseNumericLiteral('G', 16).valid).toBe(false);
    expect(parseNumericLiteral('C', 12).valid).toBe(false);
  });
  it('rejects an out-of-range radix hint', () => {
    expect(parseNumericLiteral('5', 1).valid).toBe(false);
    expect(parseNumericLiteral('5', 37).valid).toBe(false);
  });
});

describe('parseNumericLiteral — bare/invalid input', () => {
  it('rejects empty input', () => {
    expect(parseNumericLiteral('').valid).toBe(false);
    expect(parseNumericLiteral('   ').valid).toBe(false);
  });
  it('rejects a lone sign', () => {
    expect(parseNumericLiteral('-').valid).toBe(false);
    expect(parseNumericLiteral('+').valid).toBe(false);
  });
  it('every invalid result carries a human-readable reason', () => {
    expect(parseNumericLiteral('G', 16).errorMessage).toBeTruthy();
    expect(parseNumericLiteral('').errorMessage).toBeTruthy();
  });
});

describe('parseSignedIntegerLiteral — exact BigInt, used by the AI intent system', () => {
  it('parses prefixed and signed integers to the exact expected value', () => {
    expect(parseSignedIntegerLiteral('0x2A')).toMatchObject({ valid: true, isNegative: false, radix: 16, value: 42n });
    expect(parseSignedIntegerLiteral('-0xFF')).toMatchObject({ valid: true, isNegative: true, radix: 16, value: 255n });
    expect(parseSignedIntegerLiteral('-0b1010')).toMatchObject({ valid: true, isNegative: true, radix: 2, value: 10n });
    expect(parseSignedIntegerLiteral('-0o17')).toMatchObject({ valid: true, isNegative: true, radix: 8, value: 15n });
    expect(parseSignedIntegerLiteral('-45')).toMatchObject({ valid: true, isNegative: true, radix: 10, value: 45n });
  });

  it('stays exact at 64-bit boundary magnitudes, unlike parseInt', () => {
    // 2^63 - 1: parseInt / Number would already have lost precision before
    // this function is even called, since a plain `number` cannot carry
    // this value exactly. Passed as text, BigInt parsing never loses it.
    const r = parseSignedIntegerLiteral('9223372036854775807');
    expect(r.valid).toBe(true);
    expect(r.value).toBe(9223372036854775807n);
    expect(r.value.toString()).toBe('9223372036854775807'); // would corrupt as a Number

    const negR = parseSignedIntegerLiteral('-9223372036854775808');
    expect(negR.valid).toBe(true);
    expect(negR.isNegative).toBe(true);
    expect(negR.value).toBe(9223372036854775808n);
  });

  it('rejects a fractional literal rather than silently truncating it', () => {
    expect(parseSignedIntegerLiteral('5.5').valid).toBe(false);
  });

  it('rejects what parseInt would silently mis-parse to 0 or a truncated value', () => {
    // The historical bug: parseInt("0x2A", 10) === 0, parseInt("-0xFF", 10) === -0.
    // A canonical parser must not reproduce either failure mode.
    expect(parseSignedIntegerLiteral('0x2A').value).not.toBe(0n);
    expect(parseSignedIntegerLiteral('-0xFF').value).not.toBe(0n);
  });
});
