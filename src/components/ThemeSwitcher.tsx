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
  // Which item should receive focus when the menu opens: the checked one for a
  // click/Enter/Space, the first for ArrowDown, the last for ArrowUp.
  const [openFocus, setOpenFocus] = useState<'checked' | 'first' | 'last'>('checked');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAndReturnFocus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Move focus into the menu as it opens — the WAI-ARIA menu-button pattern.
  // Without this, role="menu" promises arrow-key navigation that nothing
  // implements and a keyboard user is left focused on the trigger.
  useEffect(() => {
    if (!open) return;
    const items = itemRefs.current;
    const index =
      openFocus === 'first' ? 0 : openFocus === 'last' ? THEME_ORDER.length - 1 : Math.max(0, THEME_ORDER.indexOf(theme));
    items[index]?.focus();
    // Only when the menu opens; picking a theme closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const focusItem = (index: number) => {
    const n = THEME_ORDER.length;
    itemRefs.current[((index % n) + n) % n]?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const current = itemRefs.current.findIndex(el => el === document.activeElement);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusItem(current + 1); break;
      case 'ArrowUp': e.preventDefault(); focusItem(current - 1); break;
      case 'Home': e.preventDefault(); focusItem(0); break;
      case 'End': e.preventDefault(); focusItem(THEME_ORDER.length - 1); break;
      default: break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpenFocus(e.key === 'ArrowDown' ? 'first' : 'last');
      setOpen(true);
    }
  };

  // Tabbing away (or clicking elsewhere) closes the menu, so it never lingers
  // open behind the page. Focus moving between the trigger and its own items
  // is not "away".
  const onWrapperBlur = (e: React.FocusEvent) => {
    if (open && !wrapperRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
  };

  const active = THEME_META[theme];
  const ActiveIcon = active.icon;

  return (
    <div className="relative" ref={wrapperRef} onBlur={onWrapperBlur}>
      <button
        ref={triggerRef}
        onClick={() => { setOpenFocus('checked'); setOpen(o => !o); }}
        onKeyDown={onTriggerKeyDown}
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
            onKeyDown={onMenuKeyDown}
            className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-[var(--bf-accent)]/20 bg-[var(--bf-overlay)] shadow-xl z-50 overflow-hidden py-1"
          >
            {THEME_ORDER.map((id, i) => {
              const meta = THEME_META[id];
              const Icon = meta.icon;
              const isActive = theme === id;
              return (
                <button
                  key={id}
                  ref={el => { itemRefs.current[i] = el; }}
                  role="menuitemradio"
                  aria-checked={isActive}
                  tabIndex={-1}
                  onClick={() => {
                    setTheme(id);
                    closeAndReturnFocus();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-white/5 text-[var(--bf-accent)]'
                      : 'text-[var(--bf-heading)]/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--bf-accent)]' : 'text-[var(--bf-heading)]/65'}`}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className={`text-xs font-mono font-semibold ${isActive ? 'text-[var(--bf-accent)]' : 'text-[var(--bf-heading)]'}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-[var(--bf-heading)]/65">{meta.description}</span>
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
