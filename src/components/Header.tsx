import React, { useEffect, useRef } from 'react';
import { Binary, Calculator, Type, SquareSigma, History, Keyboard, Layers3 } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { BitForgeLogo } from './BitForgeLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { APP_VERSION } from '../version';

export type AppMode = 'converter' | 'bit_representation' | 'ascii' | 'operations' | 'floating_point';

interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  /** Navigate to the landing page via AppRoot's centralized navigation. */
  onGoHome: () => void;
  onOpenHistory: () => void;
  onOpenShortcutsHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeMode, onModeChange, onGoHome, onOpenHistory, onOpenShortcutsHelp }) => {
  const { entries } = useHistory();
  const tabBarRef = useRef<HTMLElement>(null);

  // Below md the tab bar scrolls sideways (the five tabs don't fit). Opening a
  // tool by direct link, refresh or Back/Forward leaves the bar scrolled to
  // its start, which on a phone can hide the highlighted tab off-screen even
  // though the right tool is showing. Keep the active tab in view by moving
  // the bar's own scroll position — instant (so it is reduced-motion safe),
  // and it never scrolls the page. A no-op wherever the tabs already fit.
  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar || bar.scrollWidth <= bar.clientWidth + 1) return;
    const active = bar.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const barRect = bar.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const margin = 8;
    if (activeRect.left < barRect.left + margin) {
      bar.scrollLeft += activeRect.left - barRect.left - margin;
    } else if (activeRect.right > barRect.right - margin) {
      bar.scrollLeft += activeRect.right - barRect.right + margin;
    }
  }, [activeMode]);

  const modes = [
    {
      id: 'converter' as AppMode,
      label: 'Number Converter',
      icon: Calculator,
    },
    {
      id: 'bit_representation' as AppMode,
      label: 'Bit Representation',
      icon: Binary,
    },
    {
      id: 'ascii' as AppMode,
      label: 'Text & ASCII',
      icon: Type,
    },
    {
      id: 'operations' as AppMode,
      label: 'Binary Operations',
      icon: SquareSigma,
    },
    {
      id: 'floating_point' as AppMode,
      label: 'Floating Point',
      icon: Layers3,
    },
  ];

  return (
    <header className="flex flex-col md:flex-row md:flex-wrap wide:flex-nowrap items-center justify-between px-4 sm:px-8 py-3 bg-[var(--bf-overlay)]/55 backdrop-blur-xl text-white border-b border-[var(--bf-accent)]/15 shadow-sm shadow-black/20 sticky top-0 z-30 transition-colors gap-3">
      {/* Branding — a real link back to the landing page, so it keeps link
          semantics (focusable, "copy link address", open in new tab all work
          and point at the landing route). A plain left click is intercepted
          and routed through AppRoot's centralized navigation (onGoHome), the
          same path the landing tiles and mode tabs use, so state and URL
          change together in the same call rather than relying on a
          hashchange event to be noticed afterwards. Modified clicks
          (ctrl/cmd/shift/middle) fall through to the browser. */}
      <a
        href="#/"
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onGoHome();
        }}
        className="flex items-center gap-3 rounded-lg -m-1 p-1 hover:bg-white/5 transition-colors md:order-1" aria-label="Back to the BitForge landing page">
        <BitForgeLogo className="w-9 h-9 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-display font-bold uppercase tracking-wide text-white flex items-center gap-1.5">
              BitForge
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] normal-case font-mono font-semibold tracking-wide bg-[var(--bf-accent)]/20 text-[var(--bf-accent)] border border-[var(--bf-accent)]/30">
                v{APP_VERSION}
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-[var(--bf-heading)]/80 font-sans">
            Interactive Number Systems & Encoding Toolkit
          </p>
        </div>
      </a>

      {/* Center Navigation Tabs.
          Five tabs need ~785px. Below 1440px there is not room for them
          between the brand and the controls, and a scrolling tab bar hid the
          last tab(s) with no cue that it scrolled (measured: "Floating
          Point" clipped at 1280 and 1366). So from md up the tabs get their
          own centred row under the brand/controls until 1440px (the `wide:` breakpoint, defined in index.css), where they
          sit inline as before. Under md the bar still scrolls, as before. */}
      <div className="flex justify-center max-w-full min-w-0 md:order-3 md:basis-full wide:order-2 wide:basis-auto">
      <nav ref={tabBarRef} className="flex items-center gap-1 bg-black/25 backdrop-blur-sm p-1 rounded-lg border border-[var(--bf-accent)]/15 text-xs font-mono font-medium tracking-tight overflow-x-auto md:overflow-visible md:flex-wrap md:justify-center scrollbar-none max-w-full">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--bf-accent)] text-[var(--bf-chip)] shadow-sm shadow-[var(--bf-accent)]/40 font-bold'
                  : 'text-[var(--bf-heading)]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--bf-chip)]' : 'text-[var(--bf-accent)]'}`} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center gap-3 text-xs font-mono shrink-0 md:order-2 wide:order-3">
        <ThemeSwitcher />
        <button
          onClick={onOpenShortcutsHelp}
          className="p-2 bg-black/25 backdrop-blur-sm hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/70 hover:text-[var(--bf-accent)] rounded-full border border-[var(--bf-accent)]/30 transition-colors"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenHistory}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-black/25 backdrop-blur-sm hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/80 hover:text-[var(--bf-accent)] text-xs font-medium rounded-full border border-[var(--bf-accent)]/30 transition-colors"
          title="Activity History (H)"
          aria-label="Activity history"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">History</span>
          {entries.length > 0 && (
            <span className="ml-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--bf-accent)] text-[var(--bf-chip)] text-[9px] font-bold">
              {entries.length > 99 ? '99+' : entries.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};


