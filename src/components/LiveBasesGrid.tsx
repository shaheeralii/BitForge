import React, { useState } from 'react';
import { BaseType, ConversionResult } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { Copy, Check, Target, ChevronRight } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';

interface LiveBasesGridProps {
  conversion: ConversionResult;
  targetBase: BaseType;
  onSelectTargetBase: (base: BaseType) => void;
  customRadix: number;
}

export const LiveBasesGrid: React.FC<LiveBasesGridProps> = ({
  conversion,
  targetBase,
  onSelectTargetBase,
  customRadix,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const copyToClipboard = (text: string, key: string, cardName: string) => {
    if (!text || text === 'Error') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);

    addEntry({
      mode: 'converter',
      operation: `${BASE_OPTIONS[conversion.sourceBase]?.name || conversion.sourceBase} \u2192 ${cardName}`,
      input: conversion.sourceValue,
      inputLabel: BASE_OPTIONS[conversion.sourceBase]?.name || `Base ${conversion.sourceBase}`,
      output: text,
      outputLabel: cardName,
    });
  };

  const cards: {
    id: BaseType;
    name: string;
    radix: number;
    value: string;
    prefix: string;
    badgeText?: string;
  }[] = [
    {
      id: '10',
      name: BASE_OPTIONS['10'].name,
      radix: 10,
      value: conversion.denary,
      prefix: '',
      badgeText: 'Base 10',
    },
    {
      id: '2',
      name: BASE_OPTIONS['2'].name,
      radix: 2,
      value: conversion.binary,
      prefix: '0b',
      badgeText: `${conversion.bitLengthNeeded} bits`,
    },
    {
      id: '8',
      name: BASE_OPTIONS['8'].name,
      radix: 8,
      value: conversion.octal,
      prefix: '0o',
      badgeText: 'Base 8',
    },
    {
      id: '16',
      name: BASE_OPTIONS['16'].name,
      radix: 16,
      value: conversion.hexadecimal,
      prefix: '0x',
      badgeText: 'Base 16',
    },
    {
      id: 'custom',
      name: `Custom Base (${customRadix})`,
      radix: customRadix,
      value: conversion.customBaseValue || '0',
      prefix: '',
      badgeText: `Base ${customRadix}`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">
          Real-Time Conversion Matrix
        </h2>
        <span className="text-xs text-[#1F6B4C] dark:text-slate-400 font-medium">
          Click any card to focus step-by-step math derivation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => {
          const isTarget = targetBase === card.id;
          const isSource = conversion.sourceBase === card.id;
          const isCopied = copiedKey === card.id;

          // Percentage indicator for visual radix scale
          const radixPercent = Math.min(100, Math.max(10, (card.radix / 16) * 100));

          return (
            <div
              key={card.id}
              onClick={() => onSelectTargetBase(card.id)}
              className={`group relative bg-white dark:bg-[#072818] p-5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isTarget
                  ? 'border-[#34E89A] dark:border-[#34E89A] ring-2 ring-[#34E89A]/30 shadow-md bg-gradient-to-b from-white to-[#D9FFF4]/20 dark:from-[#072818] dark:to-[#0A3324]/40'
                  : 'border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]/60 shadow-sm'
              }`}
            >
              <div>
                {/* Header Sublabel */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#1F6B4C] dark:text-[#34E89A] uppercase tracking-widest">
                      {card.id === 'custom' ? `RADIX ${customRadix}` : `BASE ${card.radix}`}
                    </span>
                    {isSource && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#0A3324] text-[#34E89A] border border-[#34E89A]/30">
                        SOURCE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {card.badgeText && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-[#D9FFF4] font-medium border border-slate-200 dark:border-[#1F6B4C]/30">
                        {card.badgeText}
                      </span>
                    )}
                    {isTarget && (
                      <span className="flex items-center text-[10px] font-bold text-[#0A3324] dark:text-[#34E89A] bg-[#D9FFF4] dark:bg-[#0A3324] px-2 py-0.5 rounded border border-[#34E89A]/40">
                        <Target className="w-3 h-3 mr-1 text-[#0AA15F] dark:text-[#34E89A]" />
                        FOCUSED
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#0A3324] dark:text-[#D9FFF4] mb-2">
                  {card.name}
                </h3>

                {/* Main Large Numerical Output */}
                <div className="flex items-baseline justify-between gap-2 my-2">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-[#0A3324] dark:text-[#D9FFF4] break-all leading-tight">
                    {card.prefix && card.value !== 'Error' && (
                      <span className="text-[#1F6B4C] dark:text-slate-500 select-none text-xl mr-1 font-normal">
                        {card.prefix}
                      </span>
                    )}
                    <span className={card.value === 'Error' ? 'text-rose-500 font-semibold text-sm' : ''}>
                      {card.value}
                    </span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      copyToClipboard(card.value, card.id, card.name);
                    }}
                    disabled={card.value === 'Error'}
                    className={`p-2 rounded-lg transition-all shrink-0 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 hover:text-[#0A3324] dark:hover:text-[#34E89A] border border-slate-200 dark:border-[#1F6B4C]/50 hover:bg-slate-100 dark:hover:bg-[#0A3324]'
                    }`}
                    title="Copy converted value"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Bottom Visual Progress / Radix Indicator Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1F6B4C]/30">
                <div className="flex items-center justify-between text-[11px] text-[#1F6B4C] dark:text-slate-400 mb-1.5 font-mono">
                  <span>Radix Scale ({card.radix})</span>
                  <span className="flex items-center font-medium text-[#0A3324] dark:text-[#34E89A] group-hover:underline">
                    Math Derivation <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-[#0A2E1D] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isTarget ? 'bg-gradient-to-r from-[#1F6B4C] to-[#34E89A]' : 'bg-[#1F6B4C]/40 dark:bg-[#1F6B4C]/60'}`}
                    style={{ width: `${radixPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

