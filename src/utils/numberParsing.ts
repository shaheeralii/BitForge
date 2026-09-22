/**
 * Canonical numeric-literal parsing, shared by the converter engine
 * (converter.ts) and the AI intent system (chatIntent.ts). Before this
 * module existed, each had its own ad-hoc sign/prefix/digit handling, and
 * they disagreed: `chatIntent.ts`'s two's-complement path ran
 * `parseInt(token, 10)` on tokens that could be "0x2A" or "-0xFF", silently
 * producing 0 for the former and -0 for the latter. The fix isn't a patch
 * to that one call site — it's routing every "turn this text into an exact
 * signed value" decision through the same code, once.
 */

/** Every digit character this app recognizes, in value order (index = digit value). Supports radix 2 through 36. */
export const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The radix range this app (and JS's own Number/BigInt#toString) supports: 2 through 36. */
export const MIN_RADIX = 2;
export const MAX_RADIX = 36;

/** True for a finite integer radix in the MIN_RADIX–MAX_RADIX range. */
export function isValidRadix(radix: number): boolean {
  return Number.isInteger(radix) && radix >= MIN_RADIX && radix <= MAX_RADIX;
}

export type LiteralPrefix = '' | '0x' | '0b' | '0o';

export interface SignAndPrefix {
  isNegative: boolean;
  /** The recognized prefix, if any — always '' when none was present. */
  prefix: LiteralPrefix;
  /** The radix a recognized prefix implies (16/2/8), or null if there was no prefix. */
  impliedRadix: number | null;
  /** Whatever remains after the sign and prefix are removed — still may contain a '.' and digits. */
  body: string;
}

/**
 * Splits a leading sign and a leading base prefix off of `input`,
 * independently of each other and in that order — sign first, then
 * prefix on whatever's left. This is the one fix every signed-prefix bug in
 * this app traced back to: code that checked for "0x"/"0b"/"0o" at the very
 * start of the string, before removing an optional leading sign, simply
 * never matches "-0xFF" (it starts with '-', not '0'), silently falling
 * through to whatever the caller does with an unrecognized prefix instead
 * of erroring or correctly reading it as negative hex.
 */
export function stripSignAndPrefix(input: string): SignAndPrefix {
  const trimmed = input.trim();
  const signMatch = trimmed.match(/^[-+]/);
  const isNegative = signMatch?.[0] === '-';
  const afterSign = signMatch ? trimmed.slice(1) : trimmed;

  const prefixMatch = afterSign.match(/^(0[xX]|0[bB]|0[oO])/);
  if (!prefixMatch) {
    return { isNegative, prefix: '', impliedRadix: null, body: afterSign };
  }

  const lower = prefixMatch[0].toLowerCase();
  const body = afterSign.slice(prefixMatch[0].length);
  if (lower === '0x') return { isNegative, prefix: '0x', impliedRadix: 16, body };
  if (lower === '0b') return { isNegative, prefix: '0b', impliedRadix: 2, body };
  return { isNegative, prefix: '0o', impliedRadix: 8, body };
}

export interface ParsedNumericLiteral {
  valid: boolean;
  isNegative: boolean;
  /** The radix actually used: the prefix's implied radix takes precedence over `radixHint` when both are present. */
  radix: number;
  prefix: LiteralPrefix;
  /** Digits before the decimal point, uppercased, radix-validated. '0' when the input had none (e.g. ".5"). */
  integerDigits: string;
  /** Digits after the decimal point, uppercased, radix-validated. '' when there was no fractional part. */
  fractionDigits: string;
  errorMessage?: string;
}

function invalid(isNegative: boolean, radix: number, prefix: LiteralPrefix, errorMessage: string): ParsedNumericLiteral {
  return { valid: false, isNegative, radix, prefix, integerDigits: '', fractionDigits: '', errorMessage };
}

/**
 * The canonical numeric-literal parser: sign, prefix, integer digits, and
 * fractional digits are all recognized independently of each other and
 * validated together against one resolved radix. This is the single
 * function both the converter engine and the AI intent system now build on
 * for "what does this text mean as a number" — there is exactly one
 * place in the codebase that decides how a sign combines with a prefix, or
 * what counts as a valid digit for a given radix.
 *
 * `radixHint` supplies the radix when no prefix is present (e.g. a UI's
 * explicit base selector, or an auto-detected source base). A prefix found
 * in the text always wins over the hint — typing "0x2A" while "Binary"
 * happens to be selected still means hexadecimal 2A, not a validation
 * error, matching how every mainstream language treats a literal prefix as
 * authoritative over ambient context.
 */
export function parseNumericLiteral(input: string, radixHint = 10): ParsedNumericLiteral {
  const { isNegative, prefix, impliedRadix, body } = stripSignAndPrefix(input);
  const radix = impliedRadix ?? radixHint;

  if (!isValidRadix(radix)) {
    return invalid(isNegative, radix, prefix, `Radix ${radix} is out of range — must be an integer from ${MIN_RADIX} to ${MAX_RADIX}.`);
  }
  if (!body) {
    return invalid(isNegative, radix, prefix, 'No digits found.');
  }

  const parts = body.split('.');
  if (parts.length > 2) {
    return invalid(isNegative, radix, prefix, 'A number cannot contain more than one decimal point.');
  }

  const [integerPart, fractionPart = ''] = parts;
  // A lone ".", "+.", or "-." has two empty parts and no digits anywhere —
  // reject it, while still allowing ".5" and "5." (exactly one empty part).
  if (!integerPart && !fractionPart) {
    return invalid(isNegative, radix, prefix, 'No digits found.');
  }

  for (const part of parts) {
    for (const ch of part) {
      const digitValue = DIGITS.indexOf(ch.toUpperCase());
      if (digitValue === -1 || digitValue >= radix) {
        return invalid(isNegative, radix, prefix, `'${ch}' is not a valid digit in base ${radix}.`);
      }
    }
  }

  return {
    valid: true,
    isNegative,
    radix,
    prefix,
    integerDigits: (integerPart || '0').toUpperCase(),
    fractionDigits: fractionPart.toUpperCase(),
  };
}

export interface ParsedSignedInteger {
  valid: boolean;
  isNegative: boolean;
  radix: number;
  /** Exact absolute value — apply `isNegative` yourself; BigInt has no signed-zero distinction to lose. */
  value: bigint;
  errorMessage?: string;
}

/**
 * Parses a signed, optionally-prefixed integer literal into an exact BigInt
 * value — no floating point at any point in the pipeline, so it stays
 * exact at any magnitude (this is what makes 64-bit Two's Complement
 * boundary values reliable: the imprecision they're vulnerable to is
 * introduced the moment a large value passes through a plain `number`
 * anywhere upstream, not inside the Two's Complement math itself). Rejects
 * a fractional part rather than silently truncating it — every current
 * caller (the AI's Two's Complement intent) is integer-only by definition,
 * so a fraction in the input means the message wasn't actually asking what
 * the caller assumed.
 */
export function parseSignedIntegerLiteral(input: string, radixHint = 10): ParsedSignedInteger {
  const parsed = parseNumericLiteral(input, radixHint);
  if (!parsed.valid) {
    return { valid: false, isNegative: parsed.isNegative, radix: parsed.radix, value: 0n, errorMessage: parsed.errorMessage };
  }
  if (parsed.fractionDigits) {
    return { valid: false, isNegative: parsed.isNegative, radix: parsed.radix, value: 0n, errorMessage: 'Expected a whole number, not a fraction.' };
  }

  const bigRadix = BigInt(parsed.radix);
  let value = 0n;
  for (const ch of parsed.integerDigits) {
    value = value * bigRadix + BigInt(DIGITS.indexOf(ch));
  }

  return { valid: true, isNegative: parsed.isNegative, radix: parsed.radix, value };
}
