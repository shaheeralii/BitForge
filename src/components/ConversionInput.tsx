import React from 'react';
import { BaseType, AutoDetectResult } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { Check, Lock, Unlock, X, Sparkles, AlertCircle } from 'lucide-react';

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

  return (
    <div className="bg-white dark:bg-[#072818] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-5 sm:p-6 shadow-sm transition-all space-y-5">
      
      {/* Top Bar: Source Base Selector & Auto Detect Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">
            Primary Source Input
          </label>
          <button
            onClick={onToggleLock}
            aria-pressed={isLocked}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
              isLocked
                ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]/50 shadow-sm'
                : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-[#D9FFF4] border-slate-200 dark:border-[#1F6B4C]/50 hover:bg-slate-100 dark:hover:bg-[#0d3324]'
            }`}
            title={isLocked ? 'Auto-detection locked. Click to unlock.' : 'Auto-detection active. Click to lock source base.'}
          >
            {isLocked ? (
              <>
                <Lock className="w-3 h-3 text-[#34E89A]" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-[#1F6B4C]" />
                <span>Auto-Detect</span>
              </>
            )}
          </button>
        </div>

        {/* Auto Detect Indicator */}
        {!isLocked && inputVal.trim() && (
          <div className="flex items-center gap-2 text-xs bg-[#D9FFF4] dark:bg-[#0A3324] border border-[#34E89A]/40 px-3 py-1 rounded-md text-[#0A3324] dark:text-[#D9FFF4] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#0AA15F] dark:text-[#34E89A] animate-pulse shrink-0" />
            <span className="font-sans font-semibold text-[#1F6B4C] dark:text-[#34E89A]">AUTO-DETECTED:</span>
            <span className="font-bold uppercase text-[#0A3324] dark:text-white">
              {BASE_OPTIONS[autoDetect.detectedBase]?.name || `Base ${autoDetect.detectedBase}`}
            </span>
            <span className="text-[#1F6B4C] dark:text-slate-300 text-[11px] hidden md:inline font-sans">
              ({autoDetect.reasoning})
            </span>
          </div>
        )}
      </div>

      {/* Main Large Input Field */}
      <div className="relative group">
        <input
          type="text"
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          placeholder={`Enter a ${sourceBase === 'custom' ? `Base ${customRadix}` : BASE_OPTIONS[sourceBase].name} value (e.g. ${
            sourceBase === '2' ? '10101.101' : sourceBase === '8' ? '755.4' : sourceBase === '16' ? '1A3F.8' : '255'
          })...`}
          className={`w-full font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-4 sm:px-6 py-4 rounded-xl border-2 transition-all outline-none bg-slate-50 dark:bg-[#030D08] ${
            errorMessage
              ? 'border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-[#1F6B4C]/60 text-[#0A3324] dark:text-[#D9FFF4] focus:border-[#34E89A] dark:focus:border-[#34E89A] focus:bg-white dark:focus:bg-[#041A11] focus:ring-2 focus:ring-[#34E89A]/20'
          }`}
        />

        {/* Base Designation Tag */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {inputVal && (
            <button
              onClick={() => onInputChange('')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#0A3324] rounded-lg transition-colors"
              title="Clear Input"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <span className="hidden sm:inline-block font-mono font-bold text-xs text-[#0A3324] dark:text-[#34E89A] bg-[#D9FFF4] dark:bg-[#0A3324] px-2.5 py-1 rounded border border-[#34E89A]/40 uppercase">
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
                  ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A] shadow-sm'
                  : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#D9FFF4]' : 'text-[#1F6B4C] dark:text-slate-400'}`}>
                  {key === 'custom' ? `Base ${customRadix}` : `Base ${opt.radix}`}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#34E89A] shrink-0" />}
                {isDetected && !isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#34E89A] animate-ping" title="Auto-Detected Candidate" />
                )}
              </div>
              <span className={`text-xs font-bold truncate w-full ${isSelected ? 'text-white' : 'text-[#0A3324] dark:text-slate-100'}`}>
                {key === 'custom' ? 'Custom Base' : opt.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Base Controls (Shown if sourceBase === 'custom') */}
      {sourceBase === 'custom' && (
        <div className="flex items-center gap-4 bg-[#F4FAF9] dark:bg-[#0A2E1D] p-3 rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40">
          <label className="text-xs font-bold text-[#0A3324] dark:text-[#D9FFF4] whitespace-nowrap">
            Custom Radix (2 to 36):
          </label>
          <input
            type="range"
            min={2}
            max={36}
            value={customRadix}
            onChange={e => onCustomRadixChange(parseInt(e.target.value) || 2)}
            className="w-full accent-[#34E89A] cursor-pointer"
          />
          <input
            type="number"
            min={2}
            max={36}
            value={customRadix}
            onChange={e => onCustomRadixChange(Math.min(36, Math.max(2, parseInt(e.target.value) || 2)))}
            className="w-16 px-2 py-1 text-center font-mono font-bold text-sm bg-white dark:bg-[#030D08] border border-slate-300 dark:border-[#1F6B4C] rounded-md text-[#0A3324] dark:text-[#34E89A]"
          />
        </div>
      )}

      {/* Error Message Display if Invalid Input */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

