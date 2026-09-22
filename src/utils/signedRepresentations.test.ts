import { describe, it, expect } from 'vitest';
import {
  getRepresentationRange,
  invertBitString,
  decodeUnsigned,
  decodeSignMagnitude,
  decodeOnesComplement,
  decodeTwosComplement,
  decodeAllRepresentations,
  encodeUnsigned,
  encodeSignMagnitude,
  encodeOnesComplement,
  encodeTwosComplement,
  encodeAllSigned,
  addBitStrings,
  resizeBits,
  getBitGridMeta,
  isNegativeZero,
  formatValueForInput,
  formatValueForDisplay,
  formatRange,
} from './signedRepresentations';

describe('getRepresentationRange', () => {
  it('unsigned 8-bit is 0 to 255', () => {
    expect(getRepresentationRange('unsigned', 8)).toEqual({ min: 0, max: 255 });
  });
  it('sign-magnitude and ones-complement 8-bit are both -127 to 127', () => {
    expect(getRepresentationRange('sign-magnitude', 8)).toEqual({ min: -127, max: 127 });
    expect(getRepresentationRange('ones-complement', 8)).toEqual({ min: -127, max: 127 });
  });
  it('twos-complement 8-bit is -128 to 127 (one extra negative value)', () => {
    expect(getRepresentationRange('twos-complement', 8)).toEqual({ min: -128, max: 127 });
  });
});

describe('invertBitString', () => {
  it('flips every bit', () => {
    expect(invertBitString('00000101')).toBe('11111010');
  });
});

describe('the canonical spec example: -5 in 8 bits', () => {
  it('sign-magnitude of -5 is 10000101', () => {
    expect(encodeSignMagnitude(-5, 8)).toEqual({ valid: true, bits: '10000101' });
  });
  it('ones-complement of -5 is 11111010', () => {
    expect(encodeOnesComplement(-5, 8)).toEqual({ valid: true, bits: '11111010' });
  });
  it('twos-complement of -5 is 11111011', () => {
    expect(encodeTwosComplement(-5, 8)).toEqual({ valid: true, bits: '11111011' });
  });
  it('the three negative encodings of -5 are all different bit patterns (never conflated)', () => {
    const all = encodeAllSigned(-5, 8);
    const patterns = new Set([all['sign-magnitude'].bits, all['ones-complement'].bits, all['twos-complement'].bits]);
    expect(patterns.size).toBe(3);
  });
});

describe('the canonical spec example: -25 in 8 bits (Doc 2)', () => {
  it('sign-magnitude of -25 is 10011001', () => {
    expect(encodeSignMagnitude(-25, 8)).toEqual({ valid: true, bits: '10011001' });
  });
  it('ones-complement of -25 is 11100110', () => {
    expect(encodeOnesComplement(-25, 8)).toEqual({ valid: true, bits: '11100110' });
  });
  it('twos-complement of -25 is 11100111', () => {
    expect(encodeTwosComplement(-25, 8)).toEqual({ valid: true, bits: '11100111' });
  });
});

describe('"Same bits, different meaning" canonical example: 11100111', () => {
  it('decodes to 231 / -103 / -24 / -25 under each system respectively', () => {
    const bits = '11100111';
    expect(decodeUnsigned(bits)).toBe(231);
    expect(decodeSignMagnitude(bits)).toBe(-103);
    expect(decodeOnesComplement(bits)).toBe(-24);
    expect(decodeTwosComplement(bits)).toBe(-25);
    expect(decodeAllRepresentations(bits)).toEqual({
      'unsigned': 231,
      'sign-magnitude': -103,
      'ones-complement': -24,
      'twos-complement': -25,
    });
  });
});

describe('decode/encode round-trip edge cases (8-bit)', () => {
  const cases = [0, 1, 5, 127, -1, -5, -127, -128];

  it('unsigned round-trips for in-range non-negative values', () => {
    for (const v of [0, 1, 5, 127, 255]) {
      const enc = encodeUnsigned(v, 8);
      expect(enc.valid).toBe(true);
      expect(decodeUnsigned(enc.bits)).toBe(v);
    }
  });

  it('sign-magnitude round-trips for values within its range', () => {
    for (const v of cases.filter(v => v >= -127)) {
      const enc = encodeSignMagnitude(v, 8);
      expect(enc.valid).toBe(true);
      expect(decodeSignMagnitude(enc.bits)).toBe(v);
    }
  });

  it('ones-complement round-trips for values within its range', () => {
    for (const v of cases.filter(v => v >= -127)) {
      const enc = encodeOnesComplement(v, 8);
      expect(enc.valid).toBe(true);
      expect(decodeOnesComplement(enc.bits)).toBe(v);
    }
  });

  it('twos-complement round-trips for all values including -128', () => {
    for (const v of cases) {
      const enc = encodeTwosComplement(v, 8);
      expect(enc.valid).toBe(true);
      expect(decodeTwosComplement(enc.bits)).toBe(v);
    }
  });
});

describe('the two zeros of sign-magnitude and ones-complement', () => {
  it('sign-magnitude: 00000000 is +0, 10000000 is -0, both decode sensibly', () => {
    expect(decodeSignMagnitude('00000000')).toBe(0);
    expect(decodeSignMagnitude('10000000')).toBe(-0);
  });
  it('ones-complement: 00000000 is +0, 11111111 is -0', () => {
    expect(decodeOnesComplement('00000000')).toBe(0);
    expect(decodeOnesComplement('11111111')).toBe(-0);
  });
  it('encoding decimal 0 always produces the single canonical +0 pattern, never -0', () => {
    expect(encodeSignMagnitude(0, 8).bits).toBe('00000000');
    expect(encodeOnesComplement(0, 8).bits).toBe('00000000');
  });
});

describe('range boundaries and overflow', () => {
  it('sign-magnitude and ones-complement reject -128 (asymmetric range)', () => {
    expect(encodeSignMagnitude(-128, 8).valid).toBe(false);
    expect(encodeOnesComplement(-128, 8).valid).toBe(false);
  });
  it('twos-complement accepts -128 but not -129', () => {
    expect(encodeTwosComplement(-128, 8).valid).toBe(true);
    expect(encodeTwosComplement(-129, 8).valid).toBe(false);
  });
  it('unsigned rejects negative values and values above 255 (8-bit)', () => {
    expect(encodeUnsigned(-1, 8).valid).toBe(false);
    expect(encodeUnsigned(256, 8).valid).toBe(false);
    expect(encodeUnsigned(255, 8).valid).toBe(true);
  });
  it('every out-of-range encode result includes a human-readable reason', () => {
    expect(encodeTwosComplement(200, 8).reason).toBeTruthy();
  });
});

describe('16-bit and 32-bit generalization', () => {
  it('twos-complement 16-bit range is -32768 to 32767', () => {
    expect(getRepresentationRange('twos-complement', 16)).toEqual({ min: -32768, max: 32767 });
  });
  it('encodes and decodes -1 correctly at 16-bit (all bits set) and 32-bit', () => {
    const enc16 = encodeTwosComplement(-1, 16);
    expect(enc16.bits).toBe('1111111111111111');
    expect(decodeTwosComplement(enc16.bits)).toBe(-1);

    const enc32 = encodeTwosComplement(-1, 32);
    expect(enc32.bits).toBe('11111111111111111111111111111111'.slice(0, 32));
    expect(decodeTwosComplement(enc32.bits)).toBe(-1);
  });
  it('unsigned 32-bit max is 4294967295 and stays precise', () => {
    const enc = encodeUnsigned(4294967295, 32);
    expect(enc.valid).toBe(true);
    expect(decodeUnsigned(enc.bits)).toBe(4294967295);
  });
});

describe('resizeBits preserves value across a bit-width change wherever possible', () => {
  it('twos-complement: growing 8-bit -5 to 16-bit still decodes to -5 (sign-extension)', () => {
    const bits8 = encodeTwosComplement(-5, 8).bits;
    const grown = resizeBits(bits8, 16, 'twos-complement');
    expect(grown).toBe('1111111111111011');
    expect(decodeTwosComplement(grown)).toBe(-5);
  });
  it('ones-complement: growing 8-bit -5 to 16-bit still decodes to -5', () => {
    const bits8 = encodeOnesComplement(-5, 8).bits;
    const grown = resizeBits(bits8, 16, 'ones-complement');
    expect(decodeOnesComplement(grown)).toBe(-5);
  });
  it('sign-magnitude: growing 8-bit -5 to 16-bit still decodes to -5 (zeros inserted after the sign bit)', () => {
    const bits8 = encodeSignMagnitude(-5, 8).bits;
    const grown = resizeBits(bits8, 16, 'sign-magnitude');
    expect(grown).toBe('1000000000000101');
    expect(decodeSignMagnitude(grown)).toBe(-5);
  });
  it('unsigned: growing 8-bit 200 to 16-bit still decodes to 200 (zero-extension)', () => {
    const bits8 = encodeUnsigned(200, 8).bits;
    const grown = resizeBits(bits8, 16, 'unsigned');
    expect(decodeUnsigned(grown)).toBe(200);
  });
  it('shrinking keeps the least-significant bits', () => {
    expect(resizeBits('1111111111111011', 8, 'twos-complement')).toBe('11111011');
  });
  it('no-op when the width is unchanged', () => {
    expect(resizeBits('11111011', 8, 'twos-complement')).toBe('11111011');
  });
});

describe('getBitGridMeta keeps the grid and the panel telling the same story', () => {
  it('unsigned labels every bit with a positive weight and highlights nothing', () => {
    const meta = getBitGridMeta('unsigned', 8);
    expect(meta.labels).toEqual([128, 64, 32, 16, 8, 4, 2, 1]);
    expect(meta.dividerAfterIndex).toBeUndefined();
    expect(meta.highlightIndices).toEqual([]);
  });

  it("two's complement gives the MSB a negative weight, never 128", () => {
    const meta = getBitGridMeta('twos-complement', 8);
    expect(meta.labels).toEqual([-128, 64, 32, 16, 8, 4, 2, 1]);
    expect(meta.labels[0]).not.toBe(128);
    expect(meta.highlightIndices).toEqual([0]);
  });

  it('sign-magnitude marks the MSB as a sign flag with a divider, not as a weight', () => {
    const meta = getBitGridMeta('sign-magnitude', 8);
    expect(meta.labels).toEqual(['S', 64, 32, 16, 8, 4, 2, 1]);
    expect(meta.dividerAfterIndex).toBe(0);
  });

  it("one's complement uses neutral position labels, implying no weighted sum", () => {
    const meta = getBitGridMeta('ones-complement', 8);
    expect(meta.labels).toEqual(['b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1', 'b0']);
    expect(meta.labels.every(l => typeof l === 'string')).toBe(true);
  });

  it('generates correct labels at 16- and 32-bit, not just 8-bit', () => {
    expect(getBitGridMeta('twos-complement', 16).labels[0]).toBe(-32768);
    expect(getBitGridMeta('twos-complement', 32).labels[0]).toBe(-2147483648);
    expect(getBitGridMeta('sign-magnitude', 16).labels).toHaveLength(16);
    expect(getBitGridMeta('sign-magnitude', 16).labels[1]).toBe(16384);
    expect(getBitGridMeta('ones-complement', 32).labels[0]).toBe('b31');
  });

  it('every representation produces exactly one label per bit', () => {
    for (const rep of ['unsigned', 'sign-magnitude', 'ones-complement', 'twos-complement'] as const) {
      for (const width of [8, 16, 32]) {
        expect(getBitGridMeta(rep, width).labels).toHaveLength(width);
      }
    }
  });
});

describe('negative zero is preserved where it genuinely exists', () => {
  it('detects the negative-zero pattern only for sign-magnitude and ones-complement', () => {
    expect(isNegativeZero('10000000', 'sign-magnitude')).toBe(true);
    expect(isNegativeZero('11111111', 'ones-complement')).toBe(true);
    expect(isNegativeZero('00000000', 'sign-magnitude')).toBe(false);
    expect(isNegativeZero('00000000', 'ones-complement')).toBe(false);
  });

  it('never claims a negative zero for unsigned or twos-complement', () => {
    for (const bits of ['00000000', '10000000', '11111111']) {
      expect(isNegativeZero(bits, 'unsigned')).toBe(false);
      expect(isNegativeZero(bits, 'twos-complement')).toBe(false);
    }
  });

  it('works at 16- and 32-bit widths', () => {
    expect(isNegativeZero('1' + '0'.repeat(15), 'sign-magnitude')).toBe(true);
    expect(isNegativeZero('1'.repeat(32), 'ones-complement')).toBe(true);
  });

  it('formats -0 rather than letting JS collapse it to "0"', () => {
    expect((-0).toString()).toBe('0'); // the default behavior being guarded against
    expect(formatValueForInput(-0)).toBe('-0');
    expect(formatValueForDisplay(-0)).toBe('−0');
  });

  it('input formatting stays ASCII so it round-trips through parseInt', () => {
    expect(parseInt(formatValueForInput(-0), 10)).toBe(-0);
    expect(parseInt(formatValueForInput(-25), 10)).toBe(-25);
    expect(parseInt(formatValueForInput(127), 10)).toBe(127);
  });

  it('leaves ordinary values alone', () => {
    expect(formatValueForInput(0)).toBe('0');
    expect(formatValueForInput(-5)).toBe('-5');
    expect(formatValueForDisplay(0)).toBe('0');
  });

  it('decoded negative-zero patterns flow through to the formatters', () => {
    expect(formatValueForDisplay(decodeSignMagnitude('10000000'))).toBe('−0');
    expect(formatValueForDisplay(decodeOnesComplement('11111111'))).toBe('−0');
    expect(formatValueForDisplay(decodeTwosComplement('00000000'))).toBe('0');
  });
});

describe('formatRange', () => {
  it('renders ranges in the arrow form', () => {
    expect(formatRange('twos-complement', 8)).toBe('−128 → +127');
    expect(formatRange('sign-magnitude', 8)).toBe('−127 → +127');
    expect(formatRange('unsigned', 8)).toBe('0 → +255');
  });
  it('scales to wider widths', () => {
    expect(formatRange('twos-complement', 16)).toBe('−32,768 → +32,767');
  });
});

describe('addBitStrings ("Why Two\'s Complement?" demo)', () => {
  it('5 + (-5) in 8-bit twos complement wraps to zero with a discarded carry', () => {
    const five = encodeTwosComplement(5, 8);
    const negFive = encodeTwosComplement(-5, 8);
    const { sumBits, carryOut } = addBitStrings(five.bits, negFive.bits);
    expect(sumBits).toBe('00000000');
    expect(carryOut).toBe('1');
  });
  it('25 + (-25) in 8-bit twos complement wraps to zero', () => {
    const a = encodeTwosComplement(25, 8);
    const b = encodeTwosComplement(-25, 8);
    const { sumBits } = addBitStrings(a.bits, b.bits);
    expect(sumBits).toBe('00000000');
  });
});
