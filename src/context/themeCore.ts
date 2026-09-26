/**
 * Framework-free theme logic: the allowed themes, storage validation, and the
 * ONE function that writes a theme to the document. Kept out of
 * ThemeContext.tsx so it can be unit-tested without React and so that
 * main.tsx (pre-mount) and ThemeProvider (post-mount) share exactly the same
 * DOM-writing path.
 */

export type Theme = 'emerald' | 'premium' | 'plain';

export const THEME_STORAGE_KEY = 'bitforge_theme';
export const THEMES: readonly Theme[] = ['emerald', 'premium', 'plain'];
export const DEFAULT_THEME: Theme = 'emerald';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * Browser-chrome colors per theme (`<meta name="theme-color">` tints the
 * mobile address bar / task switcher; `mask-icon` colors the Safari pinned
 * tab glyph). `background` mirrors `--bf-app-bg` and `accent` mirrors
 * `--bf-accent` in index.css — themeCore.test.ts parses index.css and fails
 * if these ever drift apart, so there is still a single visual source of
 * truth (the CSS) with the TS copy guarded against going stale.
 */
export const THEME_CHROME: Record<Theme, { background: string; accent: string }> = {
  emerald: { background: '#02160C', accent: '#34E89A' },
  premium: { background: '#0A0B0D', accent: '#7C9C8B' },
  plain: { background: '#0B0C0D', accent: '#4FAE87' },
};

/**
 * True when the OS/browser currently has "reduce motion" enabled. Read only
 * to pick a *first-visit* default — never re-checked afterwards, so it can
 * never override a theme the person has actually chosen.
 */
function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

/** The persisted theme, or null if nothing valid is stored (or storage is unavailable). */
export function readStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be full or unavailable; the in-memory theme still applies
    // for the rest of the session.
  }
}

/**
 * Saved (valid) choice wins; otherwise reduced-motion visitors get Plain as
 * a first-visit default and everyone else gets Emerald. Used both before
 * React mounts (main.tsx) and as ThemeProvider's initial state.
 */
export function getInitialTheme(): Theme {
  return readStoredTheme() ?? (prefersReducedMotion() ? 'plain' : DEFAULT_THEME);
}

/**
 * The single place a theme is written to the document. ThemeProvider calls
 * it from a layout effect keyed on its React state (so the DOM can never
 * disagree with React), and main.tsx calls it once before mount to avoid a
 * flash of the wrong theme. Nothing else should touch `data-theme`.
 * Safe when either <meta>/<link> element is missing.
 */
export function applyThemeToDocument(theme: Theme, doc: Document = document): void {
  doc.documentElement.setAttribute('data-theme', theme);
  const chrome = THEME_CHROME[theme];
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', chrome.background);
  doc.querySelector('link[rel="mask-icon"]')?.setAttribute('color', chrome.accent);
}
