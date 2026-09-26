import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import {
  Theme,
  THEMES,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getInitialTheme,
  isTheme,
  persistTheme,
} from './themeCore';

export type { Theme };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme state has exactly one authority: the React `theme` value below.
 *
 *  - React state -> DOM: a single layout effect calls applyThemeToDocument
 *    whenever `theme` changes. It runs in the same commit as the render that
 *    changed the theme (before paint), so `data-theme` can neither lag behind
 *    nor get ahead of what React rendered. No other code writes `data-theme`.
 *  - User choice -> storage: setTheme persists. Changes that *arrive* from
 *    storage (another tab) update React state only and are never written
 *    back, so two tabs cannot ping-pong the same value.
 *  - Other tabs -> React state: the `storage` event (fired only in *other*
 *    tabs, and only for real changes) feeds the same state setter.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      // Ignore sessionStorage events and invalid/removed values: an explicit
      // valid choice in another tab is the only thing that should move us.
      if (e.storageArea && e.storageArea !== window.localStorage) return;
      if (isTheme(e.newValue)) setThemeState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    if (!isTheme(next)) return;
    setThemeState(next);
    persistTheme(next);
  }, []);

  // Cycles Emerald -> Premium -> Plain -> Emerald. Not used by the current
  // header control (a 3-way picker is more discoverable) but kept on the
  // context for API completeness / a possible future keyboard shortcut.
  const toggleTheme = useCallback(() => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
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
