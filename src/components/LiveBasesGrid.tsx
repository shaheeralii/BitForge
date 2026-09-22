import React, { useState } from 'react';
import { BaseType, ConversionResult } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { copyTextSafe } from '../utils/shareUtils';
import { Copy, Check, Target, ChevronRight, AlertCircle } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { ShareButton } from './ShareButton';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';

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
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();

  const copyToClipboard = async (text: string, key: string, cardName: string) => {
    if (!text || text === 'Error') return;
    const ok = await copyTextSafe(text);
    if (!ok) {
      setFailedKey(key);
      setSafeTimeout(() => setFailedKey(null), 2000);
      return;
    }
    setCopiedKey(key);
    setSafeTimeout(() => setCopiedKey(null), 2000);

    addEntry({
      mode: 'converter',
      operation: `${BASE_OPTIONS[conversion.sourceBase]?.name || conversion.sourceBase} \u2192 ${cardName}`,
      input: conversion.sourceValue,
      inputLabel: BASE_OPTIONS[conversion.sourceBase]?.name || `Base ${conversion.sourceBase}`,
      output: text,
      outputLabel: cardName,
      // Preserve the exact source interpretation so reusing this entry
      // reproduces the same calculation instead of re-running auto-detect
      // on the raw input string.
      sourceBase: conversion.sourceBase,
      ...(conversion.sourceBase === 'custom' ? { customRadix } : {}),
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

  const targetCard = cards.find(c => c.id === targetBase);
  useRegisterShortcutTarget({
    copyResult: targetCard ? () => copyToClipboard(targetCard.value, targetCard.id, targetCard.name) : undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-display font-medium uppercase tracking-wide text-[var(--bf-accent)]">
          Real-Time Conversion Matrix
        </h2>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            Click any card to focus step-by-step math derivation
          </span>
          <ShareButton
            label="Share"
            shareTitle="BitForge Conversion"
            getText={() =>
              `BitForge Conversion\nInput: ${conversion.sourceValue} (${BASE_OPTIONS[conversion.sourceBase]?.name})\n\n` +
              cards.map(c => `${c.name}: ${c.prefix}${c.value}`).join('\n')
            }
            historyEntry={() => ({
              mode: 'converter',
              operation: `Shared full conversion matrix`,
              input: conversion.sourceValue,
              inputLabel: BASE_OPTIONS[conversion.sourceBase]?.name || `Base ${conversion.sourceBase}`,
              output: cards.map(c => `${c.prefix}${c.value}`).join(', '),
              outputLabel: 'All Bases',
              sourceBase: conversion.sourceBase,
              ...(conversion.sourceBase === 'custom' ? { customRadix } : {}),
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => {
          const isTarget = targetBase === card.id;
          const isSource = conversion.sourceBase === card.id;
          const isCopied = copiedKey === card.id;
          const isFailed = failedKey === card.id;

          // Percentage indicator for visual radix scale
          const radixPercent = Math.min(100, Math.max(10, (card.radix / 16) * 100));

          // This card has two independent actions — "select as target base"
          // (the whole card) and "copy value" (one small control) — so it's
          // rendered as a non-interactive container holding two sibling
          // <button> elements rather than a button nested inside a
          // role="button" div. Nesting interactive controls is invalid
          // semantics: assistive tech can't cleanly expose an interactive
          // element inside another interactive element, and it creates
          // ambiguous keyboard behavior (Enter/Space on the outer control
          // firing while focus visually sits on the inner one). The copy
          // button is layered on top via absolute positioning so the visual
          // layout is unchanged.
          return (
            <div
              key={card.id}
              className={`group relative bg-[var(--bf-surface)] rounded-xl border transition-all duration-200 shadow-sm ${
                isTarget
                  ? 'border-[var(--bf-accent)] ring-2 ring-[var(--bf-accent)]/30 shadow-md'
                  : 'border-[var(--bf-muted)]/40 hover:border-[var(--bf-accent)]/60'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTargetBase(card.id)}
                aria-pressed={isTarget}
                aria-label={`View step-by-step derivation for ${card.name}`}
                className="w-full h-full text-left p-5 flex flex-col justify-between rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bf-overlay)]"
              >
                <div>
                  {/* Header Sublabel */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[var(--bf-accent)] uppercase tracking-widest">
                        {card.id === 'custom' ? `RADIX ${customRadix}` : `BASE ${card.radix}`}
                      </span>
                      {isSource && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[var(--bf-chip)] text-[var(--bf-accent)] border border-[var(--bf-accent)]/30">
                          SOURCE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {card.badgeText && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bf-chip-alt)] text-[var(--bf-heading)] font-medium border border-[var(--bf-muted)]/30">
                          {card.badgeText}
                        </span>
                      )}
                      {isTarget && (
                        <span className="flex items-center text-[10px] font-bold text-[var(--bf-accent)] bg-[var(--bf-chip)] px-2 py-0.5 rounded border border-[var(--bf-accent)]/40">
                          <Target className="w-3 h-3 mr-1 text-[var(--bf-accent)]" />
                          FOCUSED
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--bf-heading)] mb-2">
                    {card.name}
                  </h3>

                  {/* Main Large Numerical Output */}
                  <div className="flex items-baseline justify-between gap-2 my-2 pr-10">
                    <div className="font-mono text-2xl sm:text-3xl font-bold text-[var(--bf-heading)] break-all leading-tight">
                      {card.prefix && card.value !== 'Error' && (
                        <span className="text-slate-500 select-none text-xl mr-1 font-normal">
                          {card.prefix}
                        </span>
                      )}
                      <span className={card.value === 'Error' ? 'text-rose-500 font-semibold text-sm' : ''}>
                        {card.value}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Visual Progress / Radix Indicator Bar */}
                <div className="mt-4 pt-3 border-t border-[var(--bf-muted)]/30">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                    <span>Radix Scale ({card.radix})</span>
                    <span className="flex items-center font-medium text-[var(--bf-accent)] group-hover:underline">
                      Math Derivation <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bf-chip-alt)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isTarget ? 'bg-gradient-to-r from-[var(--bf-muted)] to-[var(--bf-accent)]' : 'bg-[var(--bf-muted)]/60'}`}
                      style={{ width: `${radixPercent}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Copy action — a sibling of the select button above, not a
                  descendant of it, layered visually via absolute positioning
                  so it sits where the inline control used to be. */}
              <button
                type="button"
                onClick={() => copyToClipboard(card.value, card.id, card.name)}
                disabled={card.value === 'Error'}
                className={`absolute top-[4.5rem] right-5 p-2 rounded-lg transition-all shrink-0 ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : isFailed
                    ? 'bg-rose-600 text-white'
                    : 'bg-[var(--bf-chip-alt)] text-slate-300 hover:text-[var(--bf-accent)] border border-[var(--bf-muted)]/50 hover:bg-[var(--bf-chip)]'
                }`}
                title={isFailed ? 'Copy failed \u2014 clipboard unavailable' : 'Copy converted value'}
                aria-label={isCopied ? `Copied ${card.name} value` : isFailed ? 'Copy failed — clipboard unavailable' : `Copy ${card.name} value`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : isFailed ? <AlertCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

