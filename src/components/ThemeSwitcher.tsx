import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Waves, Gem, Square } from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';

const THEME_ORDER: readonly Theme[] = ['emerald', 'premium', 'plain'];

const THEME_META: Record<Theme, { label: string; description: string; icon: React.ElementType }> = {
  emerald: { label: 'Emerald', description: 'Original FlowWave', icon: Waves },
  premium: { label: 'Premium', description: 'Dark-gray FlowWave', icon: Gem },
  plain: { label: 'Plain', description: 'Static, no animation', icon: Square },
};

/**
 * Header control for choosing between BitForge's three background themes.
 * Replaces the old two-way cycling toggle: with three options, an explicit
 * picker is more discoverable than a button whose current state hides which
 * of three things comes next. Mirrors the ExportDropdown pattern already
 * used in HistoryPanel.tsx (click-outside catcher + absolute panel) for
 * visual/interaction consistency, with Escape-to-close and focus return
 * added on top for accessibility.
 */
export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const active = THEME_META[theme];
  const ActiveIcon = active.icon;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-black/25 backdrop-blur-sm hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] text-xs font-medium rounded-full border border-[var(--bf-accent)]/30 transition-colors"
        title="Switch background theme"
        aria-label={`Current theme: ${active.label}. Choose a background theme.`}
      >
        <ActiveIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{active.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Background theme"
            className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-[var(--bf-accent)]/20 bg-[var(--bf-overlay)] shadow-xl z-50 overflow-hidden py-1"
          >
            {THEME_ORDER.map(id => {
              const meta = THEME_META[id];
              const Icon = meta.icon;
              const isActive = theme === id;
              return (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setTheme(id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-white/5 text-[var(--bf-accent)]'
                      : 'text-[var(--bf-heading)]/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--bf-accent)]' : 'text-[var(--bf-heading)]/50'}`}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className={`text-xs font-mono font-semibold ${isActive ? 'text-[var(--bf-accent)]' : 'text-[var(--bf-heading)]'}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-[var(--bf-heading)]/50">{meta.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
