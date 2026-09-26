import { BaseType } from '../types';
import { autoDetectBase, convertNumber, calculateTwosComplement } from './converter';
import { parseSignedIntegerLiteral } from './numberParsing';

/**
 * BitForge AI is instructed to teach, not to silently guess at arithmetic.
 * Before we ever call the model, we check whether the user's message is a
 * direct, unambiguous ask this app can already compute exactly (a base
 * conversion, or a two's-complement lookup). If so, we run BitForge's own
 * tested conversion engine and hand the model a verified result to explain,
 * instead of asking a language model to do bit-level arithmetic from scratch.
 *
 * This is intentionally conservative: if the message doesn't clearly match
 * one of these shapes, we return null and let the model answer
 * conversationally on its own. It is a fast-path for the common "convert X"
 * / "what's X in binary" style asks, not a full natural-language parser.
 */

const BASE_WORDS: Record<string, BaseType> = {
  binary: '2', bin: '2',
  octal: '8', oct: '8',
  decimal: '10', denary: '10', dec: '10',
  hex: '16', hexadecimal: '16',
};

const BASE_LABELS: Record<BaseType, string> = {
  '2': 'binary', '8': 'octal', '10': 'decimal', '16': 'hexadecimal', custom: 'custom-base',
};

function findBase(text: string): BaseType | null {
  const lower = text.toLowerCase();
  for (const word of Object.keys(BASE_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return BASE_WORDS[word];
  }
  return null;
}

/**
 * Finds a "<base> of" phrase (e.g. "binary of 250", "hex of 45") ending
 * right where the number starts. Returns the matched base and the index
 * where that phrase begins, so the caller can still search whatever text
 * comes before it (rare, but keeps "convert hex of 45" from silently
 * dropping an even-earlier hint).
 */
function findBaseOfPhrase(before: string): { base: BaseType; matchStart: number } | null {
  const match = before.match(/\b(binary|bin|octal|oct|decimal|denary|dec|hexadecimal|hex)\s+of\s*$/i);
  if (!match || match.index === undefined) return null;
  return { base: BASE_WORDS[match[1].toLowerCase()], matchStart: match.index };
}

function isFramedAsHex(text: string): boolean {
  return /\bhex(?:adecimal)?\b/i.test(text);
}

interface TokenMatch {
  token: string;
  /** Index of `token` within the searched text, so callers never have to re-find it. */
  index: number;
}

/**
 * Looks for a bare hex value (no 0x prefix, containing at least one A–F
 * letter) sitting immediately next to the literal word "hex"/"hexadecimal" —
 * e.g. "FF hex to binary", "A5 hex to decimal", "-A5 hex" or "hex of FF".
 * Deliberately anchored to that word's position rather than scanned across
 * the whole message: plenty of ordinary English words (dead, face, cafe,
 * beef, decade) are technically valid hex digits, so matching one anywhere
 * the word "hex" merely appears in the message would risk treating an
 * unrelated word as a number.
 *
 * Two rules keep that anchoring honest:
 *  - The token must START at a token boundary (start of text, or after a
 *    character that is not a letter/digit). Without this, "the code hex"
 *    yielded "de" — the tail of "code" — as if it were a number.
 *  - A single letter is never a bare hex token ("what is a hex value…" must
 *    not read the article "a" as 0xA). Single hex digits are still fine when
 *    written with a prefix (0xA) or a digit-bearing form.
 *
 * A leading sign is captured, not dropped: "-FF hex" previously matched only
 * "FF", silently discarding the negative.
 */
function findBareHexMatch(text: string): TokenMatch | null {
  const hexWordMatch = text.match(/\bhex(?:adecimal)?\b/i);
  if (!hexWordMatch || hexWordMatch.index === undefined) return null;

  const isPlausible = (tok: string) => /[A-Fa-f]/.test(tok) && tok.replace(/^[-+]/, '').length >= 2;

  // Token immediately BEFORE the word: "A5 hex", "-A5 hex".
  const before = text.slice(0, hexWordMatch.index);
  const beforeMatch = before.match(/(^|[^0-9A-Za-z])([-+]?[0-9A-Fa-f]+)\s*$/);
  if (beforeMatch && beforeMatch.index !== undefined && isPlausible(beforeMatch[2])) {
    return { token: beforeMatch[2], index: beforeMatch.index + beforeMatch[1].length };
  }

  // Token immediately AFTER the word: "hex A5", "hex of -A5".
  const afterStart = hexWordMatch.index + hexWordMatch[0].length;
  const afterMatch = text.slice(afterStart).match(/^(\s*(?:of\s+)?)([-+]?[0-9A-Fa-f]+)\b/);
  if (afterMatch && isPlausible(afterMatch[2])) {
    return { token: afterMatch[2], index: afterStart + afterMatch[1].length };
  }

  return null;
}

/**
 * Pulls the first thing that looks like a number token (incl. 0x/0b/0o
 * prefixed or signed, with or without a fractional part), together with its
 * position in the text.
 *
 * Token boundaries matter more than anything else here. A generic digit
 * match must never begin in the MIDDLE of an alphanumeric word: "A5" contains
 * the digit "5", and a regex that simply looks for digits returns 5 — a
 * verified-looking but wrong answer for 0xA5. So every generic match must
 * start at the beginning of the text or after a character that is not a
 * letter, digit or '.' (the '.' exclusion also stops "v1.5" from yielding
 * "5"). Bare hex written next to the word "hex" is recognized first, as one
 * complete token, for the same reason.
 *
 * Order of precedence:
 *  1. A digit-bearing bare hex token framed by "hex" ("A5 hex", "hex of 2A"):
 *     unmistakably one hex literal, and it must win over an unrelated number
 *     elsewhere in the sentence ("A5 hex in 8 bits").
 *  2. The first boundary-respecting generic number (prefixed, fractional or
 *     plain digits), extended over trailing hex digits when framed as hex.
 *  3. A letters-only bare hex token ("FF hex"). This stays a last resort, as
 *     before: letters-only words such as "dec" or "add" sit next to "hex"
 *     in ordinary phrasing ("255 dec hex"), and must not displace a real
 *     number found elsewhere.
 *
 * The digit alternative allows a leading-dot form: `\d+\.\d*` (a mandatory
 * point after digits, so "5." matches too), `\.\d+` (a point with nothing
 * before it), or plain `\d+`.
 */
function findNumberMatch(text: string): TokenMatch | null {
  const framedAsHex = isFramedAsHex(text);
  const bareHex = framedAsHex ? findBareHexMatch(text) : null;

  if (bareHex && /\d/.test(bareHex.token)) return bareHex;

  const fracOrInt = '(?:\\d+\\.\\d*|\\.\\d+|\\d+)';
  const genericRe = new RegExp(
    `(^|[^0-9A-Za-z.])([-+]?(?:0[xX][0-9a-fA-F]+(?:\\.[0-9a-fA-F]+)?|0[bB][01]+(?:\\.[01]+)?|0[oO][0-7]+(?:\\.[0-7]+)?|${fracOrInt}))`,
    'g',
  );
  // A number that is really a bit-width ("8 bit", "16-bit", "32 bits") is a
  // qualifier, not the operand — skip it so "FF hex to 8 bit binary" converts
  // FF rather than reading the 8. (The two's-complement path strips its own
  // width phrase first; this covers the general conversion path.)
  let match: RegExpMatchArray | null = null;
  for (const candidate of text.matchAll(genericRe)) {
    const end = candidate.index! + candidate[0].length;
    if (/^\s*-?\s*bits?\b/i.test(text.slice(end))) continue;
    match = candidate;
    break;
  }

  if (!match) {
    // No digit-based token anywhere — the only remaining possibility is a
    // bare hex value like "FF" that's entirely letters, which the pattern
    // above can't match at all (it requires at least one digit).
    return bareHex;
  }

  const token = match[2];
  const index = match.index! + match[1].length;

  // A digit-based match was found, but it may have been truncated: "2A"
  // only matches as "2" above, since the regex has no way to know "A" was
  // meant to continue the same token. If the very next characters are more
  // hex digits with *zero gap* (so we know it's genuinely one contiguous
  // token, not two separate words) and the message frames this as hex,
  // extend the match rather than silently drop the trailing digits.
  const isAlreadyPrefixed = /^[-+]?0[xX]/.test(token);
  if (!isAlreadyPrefixed && framedAsHex) {
    const tail = text.slice(index + token.length).match(/^[0-9A-Fa-f]+/);
    if (tail) return { token: token + tail[0], index };
  }

  return { token, index };
}

export interface VerifiedContext {
  /** Plain-text summary appended to the prompt as ground truth for the model to explain. */
  summary: string;
}

export function detectVerifiedContext(userMessage: string): VerifiedContext | null {
  const lower = userMessage.toLowerCase();

  // "two's complement of -45" / "twos complement 45 8 bit" / "-45 in two's complement 16-bit"
  // / "8-bit two's complement of -42"
  if (/two'?s?\s*complement/.test(lower)) {
    // Bit width and operand are separate semantic fields and must never be
    // confused. A phrase like "8-bit two's complement of -42" contains two
    // numbers — the width (8) and the operand (-42) — and the width can
    // appear *before* the operand in the message. Find the bit-width phrase
    // first and remove it from the text before looking for the operand, so
    // findNumberMatch() can never latch onto the width digit by mistake.
    const bitWidthMatch = userMessage.match(/(4|8|16|32|64)\s*-?\s*bit/i);
    const bitWidth = bitWidthMatch
      ? (Number(bitWidthMatch[1]) as 4 | 8 | 16 | 32 | 64)
      : 8;
    const textWithoutBitWidth = bitWidthMatch
      ? userMessage.slice(0, bitWidthMatch.index) +
        userMessage.slice(bitWidthMatch.index! + bitWidthMatch[0].length)
      : userMessage;

    const numberToken = findNumberMatch(textWithoutBitWidth)?.token;
    if (numberToken) {
      // parseInt(numberToken, 10) was the original bug this replaced: called
      // with an explicit radix of 10 regardless of what the token actually
      // was, it silently mis-parsed a prefixed token like "0x2A" as 0 and
      // "-0xFF" as -0 (parseInt stops at the first character invalid for
      // the given radix — here, at 'x'). A hardcoded radix of 10 without a
      // prefix was a narrower version of the same mistake: "-FF" (bare hex,
      // reached via findBareHexMatch because the message says "hex") has no
      // prefix for parseSignedIntegerLiteral to detect, so it needs a radix
      // hint from autoDetectBase, same as the general conversion path below.
      // But autoDetectBase's guess must be trusted the same conservative way
      // that path already trusts it: a bare, unprefixed token like "-10" is
      // *also* validly read as binary (autoDetectBase says so, at medium
      // confidence) — trusting that guess unconditionally regressed "twos
      // complement of -10" from meaning decimal -10 to meaning binary -10
      // (= -2) during development of this fix, caught by the existing test
      // for exactly that phrase. Only a *high*-confidence non-decimal guess
      // (an explicit 0x/0b/0o prefix, or letters that are only valid as hex)
      // overrides the conventional decimal default. Every signed 64-bit-range
      // value this can produce is exact BigInt, never a `number` that could
      // have already lost precision before reaching calculateTwosComplement.
      const detected = autoDetectBase(numberToken);
      const radixHint = detected.confidence === 'high' ? Number(detected.detectedBase) || 10 : 10;
      const parsed = parseSignedIntegerLiteral(numberToken, radixHint);
      if (parsed.valid) {
        const numValue = parsed.isNegative ? -parsed.value : parsed.value;
        const result = calculateTwosComplement(numValue, bitWidth);
        if (result.twosComplement) {
          return {
            summary:
              `VERIFIED CALCULATION (from BitForge's own engine, not the model — use this exact result):\n` +
              `Two's complement of ${numValue} at ${bitWidth}-bit width = ${result.twosComplement} ` +
              `(hex: 0x${result.hexStr}).`,
          };
        }
        return {
          summary:
            `VERIFIED CALCULATION: ${numValue} is out of range for signed ${bitWidth}-bit two's complement. ` +
            `Explain the overflow and suggest a wider bit width.`,
        };
      }
    }
    return null;
  }

  // Base conversion, e.g. "convert 45 to binary", "45 in hex", "0x2A to decimal",
  // "convert decimal 10 to hex", "convert 10 hex to decimal", "binary of 250".
  //
  // Source and target are found *positionally*, not by scanning the whole
  // message for any base word: text before the number (and, if a directional
  // word like "to"/"as"/"into"/"in" follows the number, text between the
  // number and that word) is treated as a hint for the SOURCE base; text
  // after the directional word is the TARGET base. This ensures an
  // explicitly stated base is never overridden by auto-detection, and that
  // "convert decimal 10 to hex" can't have its source and target confused
  // just because "decimal" happens to be checked before "hex" in an
  // unordered word list.
  const numberMatch = findNumberMatch(userMessage);
  if (!numberMatch) return null;

  // Use the position the token was actually found at. Re-searching with
  // indexOf(token) could land on an earlier, unrelated occurrence of the same
  // characters (e.g. the "5" of "A5" for the token "5") and split the message
  // into the wrong "before"/"after" halves.
  const { token: numberToken, index: numberIndex } = numberMatch;
  const before = userMessage.slice(0, numberIndex);
  const afterNumber = userMessage.slice(numberIndex + numberToken.length);

  let explicitTargetBase: BaseType | null = null;
  let sourceHintSegment: string;
  let targetSegment: string;

  const ofPhrase = findBaseOfPhrase(before);
  if (ofPhrase) {
    // "<base> of <number>" — the base names the TARGET, not the source
    // (e.g. "hex of 45" means "show 45 in hex", not "45 is in hex").
    explicitTargetBase = ofPhrase.base;
    sourceHintSegment = before.slice(0, ofPhrase.matchStart);
    targetSegment = '';
  } else {
    const directionalMatch = afterNumber.match(/\b(to|as|into|in)\b/i);
    if (directionalMatch && directionalMatch.index !== undefined) {
      sourceHintSegment = before + afterNumber.slice(0, directionalMatch.index);
      targetSegment = afterNumber.slice(directionalMatch.index + directionalMatch[0].length);
    } else {
      // No directional word at all (e.g. "255 hex") — the source can only
      // come from before the number, and the target from right after it.
      sourceHintSegment = before;
      targetSegment = afterNumber;
    }
  }

  const explicitSourceBase = findBase(sourceHintSegment);
  const targetBase = explicitTargetBase ?? findBase(targetSegment);
  if (!targetBase) return null;

  const autoDetected = autoDetectBase(numberToken);
  const sourceBase = explicitSourceBase ?? autoDetected.detectedBase;

  // The verified path must stay conservative, but "conservative" doesn't
  // mean "reject every non-high-confidence guess" — autoDetectBase falls
  // back to decimal for most bare numbers precisely because that's the safe,
  // conventional default when no other base is indicated ("45 in hex",
  // "binary of 250"), and that default deserves trust even at medium
  // confidence. The real risk is the *other* direction: a short pure-0/1
  // string like "10" gets guessed as binary over the far more likely decimal
  // reading, based on weak evidence. That's a genuine ambiguity ("convert 10
  // to hex" could mean decimal 10 or binary 10) and must not be silently
  // resolved and presented with the same confident "VERIFIED" framing as an
  // explicit request — so we only skip the verified path when the guess
  // landed on a non-decimal base without high confidence.
  if (!explicitSourceBase && autoDetected.detectedBase !== '10' && autoDetected.confidence !== 'high') {
    return null;
  }

  // If source and target land on the same base and the source was never
  // explicitly stated, we can't tell what conversion the user actually
  // wants — but showing the value across a few common bases is still useful
  // ground truth, as long as they haven't explicitly named a different
  // source elsewhere in the message.
  if (sourceBase === targetBase && !explicitSourceBase && !/(from|source)/i.test(userMessage)) {
    const toBinary = convertNumber(numberToken, sourceBase, '2');
    const toDecimal = convertNumber(numberToken, sourceBase, '10');
    const toHex = convertNumber(numberToken, sourceBase, '16');
    if (toBinary.isValid) {
      return {
        summary:
          `VERIFIED CALCULATION (from BitForge's own engine, not the model — use these exact results):\n` +
          `${numberToken} (detected as ${BASE_LABELS[sourceBase]}) = ${toBinary.binary} in binary, ` +
          `${toDecimal.denary} in decimal, ${toHex.hexadecimal} in hex.`,
      };
    }
    return null;
  }

  const result = convertNumber(numberToken, sourceBase, targetBase);
  if (!result.isValid) return null;

  const targetValueMap: Record<BaseType, string> = {
    '2': result.binary,
    '8': result.octal,
    '10': result.denary,
    '16': result.hexadecimal,
    custom: result.denary,
  };

  return {
    summary:
      `VERIFIED CALCULATION (from BitForge's own engine, not the model — use this exact result):\n` +
      `${numberToken} (interpreted as ${BASE_LABELS[sourceBase]}${explicitSourceBase ? ', as stated' : ''}) = ${targetValueMap[targetBase]} in ${BASE_LABELS[targetBase]}.`,
  };
}
