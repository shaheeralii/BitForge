import { describe, it, expect } from 'vitest';
import { detectVerifiedContext } from './chatIntent';

describe('detectVerifiedContext — two\'s complement requests', () => {
  it('does not confuse the bit width with the operand when width comes first', () => {
    // Regression test for the confirmed bug: findNumberToken() used to grab
    // the "8" from "8-bit" instead of the actual operand "-42".
    const ctx = detectVerifiedContext("8-bit two's complement of -42");
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-42');
    expect(ctx!.summary).toContain('8-bit');
    expect(ctx!.summary).not.toMatch(/of 8 at/i);
  });

  it('extracts bit width correctly when it comes after the operand', () => {
    const ctx = detectVerifiedContext("two's complement of -45 16-bit");
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-45');
    expect(ctx!.summary).toContain('16-bit');
  });

  it('defaults to 8-bit when no width is specified', () => {
    const ctx = detectVerifiedContext("two's complement of -45");
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('8-bit');
  });

  it('handles every supported bit width, before or after the operand', () => {
    for (const width of [4, 8, 16, 32, 64] as const) {
      const before = detectVerifiedContext(`${width}-bit twos complement of 5`);
      expect(before!.summary).toContain(`${width}-bit`);

      const after = detectVerifiedContext(`twos complement of 5, ${width}-bit`);
      expect(after!.summary).toContain(`${width}-bit`);
    }
  });

  it('handles zero and positive values', () => {
    expect(detectVerifiedContext("two's complement of 0")!.summary).toContain('0');
    expect(detectVerifiedContext("two's complement of 45")!.summary).toContain('45');
  });

  it('surfaces overflow as a verified (not silently wrong) result', () => {
    const ctx = detectVerifiedContext("8-bit two's complement of 200");
    expect(ctx).not.toBeNull();
    expect(ctx!.summary.toLowerCase()).toContain('out of range');
  });

  it('accepts "twos complement" without the apostrophe', () => {
    const ctx = detectVerifiedContext('twos complement of -10');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-10');
  });

  describe('signed, prefixed operands (regression: parseInt(token, 10) used to silently mis-parse these)', () => {
    it('0x-prefixed operand: "two\'s complement of 0x2A"', () => {
      // parseInt("0x2A", 10) === 0 — the historical bug. 0x2A is 42.
      const ctx = detectVerifiedContext("two's complement of 0x2A");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('42');
      expect(ctx!.summary).not.toMatch(/of 0 at/i);
    });

    it('negative 0x-prefixed operand: "8-bit two\'s complement of -0xFF"', () => {
      // parseInt("-0xFF", 10) === -0 — the other half of the historical bug.
      // -0xFF (-255) is out of the signed 8-bit range, so this must surface
      // as a verified overflow for -255, not silently succeed for 0.
      const ctx = detectVerifiedContext("8-bit two's complement of -0xFF");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary.toLowerCase()).toContain('out of range');
      expect(ctx!.summary).toContain('-255');
    });

    it('negative 0x-prefixed operand that fits: "16-bit two\'s complement of -0xFF"', () => {
      const ctx = detectVerifiedContext("16-bit two's complement of -0xFF");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-255');
      expect(ctx!.summary).toMatch(/=\s*1111111100000001/);
    });

    it('0b-prefixed operand: "two\'s complement of 0b1010"', () => {
      const ctx = detectVerifiedContext("two's complement of 0b1010");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('10');
    });

    it('negative 0b-prefixed operand: "two\'s complement of -0b1010"', () => {
      const ctx = detectVerifiedContext("two's complement of -0b1010");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-10');
    });

    it('0o-prefixed operand: "two\'s complement of 0o17"', () => {
      const ctx = detectVerifiedContext("two's complement of 0o17");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('15');
    });

    it('negative 0o-prefixed operand: "two\'s complement of -0o17"', () => {
      const ctx = detectVerifiedContext("two's complement of -0o17");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-15');
    });
  });

  describe('64-bit boundary operands stay exact', () => {
    it('2^63 - 1 at 64-bit', () => {
      const ctx = detectVerifiedContext("64-bit two's complement of 9223372036854775807");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('9223372036854775807');
      expect(ctx!.summary.toLowerCase()).not.toContain('out of range');
    });

    it('-2^63 at 64-bit', () => {
      const ctx = detectVerifiedContext("64-bit two's complement of -9223372036854775808");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-9223372036854775808');
      expect(ctx!.summary.toLowerCase()).not.toContain('out of range');
    });

    it('2^63 (one past max) correctly overflows at 64-bit', () => {
      const ctx = detectVerifiedContext("64-bit two's complement of 9223372036854775808");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary.toLowerCase()).toContain('out of range');
    });
  });

  describe('bare-hex operand with a sign (regression: the sign was silently dropped)', () => {
    it('"-FF" framed as hex is read as -255, not 255 or 0', () => {
      // findBareHexToken previously matched only "FF" — the leading sign,
      // sitting right before it in the source text, was simply never
      // captured by that regex, so this silently became a request about
      // +255 instead of -255.
      const ctx = detectVerifiedContext("8-bit two's complement of -FF hex");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-255');
      expect(ctx!.summary.toLowerCase()).toContain('out of range'); // -255 doesn't fit in signed 8-bit
    });

    it('"-FF" at a width where it fits computes the correct bit pattern', () => {
      const ctx = detectVerifiedContext("16-bit two's complement of -FF hex");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-255');
      expect(ctx!.summary).toMatch(/=\s*1111111100000001/);
    });
  });

  describe('regression: an ambiguous bare operand must still default to decimal', () => {
    it('"twos complement of -10" means decimal -10, not binary -10 (-2) — caught during this fix’s own development', () => {
      // autoDetectBase legitimately reports "10" as *also* readable as
      // binary, at medium confidence (it's composed entirely of 0s and 1s).
      // Routing the two's-complement path through autoDetectBase to fix the
      // "-FF" case above must not start trusting that medium-confidence
      // guess over the conventional decimal default — doing so was an actual
      // regression introduced and caught while building this exact fix.
      const ctx = detectVerifiedContext('twos complement of -10');
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-10');
      expect(ctx!.summary).not.toContain('-2 ');
    });

    it('a genuinely high-confidence bare hex reading (contains a letter) still overrides the decimal default', () => {
      const ctx = detectVerifiedContext("two's complement of -FF hex");
      expect(ctx).not.toBeNull();
      expect(ctx!.summary).toContain('-255');
    });
  });
});

describe('findNumberToken via detectVerifiedContext — locating fractions in free text', () => {
  // The old token-finding regex required at least one digit *before* the
  // decimal point (`\d+\.?\d*`), so it could not locate ".5" or "-.5" as a
  // token at all — not "misinterpreted", never found. These exercise the
  // full base-conversion path so a failure here would be as visible as the
  // bug actually was (the AI silently falling through to an ungrounded,
  // unverified answer).
  it('locates and parses "-.5"', () => {
    const ctx = detectVerifiedContext('what is -.5 in binary');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-0.1');
  });

  it('locates and parses ".5"', () => {
    const ctx = detectVerifiedContext('convert .5 to binary');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('0.1');
  });

  it('locates and parses a trailing-dot integer like "5."', () => {
    const ctx = detectVerifiedContext('convert 5. to binary');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('101');
  });

  it('locates a hexadecimal fraction as one token, e.g. "0x2A.8"', () => {
    const ctx = detectVerifiedContext('convert 0x2A.8 to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('42.5');
  });

  it('locates a signed prefixed fraction, e.g. "-0x2A.8"', () => {
    const ctx = detectVerifiedContext('convert -0x2A.8 to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-42.5');
  });

  it('locates a binary fraction, e.g. "0b101.101"', () => {
    const ctx = detectVerifiedContext('convert 0b101.101 to decimal');
    expect(ctx).not.toBeNull();
    // 0b101.101 = 5 + 5/8 = 5.625
    expect(ctx!.summary).toContain('5.625');
  });

  it('locates an octal fraction, e.g. "0o17.4"', () => {
    const ctx = detectVerifiedContext('convert 0o17.4 to decimal');
    expect(ctx).not.toBeNull();
    // 0o17.4 = 15 + 4/8 = 15.5
    expect(ctx!.summary).toContain('15.5');
  });
});

describe('detectVerifiedContext — base conversion requests', () => {
  it('handles an explicit source and target base', () => {
    const ctx = detectVerifiedContext('convert decimal 45 to binary');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('101101');
  });

  it('treats an unambiguous 0x-prefixed value as verified', () => {
    const ctx = detectVerifiedContext('convert 0x2A to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('42');
  });

  it('treats a negative 0x-prefixed value as verified, sign and prefix independent', () => {
    // Regression test: autoDetectBase used to check for a "0x" prefix at
    // the very start of the string, before stripping a leading sign, so
    // "-0xFF" fell through to bare-digit heuristics entirely.
    const ctx = detectVerifiedContext('convert -0xFF to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('-255');
  });

  it('treats a value containing hex-only letters as verified', () => {
    const ctx = detectVerifiedContext('convert FF hex to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('255');
  });

  it('returns null for a genuinely ambiguous source base instead of guessing', () => {
    // Regression test for the confirmed bug: "10" could be decimal or
    // binary, and autoDetectBase only gives 'medium' confidence here. This
    // must not be silently labeled a "VERIFIED CALCULATION".
    const ctx = detectVerifiedContext('convert 10 to hex');
    expect(ctx).toBeNull();
  });

  it('still resolves when the ambiguous number has an explicit source base', () => {
    const ctx = detectVerifiedContext('convert decimal 10 to hex');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('A'); // 10 decimal = A hex
  });

  it('handles "<base> of <value>" phrasing', () => {
    const ctx = detectVerifiedContext('binary of 250');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('11111010');
  });

  it('handles "<value> in <base>" phrasing', () => {
    const ctx = detectVerifiedContext('45 in hex');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('2D');
  });

  it('handles reversed "convert <value> <base> to <base>" phrasing', () => {
    const ctx = detectVerifiedContext('convert 10 hex to decimal');
    expect(ctx).not.toBeNull();
    expect(ctx!.summary).toContain('16');
  });

  it('shows multi-base output when source and target words match and the value is unambiguous', () => {
    const ctx = detectVerifiedContext('what is 0xFF in hex');
    // source and target both resolve to hex here; still a valid, unambiguous request
    expect(ctx).not.toBeNull();
  });

  it('returns null when no target base is mentioned at all', () => {
    const ctx = detectVerifiedContext('what is the meaning of 42');
    expect(ctx).toBeNull();
  });

  it('returns null for messages with no operand', () => {
    const ctx = detectVerifiedContext('how does binary work?');
    expect(ctx).toBeNull();
  });

  it('returns null for an invalid conversion (bad digit for the stated base)', () => {
    const ctx = detectVerifiedContext('convert binary 129 to decimal'); // '9' invalid in binary
    expect(ctx).toBeNull();
  });

  it('does not crash on empty input', () => {
    expect(detectVerifiedContext('')).toBeNull();
  });
});

describe('bare hex tokens are recognized whole (Copilot finding: "A5" was read as 5)', () => {
  const summaryOf = (msg: string) => detectVerifiedContext(msg)?.summary ?? null;

  describe('conversion requests framed with the word "hex"', () => {
    it('"convert A5 hex to decimal" -> 165 (not 5)', () => {
      const s = summaryOf('convert A5 hex to decimal');
      expect(s).not.toBeNull();
      expect(s).toContain('A5 (interpreted as hexadecimal, as stated)');
      expect(s).toContain('= 165 in decimal');
      expect(s).not.toMatch(/\b5 \(interpreted/);
    });
    it('"convert 2A hex to decimal" -> 42', () => {
      expect(summaryOf('convert 2A hex to decimal')).toContain('= 42 in decimal');
    });
    it('"convert FF hex to decimal" -> 255', () => {
      expect(summaryOf('convert FF hex to decimal')).toContain('= 255 in decimal');
    });
    it('"convert -A5 hex to decimal" keeps the sign -> -165', () => {
      const s = summaryOf('convert -A5 hex to decimal');
      expect(s).toContain('-A5 (interpreted as hexadecimal, as stated)');
      expect(s).toContain('= -165 in decimal');
    });
    it('"convert +A5 hex to decimal" -> 165', () => {
      expect(summaryOf('convert +A5 hex to decimal')).toContain('= 165 in decimal');
    });
    it('lowercase bare hex works too: "convert a5 hex to decimal" -> 165', () => {
      expect(summaryOf('convert a5 hex to decimal')).toContain('= 165 in decimal');
    });
    it('"<hex> hex to <base>" for other targets: "convert 2A hex to binary" -> 101010', () => {
      expect(summaryOf('convert 2A hex to binary')).toContain('= 101010 in binary');
    });
    it('"hex of <value>": "hex of A5" reads A5 as one token', () => {
      const s = summaryOf('hex of A5');
      expect(s).not.toBeNull();
      expect(s).toContain('A5 (detected as hexadecimal)');
      expect(s).toContain('165 in decimal');
    });
    it('"hex A5" (word before the token): "convert hex A5 to decimal" -> 165', () => {
      expect(summaryOf('convert hex A5 to decimal')).toContain('= 165 in decimal');
    });
    it('a digit-bearing bare hex token wins over an unrelated number elsewhere: "what is A5 hex in 8 bits" never reads the 8 as the operand', () => {
      const s = summaryOf('what is A5 hex in 8 bits');
      expect(s === null || !/\b8 \(interpreted/.test(s)).toBe(true);
    });
    it('a bit-width qualifier is not the operand: "convert FF hex to 8 bit binary" -> FF, not 8', () => {
      const s = summaryOf('convert FF hex to 8 bit binary');
      expect(s).toContain('FF (interpreted as hexadecimal, as stated)');
      expect(s).toContain('= 11111111 in binary');
    });
  });

  describe("two's complement requests", () => {
    it("\"16-bit two's complement of A5 hex\" uses 0xA5 = 165", () => {
      const s = summaryOf("16-bit two's complement of A5 hex");
      expect(s).not.toBeNull();
      expect(s).toContain('165');
      expect(s).toContain('0000000010100101');
      expect(s).toContain('0x00A5');
    });
    it("\"16-bit two's complement of -A5 hex\" uses -0xA5 = -165", () => {
      const s = summaryOf("16-bit two's complement of -A5 hex");
      expect(s).not.toBeNull();
      expect(s).toContain('-165');
      expect(s).toContain('1111111101011011');
    });
    it("\"8-bit two's complement of A5 hex\": 165 does not fit signed 8-bit, so this is a verified overflow for 165 (never a result for 5)", () => {
      const s = summaryOf("8-bit two's complement of A5 hex");
      expect(s).toContain('165');
      expect(s!.toLowerCase()).toContain('out of range');
    });
    it('"FF hex" still works with the width first or last', () => {
      expect(summaryOf("16-bit two's complement of FF hex")).toContain('255');
      expect(summaryOf("two's complement of 2A hex")).toContain('42');
    });
  });

  describe('explicit-hex framing stays deliberate (conservative)', () => {
    it('without the word "hex", a bare letter/digit token is NOT guessed as hex: "convert A5 to decimal" is left to the model', () => {
      expect(summaryOf('convert A5 to decimal')).toBeNull();
      expect(summaryOf("two's complement of A5")).toBeNull();
    });
    it('a digit must never be extracted from the middle of a word', () => {
      expect(summaryOf('convert abc5 to binary')).toBeNull();
      expect(summaryOf('convert v1.5 to binary')).toBeNull();
    });
    it('the article "a" / "A" next to "hex" is not a number', () => {
      expect(summaryOf('what is a hex value in binary?')).toBeNull();
      expect(summaryOf('A hex value in binary')).toBeNull();
    });
    it('the tail of an ordinary word is not extracted as a hex token ("code" -> "de")', () => {
      expect(summaryOf('the code hex to decimal')).toBeNull();
    });
    it('a real decimal number is not displaced by a hex-looking base abbreviation: "convert 255 dec hex"', () => {
      const s = summaryOf('convert 255 dec hex');
      expect(s).not.toBeNull();
      expect(s).toContain('255');
      expect(s).toContain('FF in hex');
    });
    it('"convert 255 to hex and back" is still the decimal 255', () => {
      expect(summaryOf('convert 255 to hex and back')).toContain('255 (interpreted as decimal) = FF in hexadecimal');
    });
  });

  describe('existing explicit cases do not regress', () => {
    it('"convert decimal 10 to hex" -> A', () => {
      expect(summaryOf('convert decimal 10 to hex')).toContain('= A in hexadecimal');
    });
    it('"convert 10 to hex" stays conservative/ambiguous (null)', () => {
      expect(summaryOf('convert 10 to hex')).toBeNull();
    });
    it('"convert 0xA5 to decimal" -> 165', () => {
      const s = summaryOf('convert 0xA5 to decimal');
      expect(s).toContain('0xA5 (interpreted as hexadecimal)');
      expect(s).toContain('= 165 in decimal');
    });
    it('"convert -0xA5 to decimal" -> -165', () => {
      const s = summaryOf('convert -0xA5 to decimal');
      expect(s).toContain('-0xA5');
      expect(s).toContain('= -165 in decimal');
    });
    it('0b / 0o prefixes still parse', () => {
      expect(summaryOf('convert 0b1010 to decimal')).toContain('= 10 in decimal');
      expect(summaryOf('convert 0o17 to decimal')).toContain('= 15 in decimal');
    });
    it('a leading bit-width phrase is skipped, so the real operand is used: "convert 8 bit 5 to binary" -> 101 (not 1000)', () => {
      const s = summaryOf('convert 8 bit 5 to binary');
      expect(s).toContain('= 101 in binary');
      expect(s).not.toContain('1000');
    });
    it('twos complement of -10 stays decimal -10, not binary -2', () => {
      const s = summaryOf('twos complement of -10');
      expect(s).toContain('-10');
      expect(s).not.toContain('-2 ');
    });
  });
});
