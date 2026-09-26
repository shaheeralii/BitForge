import React from 'react';
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
    <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-3 bg-[var(--bf-overlay)]/55 backdrop-blur-xl text-white border-b border-[var(--bf-accent)]/15 shadow-sm shadow-black/20 sticky top-0 z-30 transition-colors gap-3">
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
        className="flex items-center gap-3 rounded-lg -m-1 p-1 hover:bg-white/5 transition-colors" aria-label="Back to the BitForge landing page">
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

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-black/25 backdrop-blur-sm p-1 rounded-lg border border-[var(--bf-accent)]/15 text-xs font-mono font-medium tracking-tight overflow-x-auto scrollbar-none max-w-full">
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

      {/* System Status Indicators */}
      <div className="flex items-center gap-3 text-xs font-mono shrink-0">
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


