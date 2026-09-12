import { describe, it, expect } from 'vitest';
import { convertLatexFragment, parseInline, parseAiMessage } from './formatAiText';

describe('convertLatexFragment', () => {
  it('converts common arrow and operator commands to Unicode', () => {
    expect(convertLatexFragment('\\rightarrow')).toBe('\u2192');
    expect(convertLatexFragment('\\to')).toBe('\u2192');
    expect(convertLatexFragment('\\times')).toBe('\u00d7');
    expect(convertLatexFragment('\\div')).toBe('\u00f7');
  });

  it('does not partially replace a longer command as a shorter prefix command', () => {
    // "\leq" starts with "\le" — must resolve to \u2264 (leq), not "\u2264q".
    expect(convertLatexFragment('\\leq')).toBe('\u2264');
    expect(convertLatexFragment('\\le')).toBe('\u2264');
  });

  it('converts Greek letters', () => {
    expect(convertLatexFragment('\\theta')).toBe('\u03b8');
    expect(convertLatexFragment('\\pi')).toBe('\u03c0');
  });

  it('converts braced single-digit superscripts to Unicode', () => {
    expect(convertLatexFragment('x^{2}')).toBe('x\u00b2');
  });

  it('converts braced multi-digit superscripts digit-by-digit', () => {
    expect(convertLatexFragment('2^{10}')).toBe('2\u00b9\u2070');
  });

  it('converts unbraced single-character superscripts', () => {
    expect(convertLatexFragment('2^8')).toBe('2\u2078');
  });

  it('converts braced and unbraced subscripts to Unicode', () => {
    expect(convertLatexFragment('1010_{2}')).toBe('1010\u2082');
    expect(convertLatexFragment('1010_2')).toBe('1010\u2082');
  });

  it('falls back to a parenthesized form when a script character has no Unicode equivalent', () => {
    expect(convertLatexFragment('x^{!}')).toBe('x^(!)');
    expect(convertLatexFragment('x_{!}')).toBe('x_(!)');
  });

  it('unwraps \\text{...} and similar wrapper commands', () => {
    expect(convertLatexFragment('\\text{hello}')).toBe('hello');
    expect(convertLatexFragment('\\mathrm{ABC}')).toBe('ABC');
  });

  it('strips unrecognized commands rather than leaving a stray backslash', () => {
    expect(convertLatexFragment('\\foobar')).toBe('foobar');
  });

  it('handles the exact reported bug example', () => {
    // From the bug report: "u $\rightarrow$ Dec 117" — the math span content
    // (delimiters already stripped, as parseInline would hand it off).
    expect(convertLatexFragment('\\rightarrow')).toBe('\u2192');
  });
});

describe('parseInline', () => {
  it('returns a single plain-text token for text with no special syntax', () => {
    const tokens = parseInline('Just a normal sentence.');
    expect(tokens).toEqual([{ type: 'text', value: 'Just a normal sentence.' }]);
  });

  it('parses bold segments', () => {
    const tokens = parseInline('**u**');
    expect(tokens).toEqual([{ type: 'bold', children: [{ type: 'text', value: 'u' }] }]);
  });

  it('parses inline code segments', () => {
    const tokens = parseInline('`01110101`');
    expect(tokens).toEqual([{ type: 'code', value: '01110101' }]);
  });

  it('parses a $...$ math span and converts its LaTeX content', () => {
    const tokens = parseInline('$\\rightarrow$');
    expect(tokens).toEqual([{ type: 'math', value: '\u2192' }]);
  });

  it('parses a \\( ... \\) math span', () => {
    const tokens = parseInline('\\(\\times\\)');
    expect(tokens).toEqual([{ type: 'math', value: '\u00d7' }]);
  });

  it('parses the exact reported bug example end-to-end', () => {
    const tokens = parseInline('6. **u** $\\rightarrow$ Dec 117 $\\rightarrow$ `01110101`');
    expect(tokens).toEqual([
      { type: 'text', value: '6. ' },
      { type: 'bold', children: [{ type: 'text', value: 'u' }] },
      { type: 'text', value: ' ' },
      { type: 'math', value: '\u2192' },
      { type: 'text', value: ' Dec 117 ' },
      { type: 'math', value: '\u2192' },
      { type: 'text', value: ' ' },
      { type: 'code', value: '01110101' },
    ]);
  });

  it('supports code nested inside bold', () => {
    const tokens = parseInline('**`code`**');
    expect(tokens).toEqual([{ type: 'bold', children: [{ type: 'code', value: 'code' }] }]);
  });

  it('leaves an unterminated ** or ` untouched as plain text', () => {
    expect(parseInline('this ** is not bold')).toEqual([{ type: 'text', value: 'this ** is not bold' }]);
    expect(parseInline('a stray ` backtick')).toEqual([{ type: 'text', value: 'a stray ` backtick' }]);
  });
});

describe('parseAiMessage', () => {
  it('returns a single paragraph block for plain multi-line text', () => {
    const blocks = parseAiMessage('Line one\nLine two');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        lines: [
          [{ type: 'text', value: 'Line one' }],
          [{ type: 'text', value: 'Line two' }],
        ],
      },
    ]);
  });

  it('extracts a fenced code block into its own block', () => {
    const blocks = parseAiMessage('```\nconst a = 1;\n```');
    expect(blocks).toEqual([{ type: 'codeblock', language: '', code: 'const a = 1;' }]);
  });

  it('captures the language tag on a fenced code block', () => {
    const blocks = parseAiMessage('```js\nconst a = 1;\n```');
    expect(blocks).toEqual([{ type: 'codeblock', language: 'js', code: 'const a = 1;' }]);
  });

  it('splits surrounding prose and a code block into separate blocks in order', () => {
    const blocks = parseAiMessage('Before\n```\ncode\n```\nAfter');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'codeblock', 'paragraph']);
    expect(blocks[1]).toEqual({ type: 'codeblock', language: '', code: 'code' });
  });

  it('round-trips a plain reply with no Markdown/LaTeX unchanged', () => {
    const text = 'Binary addition lines up bits and carries just like decimal addition.';
    const blocks = parseAiMessage(text);
    expect(blocks).toEqual([{ type: 'paragraph', lines: [[{ type: 'text', value: text }]] }]);
  });
});
