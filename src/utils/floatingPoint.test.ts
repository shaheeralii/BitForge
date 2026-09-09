import { describe, it, expect } from 'vitest';
import {
  decimalToFloatBreakdown, decodeBits, specialValueBits, numberToFloatBreakdown,
  validateCustomFormat, makeCustomFormat, totalBits, biasOf,
  STANDARD_FORMATS, FloatFormat,
} from './floatingPoint';

function groundTruthBits32(n: number): string {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, n);
  return view.getUint32(0).toString(2).padStart(32, '0');
}
function groundTruthBits64(n: number): string {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, n);
  const hi = view.getUint32(0).toString(2).padStart(32, '0');
  const lo = view.getUint32(4).toString(2).padStart(32, '0');
  return hi + lo;
}

function breakdownOf(raw: string, format: FloatFormat) {
  const r = decimalToFloatBreakdown(raw, format);
  if ('error' in r) throw new Error(`unexpected error for ${raw} (${format.label}): ${r.error}`);
  return r;
}

describe('Binary32 - matches DataView ground truth', () => {
  const values = ['13.25', '-13.25', '0.15625', '-6.5', '1', '-1', '0.5', '100.5', '0.1', '1000000', '65504', '0.25'];
  for (const v of values) {
    it(`matches ground truth for ${v}`, () => {
      const r = breakdownOf(v, STANDARD_FORMATS.binary32);
      expect(r.bitString).toBe(groundTruthBits32(Number(v)));
    });
  }

  it('produces the documented 13.25 derivation', () => {
    const r = breakdownOf('13.25', STANDARD_FORMATS.binary32);
    expect(r.signBit).toBe(0);
    expect(r.intPart).toBe('1101');
    expect(r.fracPart).toBe('01');
    expect(r.unbiasedExponent).toBe(3);
    expect(r.biasedExponent).toBe(130);
    expect(r.exponentBits).toBe('10000010');
    expect(r.fractionBits).toBe('10101000000000000000000');
    expect(r.hex).toBe('41540000');
    expect(r.category).toBe('normal');
  });

  it('rounds an overflowing magnitude to infinity', () => {
    const r = breakdownOf('1e40', STANDARD_FORMATS.binary32);
    expect(r.category).toBe('infinity');
  });

  it('classifies a very small value as subnormal', () => {
    const r = breakdownOf('1e-40', STANDARD_FORMATS.binary32);
    expect(r.category).toBe('subnormal');
    expect(r.bitString).toBe(groundTruthBits32(1e-40));
  });

  it('handles zero and negative zero', () => {
    expect(breakdownOf('0', STANDARD_FORMATS.binary32).category).toBe('zero');
    expect(breakdownOf('-0', STANDARD_FORMATS.binary32).signBit).toBe(1);
  });
});

describe('Binary64 - matches DataView ground truth', () => {
  const values = ['13.25', '-6.5', '0.1', '3.141592653589793', '1', '2', '1e300', '1e-300', '123456789.123456'];
  for (const v of values) {
    it(`matches ground truth for ${v}`, () => {
      const r = breakdownOf(v, STANDARD_FORMATS.binary64);
      expect(r.bitString).toBe(groundTruthBits64(Number(v)));
    });
  }

  it('round-trips exactly for any finite double (64-bit IS native double precision)', () => {
    const r = breakdownOf('0.1', STANDARD_FORMATS.binary64);
    expect(r.roundTripPreserved).toBe(true);
    expect(r.conversionChangedValue).toBe(false);
  });
});

describe('Binary16 - matches known bit patterns', () => {
  it('encodes 1.0 as 0x3C00', () => {
    const r = breakdownOf('1', STANDARD_FORMATS.binary16);
    expect(r.hex).toBe('3C00');
  });
  it('encodes -2.0 as 0xC000', () => {
    const r = breakdownOf('-2', STANDARD_FORMATS.binary16);
    expect(r.hex).toBe('C000');
  });
  it('encodes 0.5 as 0x3800', () => {
    const r = breakdownOf('0.5', STANDARD_FORMATS.binary16);
    expect(r.hex).toBe('3800');
  });
  it('rounds 0.1 to the known half-precision pattern 0x2E66', () => {
    const r = breakdownOf('0.1', STANDARD_FORMATS.binary16);
    expect(r.hex).toBe('2E66');
    expect(r.conversionChangedValue).toBe(true);
    expect(r.roundTripPreserved).toBe(false);
  });
  it('overflows to infinity beyond ~65504', () => {
    const r = breakdownOf('70000', STANDARD_FORMATS.binary16);
    expect(r.category).toBe('infinity');
  });
  it('smallest positive subnormal is 2^-24', () => {
    const bits = specialValueBits('subnormal', STANDARD_FORMATS.binary16);
    const decoded = decodeBits(0 as const, bits.slice(1, 6), bits.slice(6), STANDARD_FORMATS.binary16);
    expect(decoded.value).toBeCloseTo(Math.pow(2, -24), 30);
  });
});

describe('Rounding - round-to-nearest-even at the boundary', () => {
  // A custom tiny format (1 sign + 4 exponent + 3 fraction) makes ties easy to construct.
  const fmt = makeCustomFormat(4, 3);

  it('rounds down when below the halfway point', () => {
    // 1 + 1/32 = 1.00001 binary -> fraction bits(3) = 000, guard(4th bit) = 0 -> below half, round down.
    const r = breakdownOf('1.03125', fmt);
    expect(r.fractionBits).toBe('000');
  });

  it('rounds down on exact tie when truncated LSB is already even', () => {
    // 1 + 1/16 = 1.0001 -> fraction bits(3) = 000, guard = 1, sticky = 0 -> tie, LSB=0 (even) -> stays down.
    const r = breakdownOf('1.0625', fmt);
    expect(r.fractionBits).toBe('000');
  });

  it('rounds up on exact tie when truncated LSB is odd (round to even)', () => {
    // 1 + 1/8 + 1/16 = 1.1875 -> binary 1.0011, fraction bits(3) = 001, guard=1, sticky=0 -> tie, LSB=1 -> round up to 010
    const r = breakdownOf('1.1875', fmt);
    expect(r.fractionBits).toBe('010');
  });

  it('rounds up unconditionally when the sticky bit is set (even though not an exact tie)', () => {
    // 1.71875 sits between 1.625 (fraction 101) and 1.75 (fraction 110), closer to 1.75.
    const r = breakdownOf('1.71875', fmt);
    expect(r.fractionBits).toBe('110');
  });

  it('propagates a mantissa-overflow carry into the exponent', () => {
    // All-ones fraction rounding up should bump the exponent by 1.
    // Construct a value just below 2.0 with a fraction that rounds up to 000 with exponent+1.
    const r = breakdownOf('1.99999999999', fmt);
    expect(r.fractionBits).toBe('000');
    // Should now be exponent for 2.0 (e=1), not e=0.
    expect(r.unbiasedExponent).toBe(1);
  });
});

describe('Custom format validation', () => {
  it('accepts the documented 18-bit example (1 sign + 5 exponent + 12 fraction)', () => {
    expect(validateCustomFormat(5, 12)).toBeNull();
    const fmt = makeCustomFormat(5, 12);
    expect(totalBits(fmt)).toBe(18);
  });

  it('rejects non-integer bit widths', () => {
    expect(validateCustomFormat(5.5, 12)).not.toBeNull();
  });

  it('rejects exponent widths outside the allowed range', () => {
    expect(validateCustomFormat(1, 12)).not.toBeNull();
    expect(validateCustomFormat(30, 12)).not.toBeNull();
  });

  it('rejects fraction widths outside the allowed range', () => {
    expect(validateCustomFormat(5, 0)).not.toBeNull();
    expect(validateCustomFormat(5, 100)).not.toBeNull();
  });

  it('computes bias correctly for a custom exponent width', () => {
    expect(biasOf(makeCustomFormat(5, 12))).toBe(15); // 2^(5-1)-1
  });

  it('produces a working breakdown for a custom format', () => {
    const fmt = makeCustomFormat(5, 12);
    const r = breakdownOf('13.25', fmt);
    expect(totalBits(fmt)).toBe(r.bitString.length);
    expect(r.category).toBe('normal');
  });

  it('does not compute hex for bit widths not divisible by 4', () => {
    const fmt = makeCustomFormat(5, 12); // 18 bits total
    const r = breakdownOf('13.25', fmt);
    expect(r.hex).toBeNull();
  });
});

describe('decodeBits - Floating Point -> Decimal', () => {
  it('decodes 1.0 in Binary32', () => {
    const r = decodeBits(0, '01111111', '0'.repeat(23), STANDARD_FORMATS.binary32);
    expect(r.value).toBe(1);
    expect(r.category).toBe('normal');
  });
  it('decodes -0.5 in Binary32', () => {
    const r = decodeBits(1, '01111110', '0'.repeat(23), STANDARD_FORMATS.binary32);
    expect(r.value).toBe(-0.5);
  });
  it('decodes +Infinity', () => {
    const r = decodeBits(0, '11111111', '0'.repeat(23), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('infinity');
    expect(r.value).toBe(Infinity);
  });
  it('decodes NaN', () => {
    const r = decodeBits(0, '11111111', '1' + '0'.repeat(22), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('nan');
    expect(Number.isNaN(r.value)).toBe(true);
  });
  it('decodes zero', () => {
    const r = decodeBits(0, '0'.repeat(8), '0'.repeat(23), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('zero');
    expect(r.value).toBe(0);
  });
  it('round-trips encode -> decode for 13.25', () => {
    const enc = breakdownOf('13.25', STANDARD_FORMATS.binary32);
    const dec = decodeBits(enc.signBit, enc.exponentBits, enc.fractionBits, STANDARD_FORMATS.binary32);
    expect(dec.value).toBe(13.25);
  });
});

describe('specialValueBits', () => {
  const fmt = STANDARD_FORMATS.binary32;
  it('zero decodes to category zero', () => {
    const bits = specialValueBits('zero', fmt);
    const d = decodeBits(0, bits.slice(1, 9), bits.slice(9), fmt);
    expect(d.category).toBe('zero');
  });
  it('negativeInfinity decodes to category infinity with negative value', () => {
    const bits = specialValueBits('negativeInfinity', fmt);
    const d = decodeBits(1, bits.slice(1, 9), bits.slice(9), fmt);
    expect(d.category).toBe('infinity');
    expect(d.value).toBe(-Infinity);
  });
  it('nan decodes to category nan', () => {
    const bits = specialValueBits('nan', fmt);
    const d = decodeBits(0, bits.slice(1, 9), bits.slice(9), fmt);
    expect(d.category).toBe('nan');
  });
  it('subnormal decodes to category subnormal', () => {
    const bits = specialValueBits('subnormal', fmt);
    const d = decodeBits(0, bits.slice(1, 9), bits.slice(9), fmt);
    expect(d.category).toBe('subnormal');
  });
});

describe('Invalid decimal input', () => {
  it('rejects empty input', () => {
    const r = decimalToFloatBreakdown('', STANDARD_FORMATS.binary32);
    expect('error' in r).toBe(true);
  });
  it('rejects non-numeric input', () => {
    const r = decimalToFloatBreakdown('abc', STANDARD_FORMATS.binary32);
    expect('error' in r).toBe(true);
  });
});

describe('Format switching re-encodes the numerical value (does not resize the raw bits)', () => {
  it('Binary32 -> Binary16 preserves the numeric meaning of 13.25', () => {
    const b32 = breakdownOf('13.25', STANDARD_FORMATS.binary32);
    const decodedValue = decodeBits(b32.signBit, b32.exponentBits, b32.fractionBits, STANDARD_FORMATS.binary32).value;
    const reEncoded = numberToFloatBreakdown(decodedValue, String(decodedValue), STANDARD_FORMATS.binary16);
    const direct = breakdownOf('13.25', STANDARD_FORMATS.binary16);
    expect(reEncoded.bitString).toBe(direct.bitString);
    expect(reEncoded.hex).toBe('4AA0'); // known Binary16 pattern for 13.25
  });

  it('Binary16 -> Binary32 preserves the numeric meaning of 13.25', () => {
    const b16 = breakdownOf('13.25', STANDARD_FORMATS.binary16);
    const decodedValue = decodeBits(b16.signBit, b16.exponentBits, b16.fractionBits, STANDARD_FORMATS.binary16).value;
    const reEncoded = numberToFloatBreakdown(decodedValue, String(decodedValue), STANDARD_FORMATS.binary32);
    const direct = breakdownOf('13.25', STANDARD_FORMATS.binary32);
    expect(reEncoded.bitString).toBe(direct.bitString);
  });

  it('switching into a custom format re-encodes rather than truncates', () => {
    const b32 = breakdownOf('0.5', STANDARD_FORMATS.binary32);
    const decodedValue = decodeBits(b32.signBit, b32.exponentBits, b32.fractionBits, STANDARD_FORMATS.binary32).value;
    const custom = makeCustomFormat(5, 12);
    const reEncoded = numberToFloatBreakdown(decodedValue, String(decodedValue), custom);
    expect(decodeBits(reEncoded.signBit, reEncoded.exponentBits, reEncoded.fractionBits, custom).value).toBe(0.5);
  });

  it('preserves negative zero across a format switch', () => {
    const b32 = breakdownOf('-0', STANDARD_FORMATS.binary32);
    const decodedValue = decodeBits(b32.signBit, b32.exponentBits, b32.fractionBits, STANDARD_FORMATS.binary32).value;
    expect(Object.is(decodedValue, -0)).toBe(true);
    const reEncoded = numberToFloatBreakdown(decodedValue, String(decodedValue), STANDARD_FORMATS.binary16);
    expect(reEncoded.signBit).toBe(1);
    expect(reEncoded.category).toBe('zero');
  });

  it('re-encodes special values (Infinity, NaN) directly via numberToFloatBreakdown', () => {
    expect(numberToFloatBreakdown(Infinity, 'Infinity', STANDARD_FORMATS.binary32).category).toBe('infinity');
    expect(numberToFloatBreakdown(-Infinity, '-Infinity', STANDARD_FORMATS.binary32).category).toBe('infinity');
    expect(numberToFloatBreakdown(NaN, 'NaN', STANDARD_FORMATS.binary32).category).toBe('nan');
  });
});

describe('Boundary values', () => {
  it('smallest normal Binary32 value (2^-126) is classified normal', () => {
    const r = breakdownOf(String(Math.pow(2, -126)), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('normal');
    expect(r.biasedExponent).toBe(1);
  });

  it('largest subnormal Binary32 value is classified subnormal', () => {
    // Largest subnormal = (2^23 - 1) / 2^23 * 2^-126
    const largestSubnormal = (Math.pow(2, 23) - 1) / Math.pow(2, 23) * Math.pow(2, -126);
    const r = breakdownOf(String(largestSubnormal), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('subnormal');
    expect(r.biasedExponent).toBe(0);
  });

  it('the subnormal/normal boundary decodes consistently both sides', () => {
    const justBelow = breakdownOf(String(Math.pow(2, -126) - Math.pow(2, -149)), STANDARD_FORMATS.binary32);
    expect(justBelow.category).toBe('subnormal');
    const atBoundary = breakdownOf(String(Math.pow(2, -126)), STANDARD_FORMATS.binary32);
    expect(atBoundary.category).toBe('normal');
  });

  it('overflow: a magnitude beyond the largest finite Binary32 value becomes infinity', () => {
    const r = breakdownOf('3.5e38', STANDARD_FORMATS.binary32);
    expect(r.category).toBe('infinity');
  });

  it('underflow: a magnitude below the smallest subnormal rounds to zero', () => {
    const r = breakdownOf(String(Math.pow(2, -150)), STANDARD_FORMATS.binary32);
    expect(r.category).toBe('zero');
  });
});

describe('Special values via numberToFloatBreakdown for a custom format', () => {
  const custom = makeCustomFormat(5, 10);
  it('zero, infinity, and NaN all resolve correctly for a custom format', () => {
    expect(numberToFloatBreakdown(0, '0', custom).category).toBe('zero');
    expect(numberToFloatBreakdown(Infinity, 'Infinity', custom).category).toBe('infinity');
    expect(numberToFloatBreakdown(NaN, 'NaN', custom).category).toBe('nan');
  });
});

describe('Decode walkthrough steps', () => {
  it('produces the five decode steps in order for a normal value', () => {
    const d = decodeBits(0, '10000010', '10101000000000000000000', STANDARD_FORMATS.binary32);
    expect(d.steps.map(s => s.id)).toEqual(['sign', 'exponent', 'removeBias', 'fraction', 'reconstruct']);
    expect(d.steps.every(s => s.explanation.length > 0)).toBe(true);
  });

  it('encode steps no longer include a separate Final Assembly step', () => {
    const r = breakdownOf('13.25', STANDARD_FORMATS.binary32);
    expect(r.steps.map(s => s.id)).toEqual(['sign', 'binary', 'normalize', 'exponent', 'fraction']);
  });
});
