import React from 'react';
import { Binary, Calculator, Cpu, Type, SquareSigma, History, Keyboard } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { BitForgeLogo } from './BitForgeLogo';

export type AppMode = 'converter' | 'bitgrid' | 'twos_complement' | 'ascii' | 'operations';

interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onOpenHistory: () => void;
  onOpenShortcutsHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeMode, onModeChange, onOpenHistory, onOpenShortcutsHelp }) => {
  const { entries } = useHistory();
  const modes = [
    {
      id: 'converter' as AppMode,
      label: 'Number Converter',
      icon: Calculator,
    },
    {
      id: 'bitgrid' as AppMode,
      label: '32-Bit Grid',
      icon: Binary,
    },
    {
      id: 'twos_complement' as AppMode,
      label: "Two's Complement",
      icon: Cpu,
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
  ];

  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-3 bg-[#041A11]/55 backdrop-blur-xl text-white border-b border-[#34E89A]/15 shadow-lg shadow-black/30 sticky top-0 z-30 transition-colors gap-3">
      {/* Branding */}
      <div className="flex items-center gap-3">
        <BitForgeLogo className="w-9 h-9 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
              BitForge
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-[#34E89A]/20 text-[#34E89A] border border-[#34E89A]/30">
                v4.0.0
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-[#D9FFF4]/80 font-sans">
            Interactive Number Systems & Encoding Toolkit
          </p>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-black/25 backdrop-blur-sm p-1 rounded-lg border border-[#34E89A]/15 text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
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
                  ? 'bg-[#34E89A] text-[#0A3324] shadow-sm shadow-[#34E89A]/40 font-bold'
                  : 'text-[#D9FFF4]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0A3324]' : 'text-[#34E89A]'}`} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Indicators */}
      <div className="flex items-center gap-3 text-xs font-mono shrink-0">
        <button
          onClick={onOpenShortcutsHelp}
          className="p-2 bg-black/25 backdrop-blur-sm hover:bg-[#0A3324] text-[#D9FFF4]/70 hover:text-[#34E89A] rounded-full border border-[#34E89A]/30 transition-colors"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenHistory}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-black/25 backdrop-blur-sm hover:bg-[#0A3324] text-[#D9FFF4]/80 hover:text-[#34E89A] text-xs font-medium rounded-full border border-[#34E89A]/30 transition-colors"
          title="Activity History (H)"
          aria-label="Activity history"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">History</span>
          {entries.length > 0 && (
            <span className="ml-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#34E89A] text-[#0A3324] text-[9px] font-bold">
              {entries.length > 99 ? '99+' : entries.length}
            </span>
          )}
        </button>
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-black/25 backdrop-blur-sm text-[#34E89A] text-xs font-medium rounded-full border border-[#34E89A]/30">
          <div className="w-2 h-2 bg-[#34E89A] rounded-full animate-pulse"></div>
          ENGINE ACTIVE
        </div>
      </div>
    </header>
  );
};


