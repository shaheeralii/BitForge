import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-[#041A11]/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between text-[10px] font-mono text-[#D9FFF4]/80 shrink-0 border-t border-[#34E89A]/15 relative z-10">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34E89A] animate-pulse"></span>
          BITFORGE_CORE: v2.5_EXACT
        </span>
        <span className="hidden sm:inline text-[#1F6B4C]">|</span>
        <span className="hidden sm:inline text-[#D9FFF4]/70">ARITHMETIC_PRECISION: 64-BIT</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:inline text-[#D9FFF4]/70">LATENCY: 0.001ms</span>
        <span className="text-[#1F6B4C] hidden md:inline">|</span>
        <span className="text-[#34E89A] font-bold">STATUS: READY</span>
      </div>
    </footer>
  );
};

