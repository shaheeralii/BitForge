import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The reduced-motion contract lives in CSS, so pin it: if someone deletes or
 * narrows these rules, decorative motion silently comes back for people who
 * asked the OS for less of it. (Runtime behaviour — running animations drop
 * to zero, the WebGL canvas is not created — is verified in a real browser
 * in e2e/smoke.spec.ts.)
 */
const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8');
const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}\n/g)].map((m) => m[1]).join('\n');

describe('prefers-reduced-motion CSS', () => {
  it('has a reduced-motion block', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });
  it.each(['.animate-fadeIn', '.animate-pulse', '.animate-ping'])('disables %s', (cls) => {
    const rule = new RegExp(`${cls.replace('.', '\\.')}[^{]*\\{[^}]*animation:\\s*none`);
    expect(blocks).toMatch(rule);
  });
  it('slows, rather than removes, the loading spinner (it is a real state cue)', () => {
    expect(blocks).toMatch(/\.animate-spin\s*\{[^}]*animation-duration:\s*3s/);
  });
  it('makes decorative transitions instant without disabling the state change itself', () => {
    expect(blocks).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*transition-duration:\s*0\.01ms\s*!important/);
  });
});
