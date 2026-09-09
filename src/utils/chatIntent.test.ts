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
