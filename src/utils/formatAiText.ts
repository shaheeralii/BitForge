/**
 * BitForge AI (Gemini) replies are plain conversational text, but the model
 * sometimes reaches for lightweight Markdown (**bold**, `code`) or, less
 * desirably, inline LaTeX math delimiters (`$...$`, `\( ... \)`) to express
 * things like "u -> Dec 117" or "2^8". BitForge's own UI never uses LaTeX —
 * everywhere else in the app (see utils/floatingPoint.ts) the same ideas are
 * written with plain Unicode: "->", "x2", "2^8" etc. as real arrow/superscript
 * characters. Previously the chat window rendered the raw reply text as-is,
 * so any of that syntax showed up completely literally (e.g. a literal
 * "$\rightarrow$" instead of an arrow, literal "**" instead of bold).
 *
 * This module turns the raw reply into a small, render-agnostic token tree:
 *   - fenced ``` code blocks
 *   - inline `code`
 *   - **bold**
 *   - inline math spans ($...$ or \( ... \)), converted to the same plain
 *     Unicode BitForge already uses elsewhere
 *   - plain text, otherwise untouched
 *
 * It has no React/DOM dependency so it can be unit tested directly; the
 * companion component (FormattedAiMessage.tsx) just walks this tree and
 * renders it.
 */

// ---------------------------------------------------------------------------
// LaTeX-fragment -> Unicode conversion
// ---------------------------------------------------------------------------

/** Unicode superscript characters for the subset LaTeX exponents actually use. */
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '+': '\u207a', '-': '\u207b', '=': '\u207c', '(': '\u207d', ')': '\u207e',
  n: '\u207f', i: '\u2071',
};

/** Unicode subscript characters for the subset LaTeX bases/indices actually use. */
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
  '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089',
  '+': '\u208a', '-': '\u208b', '=': '\u208c', '(': '\u208d', ')': '\u208e',
  a: '\u2090', e: '\u2091', o: '\u2092', x: '\u2093', n: '\u2099',
};

/**
 * Common LaTeX math commands mapped to the plain Unicode symbol BitForge
 * already uses for the same idea. Longest keys first, so a combined
 * alternation regex tries "\leq" before "\le" and never partially matches
 * a longer command as a shorter one.
 */
const LATEX_COMMANDS: Record<string, string> = {
  '\\rightarrow': '\u2192', '\\Rightarrow': '\u21d2', '\\longrightarrow': '\u2192',
  '\\leftarrow': '\u2190', '\\Leftarrow': '\u21d0', '\\longleftarrow': '\u2190',
  '\\leftrightarrow': '\u2194', '\\Leftrightarrow': '\u21d4',
  '\\to': '\u2192',
  '\\times': '\u00d7', '\\cdot': '\u00b7', '\\div': '\u00f7',
  '\\pm': '\u00b1', '\\mp': '\u2213',
  '\\leq': '\u2264', '\\le': '\u2264', '\\geq': '\u2265', '\\ge': '\u2265',
  '\\neq': '\u2260', '\\ne': '\u2260', '\\approx': '\u2248', '\\equiv': '\u2261',
  '\\infty': '\u221e', '\\sum': '\u2211', '\\prod': '\u220f', '\\sqrt': '\u221a', '\\partial': '\u2202',
  '\\pi': '\u03c0', '\\theta': '\u03b8', '\\alpha': '\u03b1', '\\beta': '\u03b2',
  '\\gamma': '\u03b3', '\\delta': '\u03b4', '\\epsilon': '\u03b5', '\\lambda': '\u03bb',
  '\\mu': '\u03bc', '\\sigma': '\u03c3', '\\phi': '\u03c6', '\\omega': '\u03c9',
  '\\in': '\u2208', '\\notin': '\u2209', '\\subset': '\u2282', '\\cup': '\u222a', '\\cap': '\u2229',
  '\\forall': '\u2200', '\\exists': '\u2203', '\\emptyset': '\u2205',
  '\\ldots': '\u2026', '\\cdots': '\u22ef', '\\dots': '\u2026',
  '\\%': '%', '\\_': '_', '\\&': '&',
  '\\quad': '  ', '\\qquad': '    ', '\\,': ' ', '\\;': ' ', '\\!': '',
};

const LATEX_COMMAND_PATTERN = new RegExp(
  Object.keys(LATEX_COMMANDS)
    .sort((a, b) => b.length - a.length)
    .map((cmd) => cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g'
);

/** Strips a wrapping brace group, e.g. "{2}" -> "2", "2" -> "2" (no-op if unbraced). */
function unwrapBraces(group: string): string {
  return group.startsWith('{') && group.endsWith('}') ? group.slice(1, -1) : group;
}

/**
 * Converts a `^{...}` / `^x` or `_{...}` / `_x` group to Unicode super-/
 * subscript characters. Falls back to a caret/underscore-free but still
 * legible `(...)` form when a character in the group has no Unicode
 * super-/subscript equivalent, rather than leaving raw LaTeX grouping
 * syntax on screen.
 */
function scriptToUnicode(group: string, map: Record<string, string>, marker: '^' | '_'): string {
  const inner = unwrapBraces(group);
  const mapped = inner
    .split('')
    .map((ch) => map[ch.toLowerCase()] ?? null);
  if (mapped.every((ch): ch is string => ch !== null)) {
    return mapped.join('');
  }
  // Not every character has a Unicode equivalent — keep it readable without
  // leaving stray braces or a bare caret/underscore behind.
  return marker === '^' ? `^(${inner})` : `_(${inner})`;
}

const SCRIPT_GROUP = /(\{[^{}]*\}|-?[0-9a-zA-Z])/;
const SUPERSCRIPT_PATTERN = new RegExp('\\^' + SCRIPT_GROUP.source, 'g');
const SUBSCRIPT_PATTERN = new RegExp('_' + SCRIPT_GROUP.source, 'g');

/**
 * Converts the contents of a single inline math span (the text between a
 * pair of `$` or `\( \)` delimiters, delimiters already stripped) into plain
 * Unicode text matching BitForge's own notation style. Best-effort: any
 * command this doesn't recognize is defused (backslash dropped) rather than
 * left as visible LaTeX noise.
 */
export function convertLatexFragment(raw: string): string {
  let text = raw;

  // \text{...}, \mathrm{...} etc. are just wrappers around plain content.
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');

  // Super/subscripts before general command replacement, since a braced
  // group can itself contain a command (e.g. "2^{\\circ}").
  text = text.replace(SUPERSCRIPT_PATTERN, (_m, group: string) => scriptToUnicode(group, SUPERSCRIPT_MAP, '^'));
  text = text.replace(SUBSCRIPT_PATTERN, (_m, group: string) => scriptToUnicode(group, SUBSCRIPT_MAP, '_'));

  // Known commands, longest-first so "\leq" is never half-replaced as "\le".
  text = text.replace(LATEX_COMMAND_PATTERN, (m) => LATEX_COMMANDS[m] ?? m);

  // Any leftover \command we don't recognize: drop the backslash rather
  // than showing raw LaTeX syntax.
  text = text.replace(/\\([a-zA-Z]+)/g, '$1');
  // Leftover line-break/spacing escapes.
  text = text.replace(/\\\\/g, ' ');
  text = text.replace(/[ \t]{2,}/g, ' ').trim();

  return text;
}

// ---------------------------------------------------------------------------
// Token tree
// ---------------------------------------------------------------------------

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'code'; value: string }
  | { type: 'math'; value: string };

export type Block =
  | { type: 'paragraph'; lines: InlineToken[][] }
  | { type: 'codeblock'; language: string; code: string };

const INLINE_CODE = /^`([^`\n]+)`/;
const BOLD = /^\*\*([^*\n]+)\*\*/;
const MATH_DOLLAR = /^\$([^$\n]+)\$/;
const MATH_PAREN = /^\\\(([\s\S]+?)\\\)/;
/** Any character that could start one of the inline patterns above. */
const NEXT_SPECIAL = /[`*$]|\\\(/;

/** Parses a single line (no newlines) of chat text into inline tokens. */
export function parseInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      tokens.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < line.length) {
    const rest = line.slice(i);

    const codeMatch = rest.match(INLINE_CODE);
    if (codeMatch) {
      flush();
      tokens.push({ type: 'code', value: codeMatch[1] });
      i += codeMatch[0].length;
      continue;
    }

    const boldMatch = rest.match(BOLD);
    if (boldMatch) {
      flush();
      tokens.push({ type: 'bold', children: parseInline(boldMatch[1]) });
      i += boldMatch[0].length;
      continue;
    }

    const mathMatch = rest.match(MATH_DOLLAR) ?? rest.match(MATH_PAREN);
    if (mathMatch) {
      flush();
      tokens.push({ type: 'math', value: convertLatexFragment(mathMatch[1]) });
      i += mathMatch[0].length;
      continue;
    }

    // Consume plain text up to the next character that could start a
    // special token, so we're not scanning one character at a time.
    const searchFrom = rest.slice(1).search(NEXT_SPECIAL);
    const take = searchFrom === -1 ? rest.length : searchFrom + 1;
    buffer += rest.slice(0, take);
    i += take;
  }

  flush();
  return tokens;
}

const FENCE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;

/** Parses a full BitForge AI reply into a sequence of renderable blocks. */
export function parseAiMessage(text: string): Block[] {
  const blocks: Block[] = [];
  let lastIndex = 0;

  const pushParagraph = (chunk: string) => {
    if (chunk === '') return;
    blocks.push({
      type: 'paragraph',
      lines: chunk.split('\n').map(parseInline),
    });
  };

  FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE.exec(text)) !== null) {
    pushParagraph(text.slice(lastIndex, match.index));
    blocks.push({ type: 'codeblock', language: match[1] ?? '', code: match[2].replace(/\n$/, '') });
    lastIndex = FENCE.lastIndex;
  }
  pushParagraph(text.slice(lastIndex));

  return blocks;
}
