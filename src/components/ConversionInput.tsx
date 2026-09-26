import React, { useRef } from 'react';
import { BaseType, AutoDetectResult } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { MIN_RADIX, MAX_RADIX } from '../utils/numberParsing';
import { Check, Lock, Unlock, X, Sparkles, AlertCircle } from 'lucide-react';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';

interface ConversionInputProps {
  inputVal: string;
  onInputChange: (val: string) => void;
  sourceBase: BaseType;
  onSourceBaseChange: (base: BaseType) => void;
  autoDetect: AutoDetectResult;
  isLocked: boolean;
  onToggleLock: () => void;
  customRadix: number;
  onCustomRadixChange: (radix: number) => void;
  errorMessage?: string;
}

export const ConversionInput: React.FC<ConversionInputProps> = ({
  inputVal,
  onInputChange,
  sourceBase,
  onSourceBaseChange,
  autoDetect,
  isLocked,
  onToggleLock,
  customRadix,
  onCustomRadixChange,
  errorMessage,
}) => {
  const baseKeys: BaseType[] = ['10', '2', '8', '16', 'custom'];
  const mainInputRef = useRef<HTMLInputElement>(null);

  useRegisterShortcutTarget({
    focusInput: () => mainInputRef.current?.focus(),
  });

  return (
    <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-5 sm:p-6 shadow-sm transition-all space-y-5">
      
      {/* Top Bar: Source Base Selector & Auto Detect Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="bitforge-main-input" className="text-xs font-bold uppercase tracking-wider text-[var(--bf-accent)]">
            Primary Source Input
          </label>
          <button
            onClick={onToggleLock}
            aria-pressed={isLocked}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
              isLocked
                ? 'bg-[var(--bf-chip)] text-[var(--bf-accent)] border-[var(--bf-accent)]/50 shadow-sm'
                : 'bg-[var(--bf-chip-alt)] text-[var(--bf-heading)] border-[var(--bf-muted)]/50 hover:bg-[var(--bf-chip-alt-hover)]'
            }`}
            title={isLocked ? 'Auto-detection locked. Click to unlock.' : 'Auto-detection active. Click to lock source base.'}
          >
            {isLocked ? (
              <>
                <Lock className="w-3 h-3 text-[var(--bf-accent)]" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-[var(--bf-muted)]" />
                <span>Auto-Detect</span>
              </>
            )}
          </button>
        </div>

        {/* Auto Detect Indicator */}
        {!isLocked && inputVal.trim() && (
          <div className="flex items-center gap-2 text-xs bg-[var(--bf-chip)] border border-[var(--bf-accent)]/40 px-3 py-1 rounded-md text-[var(--bf-heading)] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[var(--bf-accent)] animate-pulse shrink-0" />
            <span className="font-sans font-semibold text-[var(--bf-accent)]">AUTO-DETECTED:</span>
            <span className="font-bold uppercase text-[var(--bf-heading)]">
              {BASE_OPTIONS[autoDetect.detectedBase]?.name || `Base ${autoDetect.detectedBase}`}
            </span>
            <span className="text-[var(--bf-heading)]/80 text-[11px] hidden md:inline font-sans">
              ({autoDetect.reasoning})
            </span>
          </div>
        )}
      </div>

      {/* Main Large Input Field */}
      <div className="relative group">
        <input
          ref={mainInputRef}
          id="bitforge-main-input"
          type="text"
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          placeholder={`Enter a ${sourceBase === 'custom' ? `Base ${customRadix}` : BASE_OPTIONS[sourceBase].name} value (e.g. ${
            sourceBase === '2' ? '10101.101' : sourceBase === '8' ? '755.4' : sourceBase === '16' ? '1A3F.8' : '255'
          })...`}
          className={`w-full font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-4 sm:px-6 py-4 rounded-xl border transition-all outline-none bg-[var(--bf-surface-deep)] ${
            errorMessage
              ? 'border-rose-800 text-rose-200 focus:ring-2 focus:ring-rose-500/20'
              : 'border-[var(--bf-muted)]/60 text-[var(--bf-heading)] focus:border-[var(--bf-accent)] focus:bg-[var(--bf-overlay)] focus:ring-2 focus:ring-[var(--bf-accent)]/20'
          }`}
        />

        {/* Base Designation Tag */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {inputVal && (
            <button
              onClick={() => onInputChange('')}
              className="p-1.5 text-[var(--bf-heading)]/65 hover:text-[var(--bf-heading)] hover:bg-[var(--bf-chip)] rounded-lg transition-colors"
              title="Clear Input"
              aria-label="Clear input"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <span className="hidden sm:inline-block font-mono font-bold text-xs text-[var(--bf-accent)] bg-[var(--bf-chip)] px-2.5 py-1 rounded border border-[var(--bf-accent)]/40 uppercase">
            {sourceBase === 'custom' ? `RADIX ${customRadix}` : BASE_OPTIONS[sourceBase]?.name.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Base Pills Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {baseKeys.map(key => {
          const opt = BASE_OPTIONS[key];
          const isSelected = sourceBase === key;
          const isDetected = !isLocked && autoDetect.detectedBase === key && inputVal.trim().length > 0;

          return (
            <button
              key={key}
              onClick={() => onSourceBaseChange(key)}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-start p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-[var(--bf-chip)] text-[var(--bf-accent)] border-[var(--bf-accent)] shadow-sm'
                  : 'bg-[var(--bf-chip-alt)] text-[var(--bf-heading)]/80 border-[var(--bf-muted)]/40 hover:border-[var(--bf-accent)]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[var(--bf-heading)]' : 'text-[var(--bf-heading)]/65'}`}>
                  {key === 'custom' ? `Base ${customRadix}` : `Base ${opt.radix}`}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[var(--bf-accent)] shrink-0" />}
                {isDetected && !isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[var(--bf-accent)] animate-ping" title="Auto-Detected Candidate" />
                )}
              </div>
              <span className={`text-xs font-bold truncate w-full ${isSelected ? 'text-[var(--bf-heading)]' : 'text-[var(--bf-heading)]'}`}>
                {key === 'custom' ? 'Custom Base' : opt.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Base Controls (Shown if sourceBase === 'custom') */}
      {sourceBase === 'custom' && (
        <div className="flex items-center gap-4 bg-[var(--bf-chip-alt)] p-3 rounded-lg border border-[var(--bf-muted)]/40">
          <label className="text-xs font-bold text-[var(--bf-heading)] whitespace-nowrap">
            Custom Radix ({MIN_RADIX} to {MAX_RADIX}):
          </label>
          <input
            type="range"
            min={MIN_RADIX}
            max={MAX_RADIX}
            value={customRadix}
            onChange={e => onCustomRadixChange(parseInt(e.target.value) || MIN_RADIX)}
            className="w-full accent-[var(--bf-accent)] cursor-pointer"
          />
          <input
            type="number"
            min={MIN_RADIX}
            max={MAX_RADIX}
            value={customRadix}
            onChange={e => onCustomRadixChange(Math.min(MAX_RADIX, Math.max(MIN_RADIX, parseInt(e.target.value) || MIN_RADIX)))}
            className="w-16 px-2 py-1 text-center font-mono font-bold text-sm bg-[var(--bf-surface-deep)] border border-[var(--bf-muted)] rounded-md text-[var(--bf-accent)]"
          />
        </div>
      )}

      {/* Error Message Display if Invalid Input */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-900/60 p-2.5 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

