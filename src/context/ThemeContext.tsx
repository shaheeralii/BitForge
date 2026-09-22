import React, { createContext, useCallback, useContext, useState } from 'react';

export type Theme = 'emerald' | 'premium' | 'plain';

const STORAGE_KEY = 'bitforge_theme';
const VALID_THEMES: readonly Theme[] = ['emerald', 'premium', 'plain'];
const DEFAULT_THEME: Theme = 'emerald';
// Order the picker (and toggleTheme, kept for API completeness) cycle through.
const THEME_CYCLE: readonly Theme[] = ['emerald', 'premium', 'plain'];

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

/**
 * True when the OS/browser currently has "reduce motion" enabled. Read only
 * once, to pick a *first-visit* default in loadStoredTheme below — never
 * re-checked after that, so it can never override a theme the person has
 * actually chosen (including choosing an animated theme while reduced
 * motion is on; the picker always offers all three regardless).
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

function loadStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    // Storage may be unavailable (e.g. private browsing); fall through to
    // the motion-based first-visit default below.
  }
  // No saved choice yet: give reduced-motion visitors Plain (no FlowWave
  // animation) as their first-visit default instead of Emerald. This only
  // decides the default for someone who has never picked a theme — once
  // they do (here or via the picker), that saved choice wins from then on.
  return prefersReducedMotion() ? 'plain' : DEFAULT_THEME;
}

/**
 * Reads the persisted theme synchronously, outside of React, so it can be
 * applied to <html> before the app mounts (see main.tsx) — this avoids a
 * flash of the wrong theme on load. ThemeProvider re-reads the same value
 * for its initial state, so the two stay in sync.
 */
export function getInitialTheme(): Theme {
  return loadStoredTheme();
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => loadStoredTheme());

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be full or unavailable; the in-memory theme still
      // applies for the rest of the session.
    }
  }, []);

  // Cycles Emerald -> Premium -> Plain -> Emerald. Not used by the current
  // header control (a 3-way picker is more discoverable than a hidden-state
  // cycle once there are three options — see ThemeSwitcher.tsx) but kept on
  // the context for API completeness / possible future keyboard shortcut.
  const toggleTheme = useCallback(() => {
    const nextIndex = (THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
