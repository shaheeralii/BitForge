import React from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const THEME_LABEL = {
  emerald: 'Emerald',
  premium: 'Premium',
} as const;

/**
 * Compact header control for switching between BitForge's two dark themes.
 * A single click cycles Emerald <-> Premium; the choice is persisted by
 * ThemeContext. Mirrors the existing Keyboard/History button styling so it
 * reads as part of the same status-indicator row rather than a new pattern.
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = THEME_LABEL[theme === 'emerald' ? 'premium' : 'emerald'];

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-black/25 backdrop-blur-sm hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] text-xs font-medium rounded-full border border-[var(--bf-accent)]/30 transition-colors"
      title={`Switch to ${nextLabel} theme`}
      aria-label={`Current theme: ${THEME_LABEL[theme]}. Switch to ${nextLabel} theme.`}
    >
      <Palette className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{THEME_LABEL[theme]}</span>
    </button>
  );
};
