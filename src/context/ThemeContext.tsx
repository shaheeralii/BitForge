import React, { createContext, useCallback, useContext, useState } from 'react';

export type Theme = 'emerald' | 'premium';

const STORAGE_KEY = 'bitforge_theme';
const VALID_THEMES: readonly Theme[] = ['emerald', 'premium'];
const DEFAULT_THEME: Theme = 'emerald';

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

function loadStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    // Storage may be unavailable (e.g. private browsing); fall back quietly.
    return DEFAULT_THEME;
  }
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

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'emerald' ? 'premium' : 'emerald');
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
