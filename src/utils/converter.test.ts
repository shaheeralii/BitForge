import { describe, it, expect } from 'vitest';
import {
  autoDetectBase,
  convertNumber,
  sanitizeInput,
  isValidForRadix,
  calculateTwosComplement,
  fractionDigitsToExactDecimal,
  fractionDigitsToExactBase,
  decimalIntToBase,
  isBinaryDecimalAmbiguous,
  describeIncompleteInput,
  convertTypedInput,
  MAX_CONVERTER_INPUT_LENGTH,
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

describe('fractional conversion — tiny nonzero values never silently become zero', () => {
  it('a tiny decimal fraction converting to binary is truncated honestly, not falsely shown as zero', () => {
    // Regression test for the confirmed bug: the old pipeline converted the
    // source fraction to a lossy `number` and stopped early once the
    // running remainder fell under a fixed 1e-12 epsilon. 1e-13's first
    // significant binary digit is around the 43rd fractional bit — far
    // beyond any reasonable display budget — but the *display* must say so
    // honestly (a truncation ellipsis) rather than silently showing "0",
    // which is indistinguishable from the value actually being zero.
    const r = fractionDigitsToExactBase('0000000000001', 10, 2);
    expect(r.isExact).toBe(false);
    expect(r.display).toContain('…');
    expect(r.display).not.toBe('0');
  });

  it('convertNumber reports hasFraction: true for a value this tiny, and shows the honest truncation', () => {
    const r = convertNumber('0.0000000000001', '10', '2');
    expect(r.isValid).toBe(true);
    expect(r.hasFraction).toBe(true);
    expect(r.binary).toContain('…');
    expect(r.binary).not.toBe('0');
  });

  it('a fraction of literal zero digits ("5.0") is correctly reported as having no fraction', () => {
    const r = convertNumber('5.0', '10', '2');
    expect(r.isValid).toBe(true);
    expect(r.hasFraction).toBe(false);
  });
});

describe('fractional conversion — exact across arbitrary source/target radix pairs', () => {
  it('0.5 decimal is exactly 0.1 in binary (single digit, no floating point tail)', () => {
    expect(fractionDigitsToExactBase('5', 10, 2)).toMatchObject({ isExact: true, display: '1' });
  });

  it('0.1 decimal is the well-known repeating binary fraction 0.0(0011)', () => {
    const r = fractionDigitsToExactBase('1', 10, 2);
    expect(r.isExact).toBe(false);
    expect(r.display).toBe('0(0011)');
  });

  it('converts a fraction from one non-decimal radix directly to another (no decimal round-trip precision loss)', () => {
    // 3/7 (source radix 7, digit "3") into base 3
    const r = fractionDigitsToExactBase('3', 7, 3);
    expect(r.digits.length).toBeGreaterThan(0);
    // Exact check: reconstruct the target-base digits back into a ratio
    // over 3^n and confirm it equals 3/7 to within the shown digit budget
    // (i.e. the two ratios agree once put over a common denominator).
    const targetRadix = 3n;
    let reconstructed = 0n;
    for (const ch of r.digits) reconstructed = reconstructed * targetRadix + BigInt('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(ch));
    const denom = targetRadix ** BigInt(r.digits.length);
    // 3/7 ≈ reconstructed/denom — check it's the closest representable value (floor), not off by a float rounding error.
    expect(reconstructed).toBe((3n * denom) / 7n);
  });

  it('a value exact in a custom target radix is marked isExact and has no ellipsis', () => {
    const r = convertNumber('0.5', '10', 'custom', 4); // 0.5 decimal = 0.2 in base 4, exact
    expect(r.isValid).toBe(true);
    expect(r.customBaseValue).not.toContain('…');
  });
});

describe('equation lines never contain HTML (regression: dangerouslySetInnerHTML was removed)', () => {
  it('positional-weight exponents render as Unicode superscript text, not <sup> markup', () => {
    const r = convertNumber('2A.8', '16', '10');
    const allLines = r.steps.flatMap(s => s.equationLines ?? []);
    expect(allLines.some(l => l.includes('¹') || l.includes('⁰') || l.includes('⁻'))).toBe(true);
    for (const line of allLines) {
      expect(line).not.toMatch(/<[a-z]/i);
    }
  });

  it('holds across every step-generating conversion direction', () => {
    const cases: [string, import('../types').BaseType, import('../types').BaseType][] = [
      ['255', '10', '2'],
      ['11111111', '2', '10'],
      ['FF.8', '16', '2'],
      ['777', '8', 'custom'],
    ];
    for (const [input, src, target] of cases) {
      const r = convertNumber(input, src, target, 5);
      const allLines = r.steps.flatMap(s => s.equationLines ?? []);
      for (const line of allLines) {
        expect(line).not.toMatch(/<[a-z]/i);
      }
    }
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

  describe('64-bit boundary values stay exact (BigInt throughout, no float rounding)', () => {
    it('2^63 - 1 (max positive signed 64-bit) round-trips exactly', () => {
      const max64 = 9223372036854775807n;
      const r = calculateTwosComplement(max64, 64);
      expect(r.binaryStr).not.toBe('Overflow');
      expect(r.binaryStr).toBe('0' + '1'.repeat(63));
      expect(BigInt('0b' + r.binaryStr)).toBe(max64);
    });

    it('-2^63 (min negative signed 64-bit) round-trips exactly', () => {
      const min64 = -9223372036854775808n;
      const r = calculateTwosComplement(min64, 64);
      expect(r.binaryStr).not.toBe('Overflow');
      expect(r.binaryStr).toBe('1' + '0'.repeat(63));
    });

    it('2^63 (one past max) and -2^63 - 1 (one past min) correctly overflow at 64-bit', () => {
      expect(calculateTwosComplement(9223372036854775808n, 64).binaryStr).toBe('Overflow');
      expect(calculateTwosComplement(-9223372036854775809n, 64).binaryStr).toBe('Overflow');
    });

    it('the overflow range itself is exact at 64-bit — Math.pow(2,63)-1 as a float would corrupt this boundary', () => {
      // A pre-BigInt implementation computing maxVal as `Math.pow(2,63) - 1`
      // would silently round to 2^63 (doubles are 2048 apart at this
      // magnitude), letting 2^63 itself wrongly pass as "in range".
      expect(calculateTwosComplement(9223372036854775807n, 64).binaryStr).not.toBe('Overflow');
      expect(calculateTwosComplement(9223372036854775808n, 64).binaryStr).toBe('Overflow');
    });

    it('accepts a plain number for small values without requiring BigInt (backward compatible)', () => {
      expect(calculateTwosComplement(-5, 8).twosComplement).toBe('11111011');
    });
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


// ---------------------------------------------------------------------------
// Release hardening: input cap, 0/1 ambiguity, integer negative zero,
// linear-time detection
// ---------------------------------------------------------------------------
describe('MAX_CONVERTER_INPUT_LENGTH', () => {
  it('is 1024 and a maximum-length input converts quickly in every source base', () => {
    expect(MAX_CONVERTER_INPUT_LENGTH).toBe(1024);
    const t = performance.now();
    for (const [base, alphabet] of [['10', '123456789'], ['2', '1'], ['16', 'ABCDEF']] as const) {
      const text = Array.from({ length: MAX_CONVERTER_INPUT_LENGTH }, (_, i) => alphabet[i % alphabet.length]).join('');
      const detected = autoDetectBase(text);
      const r = convertNumber(text, base, '2', 12);
      expect(r.isValid, `${base} x1024`).toBe(true);
      expect(detected.detectedBase).toBeDefined();
    }
    // Worst case is well under a second even on slow CI hardware (measured ~0.1 s).
    expect(performance.now() - t).toBeLessThan(5000);
  });

  it('a 1024-digit custom-radix (base 36) value with a fraction also stays fast', () => {
    const text = 'Z'.repeat(700) + '.' + 'Y'.repeat(323);
    expect(text.length).toBe(1024);
    const t = performance.now();
    const r = convertNumber(text, 'custom', '10', 36);
    expect(r.isValid).toBe(true);
    expect(performance.now() - t).toBeLessThan(5000);
  });
});

describe('autoDetectBase is linear-time on long digit runs followed by a bad character', () => {
  it('rejects 100,000 valid digits + "z" without catastrophic backtracking', () => {
    const t = performance.now();
    for (const digit of ['1', '7', '9', 'F']) {
      const d = autoDetectBase(digit.repeat(100_000) + 'z');
      expect(d.validBases).toEqual(d.validBases); // shape is defined; the point is that it returns at all
    }
    // Previously ~43 s for one of these. Linear scans finish in milliseconds.
    expect(performance.now() - t).toBeLessThan(1500);
  });

  it('keeps the existing detection results', () => {
    const base = (t: string) => autoDetectBase(t).detectedBase;
    expect(base('10')).toBe('2');
    expect(base('1111')).toBe('2');
    expect(base('000001')).toBe('2');
    expect(base('255')).toBe('10');
    expect(base('999')).toBe('10');
    expect(base('123')).toBe('10');
    expect(base('FF')).toBe('16');
    expect(base('dead')).toBe('16');
    expect(base('A5')).toBe('16');
    expect(base('0x10')).toBe('16');
    expect(base('0b10')).toBe('2');
    expect(base('0o10')).toBe('8');
    expect(base('-1010')).toBe('2');
    expect(base('0.1')).toBe('2');
  });
});

describe('isBinaryDecimalAmbiguous', () => {
  const amb = (t: string) => isBinaryDecimalAmbiguous(autoDetectBase(t));

  // Normalised numeric text, so "0.50" and "0.5" (and "-0" / "0") compare equal.
  const norm = (d: string) => {
    let t = d.replace(/^\+/, '');
    if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t === '-0' || t === '' ? '0' : t;
  };
  /** What the converter itself says the same text means in each reading. */
  const readings = (t: string) => ({
    asBinary: norm(convertNumber(t, '2', '10', 12).denary),
    asDecimal: norm(convertNumber(t, '10', '10', 12).denary),
  });

  // The semantic rule, as a table: the notice appears only when the same
  // unprefixed text is valid in both Binary and Decimal AND the two readings
  // are different numbers.
  //
  // NOTE on "01" and "000001": they are listed `false`, i.e. NOT ambiguous.
  // Leading zeros carry no value, so both read as 1 in Binary and in Decimal
  // — exactly like "1", "00" and "1.0", which the same rule (and the same
  // table) treat as unambiguous. The converter's own output for them is
  // asserted below so this can't drift from what the app actually computes.
  const matrix: Array<[string, boolean]> = [
    ['0', false], ['1', false], ['00', false], ['000', false], ['0000', false],
    ['01', false], ['10', true], ['101', true], ['000001', false],
    ['.0', false], ['0.0', false], ['1.0', false], ['00.0', false],
    ['10.0', true], ['.1', true], ['-.1', true], ['+.1', true], ['0.1', true], ['-0.1', true],
  ];

  it.each(matrix)('%s → ambiguous: %s', (text, expected) => {
    expect(amb(text)).toBe(expected);
  });

  it('is ambiguous exactly when Binary and Decimal read the text as different numbers', () => {
    for (const [text, expected] of matrix) {
      const { asBinary, asDecimal } = readings(text);
      expect(asBinary !== asDecimal, `${text}: binary ${asBinary} vs decimal ${asDecimal}`).toBe(expected);
    }
  });

  it('agrees with the converter for EVERY 0/1 string (optional sign, optional point) up to 7 characters', () => {
    const disagreements: string[] = [];
    let checked = 0;
    const visit = (text: string) => {
      const detect = autoDetectBase(text);
      if (detect.detectedBase !== '2' || detect.hasPrefix) return; // only inputs the detector reads as Binary
      checked++;
      const { asBinary, asDecimal } = readings(text);
      const differs = asBinary !== asDecimal;
      if (amb(text) !== differs) disagreements.push(`${text}: binary ${asBinary} vs decimal ${asDecimal}, amb=${amb(text)}`);
    };
    const build = (prefix: string, maxLen: number) => {
      if (prefix) visit(prefix);
      if (maxLen === 0) return;
      for (const ch of ['0', '1', '.']) {
        if (ch === '.' && prefix.includes('.')) continue;
        build(prefix + ch, maxLen - 1);
      }
    };
    for (const sign of ['', '-', '+']) build(sign, 7);
    expect(checked).toBeGreaterThan(1000);
    expect(disagreements).toEqual([]);
  });

  it('flags bare 0/1 text whose Binary and Decimal values differ', () => {
    for (const t of ['10', '11', '100', '101', '1000', '1111', '0010', '10.01', '-101', '+11', '10.0', '1.1', '0.1']) {
      expect(amb(t), t).toBe(true);
    }
  });

  it('flags a fractional 1 (".1" is 0.5 as Binary but 0.1 as Decimal) — regression', () => {
    for (const t of ['.1', '-.1', '+.1', '0.1', '-0.1', '+0.1', '1.1', '.01', '.10']) {
      expect(amb(t), t).toBe(true);
    }
    // The two readings really do differ, which is why the notice must appear.
    expect(convertNumber('.1', '2', '10', 12).denary).toBe('0.5');
    expect(convertNumber('.1', '10', '2', 12).denary).toBe('0.1');
    expect(convertNumber('-.1', '2', '10', 12).denary).toBe('-0.5');
    expect(convertNumber('+.1', '2', '10', 12).denary).toBe('0.5');
  });

  it('does not flag text that means the same number in both readings: zeros, a lone 1, leading/trailing zeros', () => {
    for (const t of [
      '0', '1', '-0', '+0', '-1', '+1', '00', '000', '0000', '-00', '+000',
      '01', '001', '0001', '000001', '-01', '+001',
      '.0', '-.0', '+.0', '0.0', '00.0', '0.00', '-0.0', '+0.0', '1.0', '01.0', '1.00', '-1.0', '+1.00',
    ]) {
      expect(amb(t), t).toBe(false);
      const { asBinary, asDecimal } = readings(t);
      expect(asBinary, `${t} reads the same in both bases`).toBe(asDecimal);
    }
  });

  it('is not changed by a sign: negative and positive forms of a value agree', () => {
    for (const t of ['0', '1', '00', '01', '0.0', '1.0', '10', '101', '10.0', '.1', '0.1', '1.1']) {
      expect(amb('-' + t), '-' + t).toBe(amb(t));
      expect(amb('+' + t), '+' + t).toBe(amb(t));
    }
  });

  it('does not flag prefixed input (the prefix is explicit)', () => {
    for (const t of ['0b1', '0b10', '0B101', '-0b10', '+0b1', '0b.1', '-0b.1', '0b10.1', '0x10', '-0xFF', '0o17']) {
      expect(amb(t), t).toBe(false);
    }
  });

  it('does not flag a bare prefix or other incomplete entry', () => {
    for (const t of ['.', '-', '+', '+.', '-.', '0.', '-0.', '1.', '10.', '0x', '0b', '0o']) {
      expect(amb(t), t).toBe(false);
    }
  });

  it('keeps ".1" auto-detected as Binary rather than silently switching to Decimal', () => {
    for (const t of ['.1', '-.1', '+.1']) {
      expect(autoDetectBase(t).detectedBase, t).toBe('2');
    }
  });

  it('does not flag input that is not made of 0s and 1s, whatever base it resolves to', () => {
    for (const t of ['255', '999', '123', '2', '7', '8.5', '-42', '1.5', '0.25', 'FF', 'dead', 'A5', 'abc', '0x10', '0b10', '0o10', '0b1010', '', ' ']) {
      expect(amb(t), JSON.stringify(t)).toBe(false);
    }
  });

  it('is not triggered by a locked base: the detector result is what the UI consults, and a locked base bypasses it', () => {
    // The UI shows the notice only while auto-detect is in charge
    // (`!isLocked && isBinaryDecimalAmbiguous(autoDetect)`, see
    // ConversionInput.test.tsx for the rendered behaviour). Locking Binary or
    // Decimal changes the *source base*, never the auto-detect result, so the
    // predicate itself stays purely a function of the text.
    expect(amb('10')).toBe(true);
    expect(autoDetectBase('10').detectedBase).toBe('2');
  });

  it('never changes the detected base (Binary stays Binary) or any converted value', () => {
    expect(autoDetectBase('10').detectedBase).toBe('2');
    expect(autoDetectBase('01').detectedBase).toBe('2');
    expect(autoDetectBase('00').detectedBase).toBe('2');
    expect(convertNumber('10', '2', '10', 12).denary).toBe('2');
    expect(convertNumber('10', '10', '2', 12).binary).toBe('1010');
    expect(convertNumber('01', '2', '10', 12).denary).toBe('1');
  });

  it('handles the longest allowed input (1,024 characters) without blowing up', () => {
    const t0 = performance.now();
    expect(amb('1'.repeat(1024))).toBe(true);
    expect(amb('0'.repeat(1024))).toBe(false);
    expect(amb('0'.repeat(1023) + '1')).toBe(false); // 000…01 is just 1
    expect(amb('1' + '0'.repeat(1023))).toBe(true);
    expect(amb('0.' + '0'.repeat(1022) + '1')).toBe(true);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});

describe('integer converter has a single, unsigned zero (-0 is 0)', () => {
  const cases: Array<[string, '2' | '8' | '10' | '16', string]> = [
    ['-0', '10', '0'],
    ['-000', '10', '0'],
    ['-0.0', '10', '0.0'], // same rendering the converter already gives the un-signed "0.0"
    ['-0', '2', '0'],
    ['-0', '8', '0'],
    ['-0', '16', '0'],
    ['-0.0', '2', '0.0'],
    ['-0.0', '16', '0.0'],
    ['+0', '10', '0'],
  ];

  it.each(cases)('%s (base %s) shows no sign in any output base', (text, srcBase, expectedText) => {
    for (const target of ['2', '8', '10', '16', 'custom'] as const) {
      const r = convertNumber(text, srcBase, target, 7);
      expect(r.isValid, `${text} -> ${target}`).toBe(true);
      expect(r.isNegative, `${text} isNegative`).toBe(false);
      for (const out of [r.denary, r.binary, r.octal, r.hexadecimal, r.customBaseValue ?? '0']) {
        expect(out, `${text} -> ${target}: "${out}"`).not.toContain('-');
      }
      expect(r.denary).toBe(expectedText);
      expect(r.binary).toBe(expectedText);
      expect(r.octal).toBe(expectedText);
      expect(r.hexadecimal).toBe(expectedText);
      // The derivation must not narrate a sign either.
      const stepText = JSON.stringify(r.steps);
      expect(stepText).not.toMatch(/-0\b/);
      expect(r.normalizedSource.startsWith('-')).toBe(false);
    }
  });

  it('gives "-0.0" exactly the same output as "0.0"', () => {
    const a = convertNumber('-0.0', '10', '2', 12);
    const b = convertNumber('0.0', '10', '2', 12);
    expect([a.denary, a.binary, a.octal, a.hexadecimal]).toEqual([b.denary, b.binary, b.octal, b.hexadecimal]);
  });

  it('still keeps the sign of genuinely negative values, including tiny ones', () => {
    expect(convertNumber('-1', '10', '2', 12).binary).toBe('-1');
    expect(convertNumber('-0.5', '10', '2', 12).binary).toBe('-0.1');
    expect(convertNumber('-0.0001', '10', '10', 12).isNegative).toBe(true);
    expect(convertNumber('-1', '10', '2', 12).isNegative).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// Incomplete mathematical input: "." "-" "+" "-." "0." "-0." bare prefixes
// ---------------------------------------------------------------------------
describe('describeIncompleteInput', () => {
  it.each([
    ['-', '10', 'sign'],
    ['+', '10', 'sign'],
    ['.', '10', 'point'],
    ['-.', '10', 'point'],
    ['+.', '10', 'point'],
    ['0.', '10', 'trailing-point'],
    ['-0.', '10', 'trailing-point'],
    ['+5.', '10', 'trailing-point'],
    ['101.', '2', 'trailing-point'],
    ['FF.', '16', 'trailing-point'],
    ['0x', '16', 'prefix'],
    ['0X', '16', 'prefix'],
    ['-0x', '16', 'prefix'],
    ['0b', '2', 'prefix'],
    ['0o', '8', 'prefix'],
    ['  0.  ', '10', 'trailing-point'],
  ] as const)('treats %j (base %s) as a temporarily incomplete %s', (text, base, kind) => {
    const r = describeIncompleteInput(text, base);
    expect(r?.kind).toBe(kind);
    expect(r?.message).toMatch(/^Waiting for digits/);
    // The message is neutral: it never claims the input is invalid.
    expect(r?.message).not.toMatch(/invalid|error|characters/i);
  });

  it.each([
    ['', '10'],
    ['   ', '10'],
    ['5', '10'],
    ['.5', '10'],
    ['5.5', '10'],
    ['-0.5', '10'],
    ['0x1F', '16'],
    ['0b1', '2'],
    // genuinely wrong text keeps its real error — not "incomplete"
    ['G.', '10'],
    ['1.2.', '10'],
    ['..', '10'],
    ['2.', '2'],
    ['9.', '8'],
    ['0x', '10'], // a prefix of another base is not that base's incomplete prefix
    ['0b', '16'], // ...and here "0b" is just the hex digits 0 and B (a complete value)
    ['abc', '10'],
    ['-abc', '10'],
    ['1e', '10'],
  ] as const)('does NOT treat %j (base %s) as incomplete', (text, base) => {
    expect(describeIncompleteInput(text, base)).toBeNull();
  });

  it('honours a custom radix for the digits before the trailing point', () => {
    expect(describeIncompleteInput('Z.', 'custom', 36)?.kind).toBe('trailing-point');
    expect(describeIncompleteInput('Z.', 'custom', 12)).toBeNull(); // Z is not a base-12 digit
  });

  it('stays linear on a 1,024-character run before a trailing point', () => {
    const t = performance.now();
    describeIncompleteInput('7'.repeat(MAX_CONVERTER_INPUT_LENGTH - 1) + '.', '10');
    describeIncompleteInput('7'.repeat(MAX_CONVERTER_INPUT_LENGTH - 1) + 'z.', '10');
    expect(performance.now() - t).toBeLessThan(500);
  });
});

describe('convertTypedInput', () => {
  it.each(['.', '-', '+', '+.', '-.', '0.', '-0.', '5.', '0x', '-0b'])(
    'returns a neutral hint and no error for incomplete %j',
    (text) => {
      const base = text.includes('x') ? '16' : text.includes('b') ? '2' : '10';
      const r = convertTypedInput(text, base, '2', 12);
      expect(r.isValid).toBe(false);
      expect(r.errorMessage).toBeUndefined();
      expect(r.incompleteHint).toMatch(/^Waiting for digits/);
      // Never a finished-looking value, and never the literal "Error" marker.
      for (const out of [r.denary, r.binary, r.octal, r.hexadecimal]) {
        expect(out).toBe('');
      }
      expect(r.steps).toEqual([]);
    }
  );

  it('does not silently turn "0." into a valid zero', () => {
    expect(convertTypedInput('0.', '10', '2', 12).isValid).toBe(false);
  });

  it('is identical to convertNumber for everything that is not incomplete', () => {
    for (const [text, base] of [['255.625', '10'], ['-0.5', '10'], ['.1', '2'], ['FF', '16'], ['G.', '10'], ['12', '2'], ['', '10'], ['1.2.', '10']] as const) {
      expect(convertTypedInput(text, base, '2', 12)).toEqual(convertNumber(text, base, '2', 12));
    }
  });

  it('keeps the real error for genuinely invalid text (not the incomplete hint)', () => {
    const r = convertTypedInput('G.', '10', '2', 12);
    expect(r.isValid).toBe(false);
    expect(r.incompleteHint).toBeUndefined();
    expect(r.errorMessage).toMatch(/invalid for Base 10/);
  });

  it('leaves convertNumber itself unchanged ("5." is still accepted there, for the AI intent engine)', () => {
    expect(convertNumber('5.', '10', '2', 12).isValid).toBe(true);
    expect(convertNumber('5.', '10', '2', 12).binary).toBe('101');
  });
});

// ---------------------------------------------------------------------------
// The input cap applied to every pathological shape, through the real
// detect -> convert pipeline (the cap itself lives in App.setInputVal and
// ConversionInput.handleChange; both slice to MAX_CONVERTER_INPUT_LENGTH).
// ---------------------------------------------------------------------------
describe('pathological long input stays bounded and fast after the 1,024 cap', () => {
  const cap = (t: string) => (t.length > MAX_CONVERTER_INPUT_LENGTH ? t.slice(0, MAX_CONVERTER_INPUT_LENGTH) : t);
  const run = (raw: string) => {
    const text = cap(raw);
    const detected = autoDetectBase(text);
    const r = convertTypedInput(text, detected.detectedBase, '2', 12);
    isBinaryDecimalAmbiguous(detected);
    return { text, detected, r };
  };

  const shapes: Array<[string, string]> = [
    ['1,024 plain decimal digits', '7'.repeat(1024)],
    ['1,025 plain decimal digits (trimmed)', '7'.repeat(1025)],
    ['long paste (200,000 digits)', '9'.repeat(200_000)],
    ['long malformed (letters + symbols)', 'zq!@#$%^&*()'.repeat(500)],
    ['long digits ending in an invalid character', '1'.repeat(1023) + 'z'],
    ['long digits with the invalid character past the cap', '1'.repeat(5000) + 'z'],
    ['long negative decimal', '-' + '8'.repeat(1030)],
    ['long fractional decimal', '9'.repeat(500) + '.' + '9'.repeat(600)],
    ['long fractional binary', '1'.repeat(500) + '.' + '1'.repeat(600)],
    ['long prefixed hex', '0x' + 'F'.repeat(2000)],
    ['long prefixed binary', '0b' + '1'.repeat(2000)],
    ['long negative prefixed octal', '-0o' + '7'.repeat(2000)],
    ['long repeated points', '.'.repeat(5000)],
    ['long run ending in a point', '3'.repeat(1030) + '.'],
  ];

  it.each(shapes)('%s', (_label, raw) => {
    const t = performance.now();
    const { text, r } = run(raw);
    expect(text.length).toBeLessThanOrEqual(MAX_CONVERTER_INPUT_LENGTH);
    // Whatever the verdict, the result object is well-formed and was cheap.
    expect(typeof r.isValid).toBe('boolean');
    expect(performance.now() - t).toBeLessThan(5000);
  });

  it('a long input ending in an invalid character is rejected with an error, not hung or accepted', () => {
    const { r } = run('1'.repeat(1023) + 'z');
    expect(r.isValid).toBe(false);
    expect(r.incompleteHint).toBeUndefined();
  });

  it('a negative long value keeps its sign; a prefixed long value converts exactly', () => {
    const neg = run('-' + '8'.repeat(1023));
    expect(neg.r.isValid).toBe(true);
    expect(neg.r.isNegative).toBe(true);
    expect(neg.r.denary.startsWith('-8')).toBe(true);
    const hex = run('0x' + 'F'.repeat(2000));
    expect(hex.text.length).toBe(MAX_CONVERTER_INPUT_LENGTH);
    expect(hex.r.isValid).toBe(true);
    expect(hex.r.binary).toBe('1'.repeat((MAX_CONVERTER_INPUT_LENGTH - 2) * 4));
  });
});
