import React from 'react';
import { Binary, Calculator, Cpu, Type, Sparkles } from 'lucide-react';

export type AppMode = 'converter' | 'bitgrid' | 'twos_complement' | 'ascii';

interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeMode, onModeChange }) => {
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
  ];

  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-3 bg-[#321E48] text-white border-b border-[#43637E]/40 shadow-md sticky top-0 z-30 transition-colors gap-3">
      {/* Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-tr from-[#65DCD5] to-[#D9FFF4] rounded-lg flex items-center justify-center text-[#321E48] font-mono font-black text-lg shadow-sm shadow-[#65DCD5]/20">
          BF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
              BitForge
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-[#65DCD5]/20 text-[#65DCD5] border border-[#65DCD5]/30">
                v2.5
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-[#D9FFF4]/80 font-sans">
            Interactive Number Systems & Encoding Toolkit
          </p>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-[#221432] p-1 rounded-lg border border-[#43637E]/50 text-xs font-semibold overflow-x-auto max-w-full">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-[#65DCD5] text-[#321E48] shadow-sm font-bold'
                  : 'text-[#D9FFF4]/70 hover:text-white hover:bg-[#321E48]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#321E48]' : 'text-[#65DCD5]'}`} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Indicators */}
      <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#221432] text-[#65DCD5] text-xs font-medium rounded-full border border-[#65DCD5]/40">
          <div className="w-2 h-2 bg-[#65DCD5] rounded-full animate-pulse"></div>
          ENGINE ACTIVE
        </div>
        <div className="text-[#D9FFF4]/60 text-xs">
          64-BIT EXACT
        </div>
      </div>
    </header>
  );
};


