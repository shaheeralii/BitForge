import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-[#321E48] px-4 sm:px-8 flex items-center justify-between text-[10px] font-mono text-[#D9FFF4]/80 shrink-0 border-t border-[#43637E]/40">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#65DCD5] animate-pulse"></span>
          BITFORGE_CORE: v2.4_EXACT
        </span>
        <span className="hidden sm:inline text-[#43637E]">|</span>
        <span className="hidden sm:inline text-[#D9FFF4]/70">ARITHMETIC_PRECISION: 64-BIT</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:inline text-[#D9FFF4]/70">LATENCY: 0.001ms</span>
        <span className="text-[#43637E] hidden md:inline">|</span>
        <span className="text-[#65DCD5] font-bold">STATUS: READY</span>
      </div>
    </footer>
  );
};

