import { BaseType } from '../types';
import { autoDetectBase, convertNumber, calculateTwosComplement } from './converter';

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

/**
 * Looks for a bare hex value (no 0x prefix, containing at least one A–F
 * letter) sitting immediately next to the literal word "hex"/"hexadecimal" —
 * e.g. "FF hex to binary" or "hex of FF". Deliberately anchored to that
 * word's position rather than scanned across the whole message: plenty of
 * ordinary English words (dead, face, cafe, beef, decade) are technically
 * valid hex digits, so matching one anywhere the word "hex" merely appears
 * in the message would risk treating an unrelated word as a number.
 */
function findBareHexToken(text: string): string | null {
  const hexWordMatch = text.match(/\bhex(?:adecimal)?\b/i);
  if (!hexWordMatch || hexWordMatch.index === undefined) return null;

  const before = text.slice(0, hexWordMatch.index);
  const after = text.slice(hexWordMatch.index + hexWordMatch[0].length);

  const beforeMatch = before.match(/([0-9A-Fa-f]+)\s*$/);
  if (beforeMatch && /[A-Fa-f]/.test(beforeMatch[1])) return beforeMatch[1];

  const afterMatch = after.match(/^\s*(?:of\s+)?([0-9A-Fa-f]+)\b/);
  if (afterMatch && /[A-Fa-f]/.test(afterMatch[1])) return afterMatch[1];

  return null;
}

/** Pulls the first thing that looks like a number token (incl. 0x/0b/0o prefixed or signed). */
function findNumberToken(text: string): string | null {
  const match = text.match(/[-+]?(0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+\.?\d*)/);

  if (!match) {
    // No digit-based token anywhere — the only remaining possibility is a
    // bare hex value like "FF" that's entirely letters, which the pattern
    // above can't match at all (it requires at least one digit).
    return findBareHexToken(text);
  }

  // A digit-based match was found, but it may have been truncated: "2A"
  // only matches as "2" above, since the regex has no way to know "A" was
  // meant to continue the same token. If the very next characters are more
  // hex digits with *zero gap* (so we know it's genuinely one contiguous
  // token, not two separate words) and the message frames this as hex,
  // extend the match rather than silently drop the trailing digits.
  const isAlreadyPrefixed = /^[-+]?0[xX]/.test(match[0]);
  if (!isAlreadyPrefixed && isFramedAsHex(text)) {
    const matchEnd = match.index! + match[0].length;
    const tail = text.slice(matchEnd).match(/^[0-9A-Fa-f]+/);
    if (tail) return match[0] + tail[0];
  }

  return match[0];
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
    // findNumberToken() can never latch onto the width digit by mistake.
    const bitWidthMatch = userMessage.match(/(4|8|16|32|64)\s*-?\s*bit/i);
    const bitWidth = bitWidthMatch
      ? (Number(bitWidthMatch[1]) as 4 | 8 | 16 | 32 | 64)
      : 8;
    const textWithoutBitWidth = bitWidthMatch
      ? userMessage.slice(0, bitWidthMatch.index) +
        userMessage.slice(bitWidthMatch.index! + bitWidthMatch[0].length)
      : userMessage;

    const numberToken = findNumberToken(textWithoutBitWidth);
    if (numberToken) {
      const numValue = parseInt(numberToken, 10);
      if (!Number.isNaN(numValue)) {
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
  const numberToken = findNumberToken(userMessage);
  if (!numberToken) return null;

  const numberIndex = userMessage.indexOf(numberToken);
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
