export type BinaryOperator = '+' | '-' | '×' | '÷';
export type BitWidth = 4 | 8 | 16 | 32 | 64;

export interface ParsedOperand {
  valid: boolean;
  error?: string;
  bits: string; // exactly `width` chars of '0'/'1', MSB first
  raw: string;
}

export interface AdderRow {
  index: number; // bit position, 0 = LSB
  a: '0' | '1';
  b: '0' | '1';
  carryIn: '0' | '1';
  sum: '0' | '1';
  carryOut: '0' | '1';
}

export interface AddSubResult {
  operator: '+' | '-';
  width: number;
  aBits: string;
  bBits: string;
  bComplementBits?: string; // for subtraction: two's-complement of B that was actually added
  rows: AdderRow[]; // LSB (index 0) first
  resultBits: string; // width bits (overflow beyond width discarded)
  finalCarryOut: '0' | '1';
  unsignedOverflow: boolean; // result didn't fit in `width` unsigned bits
  signedOverflow: boolean; // carryIn to sign bit != carryOut of sign bit
  borrow: boolean; // subtraction only: true if A < B (unsigned)
  decimalUnsigned: bigint;
  decimalSigned: bigint;
}

export interface PartialProductRow {
  index: number; // multiplier bit position, 0 = LSB
  multiplierBit: '0' | '1';
  shiftedBits: string; // (2*width)-bit binary string of (A << index), or all zero
  runningSumBits: string; // (2*width)-bit running accumulation after this row
}

export interface MultiplyResult {
  width: number;
  aBits: string;
  bBits: string;
  rows: PartialProductRow[];
  fullProductBits: string; // 2*width bits, exact
  resultBits: string; // width bits, truncated (low `width` bits of full product)
  overflow: boolean; // true if full product needs more than `width` bits
  decimalUnsigned: bigint;
}

export interface DivisionRow {
  index: number; // step number, processing dividend MSB(0) -> LSB(width-1)
  bitBroughtDown: '0' | '1';
  remainderBeforeShift: string;
  remainderShifted: string; // after shifting left and bringing down the bit
  comparison: 'remainder >= divisor' | 'remainder < divisor';
  remainderAfterSubtract: string;
  quotientBit: '0' | '1';
}

export interface DivideResult {
  width: number;
  aBits: string;
  bBits: string;
  divideByZero: boolean;
  rows: DivisionRow[];
  quotientBits: string; // width bits
  remainderBits: string; // width bits
  decimalQuotient: bigint;
  decimalRemainder: bigint;
}

export type BinaryOpResult =
  | { kind: 'addsub'; data: AddSubResult }
  | { kind: 'multiply'; data: MultiplyResult }
  | { kind: 'divide'; data: DivideResult };

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseBinaryOperand(raw: string, width: BitWidth): ParsedOperand {
  const cleaned = raw.replace(/[\s_]/g, '');
  if (cleaned.length === 0) {
    return { valid: false, error: 'Enter a binary value.', bits: '0'.repeat(width), raw };
  }
  if (!/^[01]+$/.test(cleaned)) {
    return { valid: false, error: 'Only digits 0 and 1 are allowed.', bits: '0'.repeat(width), raw };
  }
  if (cleaned.length > width) {
    return {
      valid: false,
      error: `Value has ${cleaned.length} bits, which exceeds the selected ${width}-bit width.`,
      bits: cleaned.slice(-width),
      raw,
    };
  }
  return { valid: true, bits: cleaned.padStart(width, '0'), raw };
}

export function bitsToUnsignedBigInt(bits: string): bigint {
  return bits.length === 0 ? 0n : BigInt('0b' + bits);
}

export function bitsToSignedBigInt(bits: string, width: number): bigint {
  const u = bitsToUnsignedBigInt(bits);
  const signBit = bits[0];
  return signBit === '1' ? u - (1n << BigInt(width)) : u;
}

export function bigIntToBits(value: bigint, width: number): string {
  const mask = (1n << BigInt(width)) - 1n;
  const masked = value & mask;
  return masked.toString(2).padStart(width, '0');
}

// ---------------------------------------------------------------------------
// Addition / Subtraction (ripple-carry full adder, bit by bit)
// ---------------------------------------------------------------------------

function rippleAdd(aBits: string, bBits: string, width: number): { resultBits: string; rows: AdderRow[]; finalCarryOut: '0' | '1' } {
  const rows: AdderRow[] = [];
  let carry: '0' | '1' = '0';
  const sumChars: string[] = new Array(width);

  for (let i = width - 1; i >= 0; i--) {
    const a = aBits[i] as '0' | '1';
    const b = bBits[i] as '0' | '1';
    const carryIn = carry;
    const total = Number(a) + Number(b) + Number(carryIn);
    const sum = (total % 2) === 1 ? '1' : '0';
    const carryOut = total >= 2 ? '1' : '0';
    sumChars[i] = sum;
    rows.push({ index: width - 1 - i, a, b, carryIn, sum, carryOut: carryOut as '0' | '1' });
    carry = carryOut as '0' | '1';
  }

  return { resultBits: sumChars.join(''), rows, finalCarryOut: carry };
}

export function addBinary(aBits: string, bBits: string, width: number): AddSubResult {
  const { resultBits, rows, finalCarryOut } = rippleAdd(aBits, bBits, width);

  const aVal = bitsToUnsignedBigInt(aBits);
  const bVal = bitsToUnsignedBigInt(bBits);
  const trueSum = aVal + bVal;
  const unsignedOverflow = trueSum >= (1n << BigInt(width));

  // Signed overflow: carry into sign bit differs from carry out of sign bit.
  const signRow = rows[rows.length - 1]; // MSB row (index = width-1, processed last)
  const signedOverflow = signRow.carryIn !== signRow.carryOut;

  return {
    operator: '+',
    width,
    aBits,
    bBits,
    rows,
    resultBits,
    finalCarryOut,
    unsignedOverflow,
    signedOverflow,
    borrow: false,
    decimalUnsigned: bitsToUnsignedBigInt(resultBits),
    decimalSigned: bitsToSignedBigInt(resultBits, width),
  };
}

/** A - B via two's complement: A + (~B + 1), fixed-width. */
export function subtractBinary(aBits: string, bBits: string, width: number): AddSubResult {
  const inverted = bBits.split('').map(c => (c === '0' ? '1' : '0')).join('');
  const one = '0'.repeat(width - 1) + '1';
  const complementStep = rippleAdd(inverted, one, width);
  const bComplementBits = complementStep.resultBits;

  const { resultBits, rows, finalCarryOut } = rippleAdd(aBits, bComplementBits, width);

  const aVal = bitsToUnsignedBigInt(aBits);
  const bVal = bitsToUnsignedBigInt(bBits);
  const unsignedOverflow = aVal < bVal; // true subtraction would go negative in unsigned terms
  const borrow = finalCarryOut === '0'; // no end-around carry => borrow occurred

  const signRow = rows[rows.length - 1];
  const signedOverflow = signRow.carryIn !== signRow.carryOut;

  return {
    operator: '-',
    width,
    aBits,
    bBits,
    bComplementBits,
    rows,
    resultBits,
    finalCarryOut,
    unsignedOverflow,
    signedOverflow,
    borrow,
    decimalUnsigned: bitsToUnsignedBigInt(resultBits),
    decimalSigned: bitsToSignedBigInt(resultBits, width),
  };
}

// ---------------------------------------------------------------------------
// Multiplication (shift-and-add, unsigned magnitudes)
// ---------------------------------------------------------------------------

export function multiplyBinary(aBits: string, bBits: string, width: number): MultiplyResult {
  const doubleWidth = width * 2;
  const aVal = bitsToUnsignedBigInt(aBits);

  const rows: PartialProductRow[] = [];
  let running = 0n;

  for (let i = 0; i < width; i++) {
    const multiplierBit = bBits[width - 1 - i] as '0' | '1';
    const partial = multiplierBit === '1' ? (aVal << BigInt(i)) : 0n;
    running += partial;
    rows.push({
      index: i,
      multiplierBit,
      shiftedBits: bigIntToBits(partial, doubleWidth),
      runningSumBits: bigIntToBits(running, doubleWidth),
    });
  }

  const fullProductBits = bigIntToBits(running, doubleWidth);
  const overflow = running >= (1n << BigInt(width));
  const resultBits = bigIntToBits(running, width);

  return {
    width,
    aBits,
    bBits,
    rows,
    fullProductBits,
    resultBits,
    overflow,
    decimalUnsigned: running,
  };
}

// ---------------------------------------------------------------------------
// Division (restoring binary long division, unsigned magnitudes)
// ---------------------------------------------------------------------------

export function divideBinary(aBits: string, bBits: string, width: number): DivideResult {
  const divisorVal = bitsToUnsignedBigInt(bBits);

  if (divisorVal === 0n) {
    return {
      width,
      aBits,
      bBits,
      divideByZero: true,
      rows: [],
      quotientBits: '0'.repeat(width),
      remainderBits: '0'.repeat(width),
      decimalQuotient: 0n,
      decimalRemainder: 0n,
    };
  }

  const rows: DivisionRow[] = [];
  let remainder = 0n;
  const quotientChars: string[] = [];
  const mask = (1n << BigInt(width)) - 1n;

  for (let i = 0; i < width; i++) {
    const remainderBeforeShift = bigIntToBits(remainder, width);
    const bit = aBits[i] as '0' | '1';
    remainder = ((remainder << 1n) | BigInt(bit)) & ((1n << BigInt(width + 1)) - 1n);
    const remainderShifted = remainder.toString(2).padStart(width + 1, '0');

    if (remainder >= divisorVal) {
      remainder -= divisorVal;
      quotientChars.push('1');
      rows.push({
        index: i,
        bitBroughtDown: bit,
        remainderBeforeShift,
        remainderShifted,
        comparison: 'remainder >= divisor',
        remainderAfterSubtract: remainder.toString(2).padStart(width + 1, '0'),
        quotientBit: '1',
      });
    } else {
      quotientChars.push('0');
      rows.push({
        index: i,
        bitBroughtDown: bit,
        remainderBeforeShift,
        remainderShifted,
        comparison: 'remainder < divisor',
        remainderAfterSubtract: remainder.toString(2).padStart(width + 1, '0'),
        quotientBit: '0',
      });
    }
  }

  const quotientBits = quotientChars.join('').padStart(width, '0').slice(-width);
  const remainderBits = bigIntToBits(remainder & mask, width);

  return {
    width,
    aBits,
    bBits,
    divideByZero: false,
    rows,
    quotientBits,
    remainderBits,
    decimalQuotient: bitsToUnsignedBigInt(quotientBits),
    decimalRemainder: bitsToUnsignedBigInt(remainderBits),
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function computeBinaryOperation(
  aBits: string,
  bBits: string,
  width: number,
  op: BinaryOperator
): BinaryOpResult {
  if (op === '+') return { kind: 'addsub', data: addBinary(aBits, bBits, width) };
  if (op === '-') return { kind: 'addsub', data: subtractBinary(aBits, bBits, width) };
  if (op === '×') return { kind: 'multiply', data: multiplyBinary(aBits, bBits, width) };
  return { kind: 'divide', data: divideBinary(aBits, bBits, width) };
}
