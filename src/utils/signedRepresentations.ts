import { StepDetail } from '../types';
import { calculateTwosComplement } from './converter';

/**
 * Numeric safety range: this module deliberately uses plain `number` and
 * `Math.pow` throughout, not BigInt — unlike `calculateTwosComplement` in
 * converter.ts, which switched fully to BigInt specifically to stay exact at
 * 64-bit magnitudes. That's a correct choice here, not an oversight: the Bit
 * Representation UI this module powers only ever offers 8/16/32-bit widths
 * (see BIT_WIDTHS in BitRepresentationLab.tsx), and every magnitude those
 * widths can produce — up to 2^32 — is trivially exact as a double
 * (Number.MAX_SAFE_INTEGER is 2^53-1). If a 64-bit option is ever added to
 * that UI, this module would need the same BigInt migration
 * calculateTwosComplement already went through — Math.pow(2, 63) - 1 is
 * *not* exactly representable as a double (doubles are 2048 apart at that
 * magnitude, so the subtraction silently rounds back up to 2^63), which is
 * exactly the bug that migration fixed. Constraining the claim here, rather
 * than silently extending this module's `number`-based math to a range it
 * was never verified against, is the deliberate choice — not "it happens to
 * work," but "it isn't asked to do more than it's exact for."
 */

/**
 * The four signed/unsigned interpretation systems taught by the Bit
 * Representation lab. These are genuinely distinct systems (see the
 * `decode*`/`encode*` functions below) — Sign-Magnitude and One's Complement
 * in particular must never be conflated, even though both happen to share
 * the same representable range.
 */
export type RepresentationId = 'unsigned' | 'sign-magnitude' | 'ones-complement' | 'twos-complement';

export const REPRESENTATION_LABELS: Record<RepresentationId, string> = {
  'unsigned': 'Unsigned',
  'sign-magnitude': 'Sign-Magnitude',
  'ones-complement': "One's Complement",
  'twos-complement': "Two's Complement",
};

export interface RangeInfo {
  min: number;
  max: number;
}

/**
 * The representable decimal range for a given system at a given bit width.
 * Sign-Magnitude and One's Complement share the same range — both spend one
 * bit pattern on a redundant second zero, so neither can reach -(2^(n-1)).
 * Two's Complement has no redundant zero, so it uses that pattern for the
 * extra negative value instead.
 */
export function getRepresentationRange(representation: RepresentationId, bitWidth: number): RangeInfo {
  switch (representation) {
    case 'unsigned':
      return { min: 0, max: Math.pow(2, bitWidth) - 1 };
    case 'sign-magnitude':
    case 'ones-complement':
      return { min: -(Math.pow(2, bitWidth - 1) - 1), max: Math.pow(2, bitWidth - 1) - 1 };
    case 'twos-complement':
      return { min: -Math.pow(2, bitWidth - 1), max: Math.pow(2, bitWidth - 1) - 1 };
  }
}

/** Flips every '0' to '1' and every '1' to '0' in a bit string. */
export function invertBitString(bits: string): string {
  return bits.split('').map(b => (b === '0' ? '1' : '0')).join('');
}

export function bitsToHex(bits: string): string {
  return parseInt(bits, 2).toString(16).toUpperCase().padStart(Math.ceil(bits.length / 4), '0');
}

export function bitsToOctal(bits: string): string {
  return parseInt(bits, 2).toString(8);
}

// ---------------------------------------------------------------------------
// Decoding: bits -> decimal, under each system. Decoding never fails — every
// bit pattern has *some* value under every system, which is exactly the
// "same bits, different meaning" lesson.
// ---------------------------------------------------------------------------

export function decodeUnsigned(bits: string): number {
  return parseInt(bits, 2);
}

export function decodeSignMagnitude(bits: string): number {
  const sign = bits[0];
  const magnitude = parseInt(bits.slice(1), 2);
  return sign === '1' ? -magnitude : magnitude;
}

export function decodeOnesComplement(bits: string): number {
  if (bits[0] === '0') return parseInt(bits, 2);
  return -parseInt(invertBitString(bits), 2);
}

export function decodeTwosComplement(bits: string): number {
  const unsigned = parseInt(bits, 2);
  if (bits[0] === '0') return unsigned;
  return unsigned - Math.pow(2, bits.length);
}

export function decodeBits(bits: string, representation: RepresentationId): number {
  switch (representation) {
    case 'unsigned': return decodeUnsigned(bits);
    case 'sign-magnitude': return decodeSignMagnitude(bits);
    case 'ones-complement': return decodeOnesComplement(bits);
    case 'twos-complement': return decodeTwosComplement(bits);
  }
}

/** Decodes the same bit pattern under all four systems at once. */
export function decodeAllRepresentations(bits: string): Record<RepresentationId, number> {
  return {
    'unsigned': decodeUnsigned(bits),
    'sign-magnitude': decodeSignMagnitude(bits),
    'ones-complement': decodeOnesComplement(bits),
    'twos-complement': decodeTwosComplement(bits),
  };
}

// ---------------------------------------------------------------------------
// Encoding: decimal -> bits, under each system. Encoding *can* fail — a
// value can be out of the representable range for the chosen system/width.
// ---------------------------------------------------------------------------

export interface EncodeResult {
  valid: boolean;
  bits: string;
  /** Present when `valid` is false, explaining why. */
  reason?: string;
}

function outOfRange(value: number, range: RangeInfo, bitWidth: number, representation: RepresentationId): EncodeResult {
  return {
    valid: false,
    bits: '',
    reason: `${value} is outside the ${REPRESENTATION_LABELS[representation]} range for ${bitWidth}-bit values [${range.min.toLocaleString()} to ${range.max.toLocaleString()}].`,
  };
}

export function encodeUnsigned(value: number, bitWidth: number): EncodeResult {
  const range = getRepresentationRange('unsigned', bitWidth);
  if (value < range.min || value > range.max) return outOfRange(value, range, bitWidth, 'unsigned');
  return { valid: true, bits: value.toString(2).padStart(bitWidth, '0') };
}

export function encodeSignMagnitude(value: number, bitWidth: number): EncodeResult {
  const range = getRepresentationRange('sign-magnitude', bitWidth);
  if (value < range.min || value > range.max) return outOfRange(value, range, bitWidth, 'sign-magnitude');
  const sign = value < 0 ? '1' : '0';
  const magnitudeBits = Math.abs(value).toString(2).padStart(bitWidth - 1, '0');
  return { valid: true, bits: sign + magnitudeBits };
}

export function encodeOnesComplement(value: number, bitWidth: number): EncodeResult {
  const range = getRepresentationRange('ones-complement', bitWidth);
  if (value < range.min || value > range.max) return outOfRange(value, range, bitWidth, 'ones-complement');
  const positiveBits = Math.abs(value).toString(2).padStart(bitWidth, '0');
  return { valid: true, bits: value < 0 ? invertBitString(positiveBits) : positiveBits };
}

export function encodeTwosComplement(value: number, bitWidth: number): EncodeResult {
  const range = getRepresentationRange('twos-complement', bitWidth);
  if (value < range.min || value > range.max) return outOfRange(value, range, bitWidth, 'twos-complement');
  // Reuses BitForge's existing, already-tested Two's Complement engine rather
  // than re-deriving the same bit pattern a second way.
  const result = calculateTwosComplement(value, bitWidth);
  return { valid: true, bits: result.binaryStr };
}

export function encodeValue(value: number, representation: RepresentationId, bitWidth: number): EncodeResult {
  switch (representation) {
    case 'unsigned': return encodeUnsigned(value, bitWidth);
    case 'sign-magnitude': return encodeSignMagnitude(value, bitWidth);
    case 'ones-complement': return encodeOnesComplement(value, bitWidth);
    case 'twos-complement': return encodeTwosComplement(value, bitWidth);
  }
}

/** Encodes the same decimal value under all three *signed* systems at once — powers the "Same number, different encoding" panel. */
export function encodeAllSigned(value: number, bitWidth: number): Record<'sign-magnitude' | 'ones-complement' | 'twos-complement', EncodeResult> {
  return {
    'sign-magnitude': encodeSignMagnitude(value, bitWidth),
    'ones-complement': encodeOnesComplement(value, bitWidth),
    'twos-complement': encodeTwosComplement(value, bitWidth),
  };
}

// ---------------------------------------------------------------------------
// Positional weights — only Unsigned and Two's Complement have a valid
// direct positional-sum reading (Two's Complement's MSB carries a *negative*
// weight). Sign-Magnitude and One's Complement do not decompose into a
// simple weighted sum and must not be presented as if they do.
// ---------------------------------------------------------------------------

export function getPositionalWeights(bitWidth: number, msbNegative: boolean): number[] {
  return Array.from({ length: bitWidth }, (_, i) => {
    const power = bitWidth - 1 - i;
    const weight = Math.pow(2, power);
    return msbNegative && i === 0 ? -weight : weight;
  });
}

// ---------------------------------------------------------------------------
// Step-by-step derivations for the interpretation panel.
// ---------------------------------------------------------------------------

export function getUnsignedSteps(bits: string): StepDetail[] {
  const weights = getPositionalWeights(bits.length, false);
  const terms = bits.split('').map((b, i) => `${b}\u00d7${weights[i]}`).join(' + ');
  const value = decodeUnsigned(bits);
  return [
    {
      title: 'Sum Every Bit\u2019s Positional Weight',
      type: 'unsigned',
      explanation: 'All bits, including the most significant bit, contribute positive weight. There is no sign bit \u2014 the value is simply the sum of each 1-bit\u2019s weight.',
      equationLines: [terms, `= ${value}`],
      finalResult: value.toString(),
    },
  ];
}

export function getSignMagnitudeSteps(bits: string): StepDetail[] {
  const sign = bits[0];
  const magnitudeBits = bits.slice(1);
  const magnitude = parseInt(magnitudeBits, 2);
  const value = decodeSignMagnitude(bits);
  return [
    {
      title: 'Read the Dedicated Sign Bit',
      type: 'sign_magnitude',
      explanation: `The most significant bit is reserved purely as a sign flag \u2014 it is not part of the magnitude. Here it is ${sign} (${sign === '1' ? 'negative' : 'positive'}).`,
      equationLines: [`Sign bit: ${sign}`, `Magnitude bits: ${magnitudeBits}`],
    },
    {
      title: 'Read the Magnitude Bits',
      type: 'sign_magnitude',
      explanation: `The remaining ${magnitudeBits.length} bits are read as an ordinary unsigned binary number, independent of the sign.`,
      equationLines: [`${magnitudeBits} = ${magnitude}`],
      // formatValueForDisplay, not toString(): sign bit set with a zero
      // magnitude decodes to -0, which default conversion would flatten to
      // "0" and hide one of the two zeros this representation is known for.
      finalResult: formatValueForDisplay(value),
    },
  ];
}

export function getOnesComplementSteps(bits: string): StepDetail[] {
  const isNegative = bits[0] === '1';
  const value = decodeOnesComplement(bits);
  if (!isNegative) {
    return [
      {
        title: 'Positive Pattern \u2014 Read Directly',
        type: 'ones_complement',
        explanation: 'When the MSB is 0, One\u2019s Complement is identical to ordinary unsigned binary \u2014 no inversion is needed.',
        finalResult: value.toString(),
      },
    ];
  }
  const inverted = invertBitString(bits);
  const magnitude = parseInt(inverted, 2);
  return [
    {
      title: 'Invert Every Bit',
      type: 'ones_complement',
      explanation: 'The MSB being 1 signals a negative value. To find its magnitude, invert every bit in the entire pattern \u2014 the whole pattern participates, not just a sign flag.',
      equationLines: [`Stored bits:  ${bits}`, `Inverted:     ${inverted}`],
    },
    {
      title: 'Read the Inverted Pattern as the Magnitude',
      type: 'ones_complement',
      explanation: 'The inverted bits, read as unsigned binary, give the magnitude. The original value is the negative of that magnitude.',
      equationLines: [`${inverted} = ${magnitude}`, `Value = −${magnitude}`],
      // All-ones inverts to zero, giving -0 — preserved rather than
      // collapsed to "0" by default number conversion.
      finalResult: formatValueForDisplay(value),
    },
  ];
}

/** Two's Complement re-derivation for a raw bit pattern (decode direction), independent of `calculateTwosComplement`'s encode-direction steps. */
export function getTwosComplementDecodeSteps(bits: string): StepDetail[] {
  const isNegative = bits[0] === '1';
  const value = decodeTwosComplement(bits);
  const weights = getPositionalWeights(bits.length, true);
  const terms = bits.split('').map((b, i) => `${b}\u00d7(${weights[i]})`).join(' + ');
  if (!isNegative) {
    return [
      {
        title: 'Positive Pattern \u2014 Read Directly',
        type: 'twos_complement',
        explanation: 'When the MSB is 0, Two\u2019s Complement is identical to ordinary unsigned binary.',
        finalResult: value.toString(),
      },
    ];
  }
  return [
    {
      title: 'Weight the MSB Negatively, Then Sum',
      type: 'twos_complement',
      explanation: `Unlike Sign-Magnitude, the MSB is not excluded from the value \u2014 it carries a weight of −${Math.pow(2, bits.length - 1)}. Summing every bit\u2019s (signed) weight gives the value directly, no inversion needed.`,
      equationLines: [terms, `= ${value}`],
      finalResult: value.toString(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Binary addition (for the "Why Two's Complement?" panel) — adds two
// equal-length bit strings and returns the truncated sum plus the bit
// carried out past the width, so a whole-number wraparound can be shown
// honestly rather than asserted in prose.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resizing an existing bit pattern to a new bit width, in a way that
// preserves the *value* under the given representation wherever that's
// mathematically possible (growing width always preserves it; shrinking
// width is inherently lossy and simply keeps the least-significant bits,
// matching prior BitForge Bit Grid behavior).
// ---------------------------------------------------------------------------

export function resizeBits(bits: string, newWidth: number, representation: RepresentationId): string {
  const oldWidth = bits.length;
  if (newWidth === oldWidth) return bits;

  if (newWidth > oldWidth) {
    const growBy = newWidth - oldWidth;
    if (representation === 'sign-magnitude') {
      // Insert new magnitude zeros right after the dedicated sign bit,
      // rather than in front of it (which would silently turn the sign bit
      // into a magnitude bit).
      return bits[0] + '0'.repeat(growBy) + bits.slice(1);
    }
    if (representation === 'ones-complement' || representation === 'twos-complement') {
      // Standard sign-extension: repeating the MSB preserves the value in
      // both systems (provable for One's Complement since inverting a
      // zero-extended positive magnitude is the same as sign-extending the
      // already-inverted bits with 1s).
      return bits[0].repeat(growBy) + bits;
    }
    // Unsigned: zero-extend.
    return '0'.repeat(growBy) + bits;
  }

  // Shrinking is inherently lossy \u2014 keep the least-significant bits.
  return bits.slice(oldWidth - newWidth);
}

// ---------------------------------------------------------------------------
// Presentation metadata. These live in the engine rather than in the
// components so that the main bit grid and the interpretation panel render
// from one definition and cannot drift apart — an earlier revision computed
// labels separately in each place and ended up showing the MSB as `128` in
// the grid while the panel directly below called the same bit `-128`.
// ---------------------------------------------------------------------------

export interface BitGridMeta {
  /** One sub-label per bit cell, MSB first. */
  labels: (string | number)[];
  /** Index after which to draw a divider, or undefined for none. */
  dividerAfterIndex?: number;
  /** Bit indices to render with emphasis. */
  highlightIndices: number[];
}

/**
 * How each bit should be labelled under a given representation.
 *
 * Only Unsigned and Two's Complement decompose into a positional weighted
 * sum, so only those get numeric weights on every bit. Sign-Magnitude labels
 * its MSB as a sign flag (it carries no weight at all) and weights only the
 * magnitude bits. One's Complement gets neutral position labels: its negative
 * values are formed by inverting the whole pattern, so per-bit weights would
 * imply a decomposition that does not hold.
 */
export function getBitGridMeta(representation: RepresentationId, bitWidth: number): BitGridMeta {
  switch (representation) {
    case 'unsigned':
      return { labels: getPositionalWeights(bitWidth, false), highlightIndices: [] };

    case 'twos-complement':
      return { labels: getPositionalWeights(bitWidth, true), highlightIndices: [0] };

    case 'sign-magnitude': {
      // MSB is a dedicated sign flag; the remaining bits carry ordinary
      // positive weights starting one power lower than an unsigned value of
      // the same width would.
      const magnitudeWeights = Array.from({ length: bitWidth - 1 }, (_, i) => Math.pow(2, bitWidth - 2 - i));
      return { labels: ['S', ...magnitudeWeights], dividerAfterIndex: 0, highlightIndices: [0] };
    }

    case 'ones-complement':
      return {
        labels: Array.from({ length: bitWidth }, (_, i) => `b${bitWidth - 1 - i}`),
        highlightIndices: [],
      };
  }
}

/**
 * True when `bits` is the redundant negative-zero pattern for the given
 * representation. Only Sign-Magnitude (sign bit set, magnitude zero) and
 * One's Complement (all ones) have one; Unsigned and Two's Complement have a
 * single zero and must never be shown a -0.
 */
export function isNegativeZero(bits: string, representation: RepresentationId): boolean {
  if (representation === 'sign-magnitude') return bits === '1' + '0'.repeat(bits.length - 1);
  if (representation === 'ones-complement') return bits === '1'.repeat(bits.length);
  return false;
}

/**
 * Decoded value as plain ASCII, safe to place in the denary text input:
 * `parseInt` round-trips it and the user can keep typing.
 *
 * JavaScript's own `(-0).toString()` yields "0", which would erase the
 * distinction between the two zeros the page explicitly teaches, so negative
 * zero is special-cased here rather than left to default conversion.
 */
export function formatValueForInput(value: number): string {
  return Object.is(value, -0) ? '-0' : value.toString();
}

/**
 * Decoded value for read-only display: same negative-zero handling, but with
 * a typographic minus (U+2212) so figures line up with the ranges below.
 * Never use this for input field values — U+2212 does not parse as a number.
 */
export function formatValueForDisplay(value: number): string {
  if (Object.is(value, -0)) return '−0';
  return value < 0 ? `−${Math.abs(value).toLocaleString()}` : value.toLocaleString();
}

/** A representation's range as `−128 → +128`-style display text. */
export function formatRange(representation: RepresentationId, bitWidth: number): string {
  const { min, max } = getRepresentationRange(representation, bitWidth);
  const lo = min < 0 ? `−${Math.abs(min).toLocaleString()}` : min.toLocaleString();
  const hi = max > 0 ? `+${max.toLocaleString()}` : max.toLocaleString();
  return `${lo} → ${hi}`;
}

export function addBitStrings(a: string, b: string): { sumBits: string; carryOut: '0' | '1' } {
  const width = a.length;
  let carry = 0;
  const result: string[] = new Array(width);
  for (let i = width - 1; i >= 0; i--) {
    const bitA = a[i] === '1' ? 1 : 0;
    const bitB = b[i] === '1' ? 1 : 0;
    const sum = bitA + bitB + carry;
    result[i] = (sum % 2).toString();
    carry = sum >= 2 ? 1 : 0;
  }
  return { sumBits: result.join(''), carryOut: carry === 1 ? '1' : '0' };
}
