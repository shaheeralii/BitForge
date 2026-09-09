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
