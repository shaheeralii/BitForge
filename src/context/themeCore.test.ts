// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  THEMES,
  THEME_CHROME,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getInitialTheme,
  isTheme,
  persistTheme,
  readStoredTheme,
} from './themeCore';
import { installDomIsolation } from '../test/setup';

installDomIsolation();

function stubReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe('isTheme / stored value validation', () => {
  it('accepts exactly the three themes', () => {
    for (const t of THEMES) expect(isTheme(t)).toBe(true);
    expect(THEMES).toEqual(['emerald', 'premium', 'plain']);
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'Plain', 'dark', null, undefined, 3, {}, 'emerald ']) expect(isTheme(bad)).toBe(false);
  });
  it('ignores an invalid stored value instead of trusting it', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBeNull();
    stubReducedMotion(false);
    expect(getInitialTheme()).toBe('emerald');
  });
});

describe('getInitialTheme — first-visit default vs explicit saved choice', () => {
  it('first visit, no reduced motion -> emerald', () => {
    stubReducedMotion(false);
    expect(getInitialTheme()).toBe('emerald');
  });
  it('first visit with reduced motion -> plain', () => {
    stubReducedMotion(true);
    expect(getInitialTheme()).toBe('plain');
  });
  it('an explicit saved choice overrides the reduced-motion default (animated theme with reduced motion on)', () => {
    stubReducedMotion(true);
    persistTheme('premium');
    expect(getInitialTheme()).toBe('premium');
  });
});

describe('applyThemeToDocument — the single DOM write path', () => {
  it('sets data-theme, theme-color and mask-icon color together', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000"><link rel="mask-icon" href="/f.svg" color="#000000">';
    for (const t of THEMES) {
      applyThemeToDocument(t);
      expect(document.documentElement.getAttribute('data-theme')).toBe(t);
      expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(THEME_CHROME[t].background);
      expect(document.querySelector('link[rel="mask-icon"]')!.getAttribute('color')).toBe(THEME_CHROME[t].accent);
    }
  });
  it('is safe when the metadata elements are missing', () => {
    document.head.innerHTML = '';
    expect(() => applyThemeToDocument('plain')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('plain');
  });
});

describe('THEME_CHROME stays in sync with index.css (single visual source of truth)', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
  const tokenOf = (theme: string, token: string) => {
    const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
    expect(block, `theme block for ${theme}`).not.toBeNull();
    const m = block![1].match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
    expect(m, `${token} in ${theme}`).not.toBeNull();
    return m![1].toUpperCase();
  };
  for (const t of THEMES) {
    it(`${t}: background == --bf-app-bg and accent == --bf-accent`, () => {
      expect(THEME_CHROME[t].background.toUpperCase()).toBe(tokenOf(t, '--bf-app-bg'));
      expect(THEME_CHROME[t].accent.toUpperCase()).toBe(tokenOf(t, '--bf-accent'));
    });
  }
  it('index.html ships the default (emerald) theme-color so the first paint is already correct', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    expect(html).toContain(`<meta name="theme-color" content="${THEME_CHROME.emerald.background}"`);
  });
});

describe('index.css Plain kill-switch', () => {
  it('hides #flow-wave-scene the moment data-theme is plain', () => {
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    const rule = css.match(/html\[data-theme="plain"\]\s+#flow-wave-scene\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/display:\s*none/);
    expect(rule![1]).toMatch(/visibility:\s*hidden/);
  });
});
