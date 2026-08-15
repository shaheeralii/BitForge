import React, { useState, useEffect } from 'react';
import { AppMode } from './Header';
import { 
  Sparkles, 
  Calculator, 
  Binary, 
  Cpu, 
  Type, 
  ArrowRight, 
  X, 
  HelpCircle, 
  Compass, 
  CheckCircle2 
} from 'lucide-react';

interface WelcomeBannerProps {
  onNavigate: (mode: AppMode) => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isDismissedPermanently, setIsDismissedPermanently] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('bitforge_welcome_dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
      setIsDismissedPermanently(true);
    }
  }, []);

  const handleDismiss = (dontShowAgain = false) => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem('bitforge_welcome_dismissed', 'true');
      setIsDismissedPermanently(true);
    }
  };

  const handleReopen = () => {
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <div className="flex justify-end mb-2">
        <button
          onClick={handleReopen}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#43637E] dark:text-[#65DCD5] bg-white dark:bg-[#1E132B] hover:bg-[#F4FAF9] dark:hover:bg-[#251737] rounded-lg border border-slate-200 dark:border-[#43637E]/40 shadow-xs transition-colors"
          title="Open Welcome & Getting Started Guide"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#65DCD5]" />
          <span>Quick Guide & Overview</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#65DCD5]/50 bg-gradient-to-br from-[#321E48] via-[#241536] to-[#1E132B] text-white p-5 sm:p-6 shadow-lg shadow-[#321E48]/10 mb-6 transition-all animate-fadeIn">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-[#65DCD5]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-[#43637E]/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header with Title & Dismiss Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#65DCD5] text-[#321E48] shadow-md shadow-[#65DCD5]/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
                  Welcome to BitForge
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#65DCD5]/20 text-[#65DCD5] border border-[#65DCD5]/40 uppercase tracking-wide">
                  First-Time Guide
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#D9FFF4]/90 mt-0.5 font-sans leading-relaxed">
                An interactive playground for exploring <strong>radix conversions, binary arithmetic, bitwise state manipulation,</strong> and <strong>character encoding</strong> in real time.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDismiss(false)}
            className="text-[#D9FFF4]/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Dismiss Welcome Message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Card 1: Number Converter */}
          <div 
            onClick={() => onNavigate('converter')}
            className="group cursor-pointer p-3.5 rounded-xl bg-[#1E132B]/80 hover:bg-[#321E48] border border-[#43637E]/50 hover:border-[#65DCD5] transition-all space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-[#321E48] group-hover:bg-[#65DCD5] text-[#65DCD5] group-hover:text-[#321E48] transition-colors">
                <Calculator className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#D9FFF4]/40 group-hover:text-[#65DCD5] group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-xs font-bold text-white group-hover:text-[#65DCD5] transition-colors">
              Number Converter
            </h3>
            <p className="text-[11px] text-[#D9FFF4]/75 leading-normal">
              Convert Decimal, Binary, Hex, Octal, and custom Radix (2–36) with instant step-by-step arithmetic proofs.
            </p>
          </div>

          {/* Card 2: 32-Bit Grid */}
          <div 
            onClick={() => onNavigate('bitgrid')}
            className="group cursor-pointer p-3.5 rounded-xl bg-[#1E132B]/80 hover:bg-[#321E48] border border-[#43637E]/50 hover:border-[#65DCD5] transition-all space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-[#321E48] group-hover:bg-[#65DCD5] text-[#65DCD5] group-hover:text-[#321E48] transition-colors">
                <Binary className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#D9FFF4]/40 group-hover:text-[#65DCD5] group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-xs font-bold text-white group-hover:text-[#65DCD5] transition-colors">
              32-Bit Grid Matrix
            </h3>
            <p className="text-[11px] text-[#D9FFF4]/75 leading-normal">
              Click individual bits to flip weights (8/16/32-bit), test bit shifts, and inspect live 2's complement evaluations.
            </p>
          </div>

          {/* Card 3: Two's Complement */}
          <div 
            onClick={() => onNavigate('twos_complement')}
            className="group cursor-pointer p-3.5 rounded-xl bg-[#1E132B]/80 hover:bg-[#321E48] border border-[#43637E]/50 hover:border-[#65DCD5] transition-all space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-[#321E48] group-hover:bg-[#65DCD5] text-[#65DCD5] group-hover:text-[#321E48] transition-colors">
                <Cpu className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#D9FFF4]/40 group-hover:text-[#65DCD5] group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-xs font-bold text-white group-hover:text-[#65DCD5] transition-colors">
              Two's Complement
            </h3>
            <p className="text-[11px] text-[#D9FFF4]/75 leading-normal">
              Directly enter negative integers to see inversion, adding 1, overflow boundaries, and sign bit mechanics.
            </p>
          </div>

          {/* Card 4: Text & ASCII */}
          <div 
            onClick={() => onNavigate('ascii')}
            className="group cursor-pointer p-3.5 rounded-xl bg-[#1E132B]/80 hover:bg-[#321E48] border border-[#43637E]/50 hover:border-[#65DCD5] transition-all space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-[#321E48] group-hover:bg-[#65DCD5] text-[#65DCD5] group-hover:text-[#321E48] transition-colors">
                <Type className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#D9FFF4]/40 group-hover:text-[#65DCD5] group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-xs font-bold text-white group-hover:text-[#65DCD5] transition-colors">
              Text & ASCII Encoder
            </h3>
            <p className="text-[11px] text-[#D9FFF4]/75 leading-normal">
              Convert strings into byte streams, viewing ASCII code points across Binary, Hex, and Octal formats.
            </p>
          </div>
        </div>

        {/* Navigation Quick Guide & Actions */}
        <div className="pt-2 border-t border-[#43637E]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#D9FFF4]/90 font-medium">
            <Compass className="w-4 h-4 text-[#65DCD5] shrink-0" />
            <span><strong>How to navigate:</strong> Use the top navigation bar or click any card above to switch interactive modes. Try typing in the input bar or clicking presets!</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => handleDismiss(true)}
              className="text-[#D9FFF4]/70 hover:text-white text-[11px] underline underline-offset-2 transition-colors"
            >
              Don't show again
            </button>
            <button
              onClick={() => handleDismiss(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#65DCD5] text-[#321E48] font-bold text-xs hover:bg-[#D9FFF4] transition-all shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Got it, let's explore</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
