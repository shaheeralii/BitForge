import { describe, it, expect } from 'vitest';
import {
  parseBinaryOperand,
  addBinary,
  subtractBinary,
  multiplyBinary,
  divideBinary,
  bitsToSignedBigInt,
  bitsToUnsignedBigInt,
} from './binaryOps';

describe('parseBinaryOperand', () => {
  it('accepts a valid binary string and pads to width', () => {
    const r = parseBinaryOperand('101', 8);
    expect(r.valid).toBe(true);
    expect(r.bits).toBe('00000101');
  });

  it('rejects non-binary digits', () => {
    const r = parseBinaryOperand('102', 8);
    expect(r.valid).toBe(false);
  });

  it('rejects empty input', () => {
    const r = parseBinaryOperand('', 8);
    expect(r.valid).toBe(false);
  });

  it('rejects input wider than the selected width', () => {
    const r = parseBinaryOperand('111111111', 8); // 9 bits into an 8-bit width
    expect(r.valid).toBe(false);
  });

  it('strips whitespace and underscore separators', () => {
    const r = parseBinaryOperand('1010 1010', 8);
    expect(r.valid).toBe(true);
    expect(r.bits).toBe('10101010');
  });
});

describe('addBinary', () => {
  it('adds two positive values with no overflow', () => {
    const r = addBinary('00000010', '00000011', 8); // 2 + 3 = 5
    expect(r.resultBits).toBe('00000101');
    expect(r.decimalUnsigned).toBe(5n);
    expect(r.unsignedOverflow).toBe(false);
    expect(r.signedOverflow).toBe(false);
  });

  it('detects unsigned overflow (carry out of the top bit)', () => {
    const r = addBinary('11111111', '00000001', 8); // 255 + 1 wraps to 0
    expect(r.resultBits).toBe('00000000');
    expect(r.unsignedOverflow).toBe(true);
  });

  it('detects signed overflow (two positives summing into the sign bit)', () => {
    const r = addBinary('01111111', '00000001', 8); // 127 + 1 signed overflow
    expect(r.signedOverflow).toBe(true);
    expect(bitsToSignedBigInt(r.resultBits, 8)).toBe(-128n);
  });

  it('correctly adds using two\'s-complement negative operands', () => {
    // -1 + -1 = -2, no signed overflow
    const negOne = '11111111';
    const r = addBinary(negOne, negOne, 8);
    expect(bitsToSignedBigInt(r.resultBits, 8)).toBe(-2n);
    expect(r.signedOverflow).toBe(false);
  });
});

describe('subtractBinary', () => {
  it('subtracts within range with no borrow', () => {
    const r = subtractBinary('00000101', '00000011', 8); // 5 - 3 = 2
    expect(bitsToUnsignedBigInt(r.resultBits)).toBe(2n);
    expect(r.borrow).toBe(false);
  });

  it('flags a borrow when the true difference is negative in unsigned terms', () => {
    const r = subtractBinary('00000011', '00000101', 8); // 3 - 5, unsigned underflow
    expect(r.borrow).toBe(true);
    expect(bitsToSignedBigInt(r.resultBits, 8)).toBe(-2n);
  });

  it('flags signed overflow at the minimum signed boundary', () => {
    // -128 - 1 signed-overflows an 8-bit width
    const minVal = '10000000'; // -128
    const one = '00000001';
    const r = subtractBinary(minVal, one, 8);
    expect(r.signedOverflow).toBe(true);
  });
});

describe('multiplyBinary', () => {
  it('multiplies two small positive values (as unsigned magnitudes)', () => {
    const r = multiplyBinary('00000011', '00000010', 8); // 3 * 2 = 6
    expect(r.decimalUnsigned).toBe(6n);
    expect(r.resultBits).toBe('00000110');
    expect(r.overflow).toBe(false);
  });

  it('reports overflow when the product does not fit in the selected width', () => {
    const r = multiplyBinary('00010000', '00010000', 8); // 16 * 16 = 256, doesn't fit in 8 bits
    expect(r.overflow).toBe(true);
    expect(r.decimalUnsigned).toBe(256n);
  });

  it('produces a full double-width product independent of truncation', () => {
    const r = multiplyBinary('11111111', '11111111', 8); // 255 * 255 = 65025
    expect(r.decimalUnsigned).toBe(65025n);
    expect(BigInt('0b' + r.fullProductBits)).toBe(65025n);
  });

  it('handles multiplying by zero', () => {
    const r = multiplyBinary('00000000', '11111111', 8);
    expect(r.decimalUnsigned).toBe(0n);
  });
});

describe('divideBinary', () => {
  it('divides evenly with no remainder', () => {
    const r = divideBinary('00001000', '00000010', 8); // 8 / 2 = 4 r0
    expect(r.decimalQuotient).toBe(4n);
    expect(r.decimalRemainder).toBe(0n);
    expect(r.divideByZero).toBe(false);
  });

  it('divides with a remainder', () => {
    const r = divideBinary('00001001', '00000010', 8); // 9 / 2 = 4 r1
    expect(r.decimalQuotient).toBe(4n);
    expect(r.decimalRemainder).toBe(1n);
  });

  it('flags division by zero instead of throwing or returning garbage', () => {
    const r = divideBinary('00001001', '00000000', 8);
    expect(r.divideByZero).toBe(true);
    expect(r.decimalQuotient).toBe(0n);
  });

  it('handles a zero dividend', () => {
    const r = divideBinary('00000000', '00000101', 8);
    expect(r.decimalQuotient).toBe(0n);
    expect(r.decimalRemainder).toBe(0n);
  });
});

describe('bitsToSignedBigInt / bitsToUnsignedBigInt', () => {
  it('reads the same bit pattern differently as signed vs unsigned', () => {
    const bits = '11111111'; // 255 unsigned, -1 signed (8-bit)
    expect(bitsToUnsignedBigInt(bits)).toBe(255n);
    expect(bitsToSignedBigInt(bits, 8)).toBe(-1n);
  });

  it('agrees for values with the sign bit clear', () => {
    const bits = '01111111'; // 127 either way
    expect(bitsToUnsignedBigInt(bits)).toBe(127n);
    expect(bitsToSignedBigInt(bits, 8)).toBe(127n);
  });
});

// ---------------------------------------------------------------------------
// Subtraction flag regressions (release hardening). Two real defects were
// found by differential testing against BigInt:
//   1. Borrow was read off the adder's final carry, so it was wrongly "Yes"
//      for every A - 0 (the complement step wraps ~0 + 1 back to 0).
//   2. Signed overflow used the adder's sign-bit carry test, which cannot see
//      that -B does not exist for B = the minimum signed value, so
//      0 - (-128) (= +128, which does not fit in 8 bits) reported no overflow.
// Reference semantics: Borrow = (A < B) unsigned; signed overflow = the true
// signed difference falls outside [-2^(w-1), 2^(w-1) - 1].
// ---------------------------------------------------------------------------
describe('subtractBinary flags — regression + exhaustive reference check', () => {
  const ref = (a: bigint, b: bigint, w: number) => {
    const mask = (1n << BigInt(w)) - 1n;
    const half = 1n << BigInt(w - 1);
    const sa = a >= half ? a - (1n << BigInt(w)) : a;
    const sb = b >= half ? b - (1n << BigInt(w)) : b;
    const trueSigned = sa - sb;
    return {
      result: (a - b) & mask,
      borrow: a < b,
      signedOverflow: trueSigned < -half || trueSigned >= half,
    };
  };
  const bits = (v: bigint, w: number) => v.toString(2).padStart(w, '0');

  it('A - 0 never reports a borrow (all widths)', () => {
    for (const w of [4, 8, 16, 32, 64] as const) {
      const samples = [0n, 1n, (1n << BigInt(w - 1)) - 1n, 1n << BigInt(w - 1), (1n << BigInt(w)) - 1n];
      for (const a of samples) {
        const r = subtractBinary(bits(a, w), '0'.repeat(w), w);
        expect(r.borrow, `${w}-bit ${a} - 0`).toBe(false);
        expect(r.unsignedOverflow).toBe(false);
        expect(r.signedOverflow).toBe(false);
        expect(bitsToUnsignedBigInt(r.resultBits)).toBe(a);
      }
    }
  });

  it('8-bit 0 - (-128) reports signed overflow (result +128 does not fit)', () => {
    const r = subtractBinary('00000000', '10000000', 8);
    expect(r.signedOverflow).toBe(true);
    expect(r.borrow).toBe(true); // 0 < 128 unsigned
    expect(r.resultBits).toBe('10000000'); // wraps to -128
  });

  it('the minimum signed value minus itself is 0 with no signed overflow', () => {
    for (const w of [4, 8, 16, 32, 64] as const) {
      const min = '1' + '0'.repeat(w - 1);
      const r = subtractBinary(min, min, w);
      expect(r.signedOverflow, `${w}-bit`).toBe(false);
      expect(r.borrow).toBe(false);
      expect(bitsToUnsignedBigInt(r.resultBits)).toBe(0n);
    }
  });

  it('classic sign combinations (8-bit)', () => {
    const cases: Array<[string, string, string, boolean]> = [
      // A, B, description, expected signedOverflow
      ['01111111', '11111111', 'positive - negative: 127 - (-1) = 128 overflows', true],
      ['10000000', '00000001', 'negative - positive: -128 - 1 = -129 overflows', true],
      ['00000101', '00000011', 'positive - positive: 5 - 3', false],
      ['11111011', '11111101', 'negative - negative: -5 - (-3) = -2', false],
      ['00000011', '00000101', 'positive - positive, negative result: 3 - 5', false],
      ['11111111', '00000000', 'negative - 0', false],
      ['01111111', '10000000', '127 - (-128) = 255 overflows', true],
      ['11111111', '10000000', '-1 - (-128) = 127 fits', false],
    ];
    for (const [a, b, why, expected] of cases) {
      expect(subtractBinary(a, b, 8).signedOverflow, why).toBe(expected);
    }
  });

  it('matches the BigInt reference for all 256 operand pairs at 4 bits', () => {
    for (let a = 0n; a < 16n; a++) {
      for (let b = 0n; b < 16n; b++) {
        const r = subtractBinary(bits(a, 4), bits(b, 4), 4);
        const e = ref(a, b, 4);
        const label = `${bits(a, 4)} - ${bits(b, 4)}`;
        expect(bitsToUnsignedBigInt(r.resultBits), label).toBe(e.result);
        expect(r.borrow, label + ' borrow').toBe(e.borrow);
        expect(r.unsignedOverflow, label + ' unsignedOverflow').toBe(e.borrow);
        expect(r.signedOverflow, label + ' signedOverflow').toBe(e.signedOverflow);
      }
    }
  });

  it('matches the BigInt reference on a boundary grid at 8/16/32/64 bits', () => {
    for (const w of [8, 16, 32, 64] as const) {
      const W = BigInt(w);
      const half = 1n << (W - 1n);
      const all = (1n << W) - 1n;
      const samples = [0n, 1n, 2n, half - 2n, half - 1n, half, half + 1n, all - 1n, all];
      for (const a of samples) {
        for (const b of samples) {
          const r = subtractBinary(bits(a, w), bits(b, w), w);
          const e = ref(a, b, w);
          const label = `${w}-bit ${a} - ${b}`;
          expect(bitsToUnsignedBigInt(r.resultBits), label).toBe(e.result);
          expect(r.borrow, label + ' borrow').toBe(e.borrow);
          expect(r.signedOverflow, label + ' signedOverflow').toBe(e.signedOverflow);
        }
      }
    }
  });

  it('addition flags are unchanged and still match the reference (exhaustive 4-bit)', () => {
    for (let a = 0n; a < 16n; a++) {
      for (let b = 0n; b < 16n; b++) {
        const r = addBinary(bits(a, 4), bits(b, 4), 4);
        const sa = a >= 8n ? a - 16n : a;
        const sb = b >= 8n ? b - 16n : b;
        expect(r.unsignedOverflow).toBe(a + b > 15n);
        expect(r.signedOverflow).toBe(sa + sb < -8n || sa + sb > 7n);
        expect(r.borrow).toBe(false);
      }
    }
  });

  it('multiplication and division semantics are unchanged (unsigned, fixed width)', () => {
    const m = multiplyBinary('11111111', '11111111', 8);
    expect(m.fullProductBits).toBe('1111111000000001'); // 255 * 255 = 65025 unsigned
    expect(m.resultBits).toBe('00000001');
    const d = divideBinary('11111000', '00000010', 8); // 248 / 2 unsigned, NOT -8 / 2
    expect(d.decimalQuotient).toBe(124n);
  });
});
