import React, { useRef, useState } from 'react';
import { calculateTwosComplement } from '../utils/converter';
import { Cpu, Copy, Check, AlertCircle, Info } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { ShareButton } from './ShareButton';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';

import { copyTextSafe } from '../utils/shareUtils';

export const TwosComplementCard: React.FC = () => {
  const [inputStr, setInputStr] = useState<string>('-42');
  const [bitWidth, setBitWidth] = useState<number>(8);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse numeric value allowing direct typing of '-' or '+'
  const cleanedStr = inputStr.trim();
  const parsedNum = cleanedStr === '' || cleanedStr === '-' || cleanedStr === '+' ? 0 : parseInt(cleanedStr, 10);
  const numVal = isNaN(parsedNum) ? 0 : parsedNum;

  const minVal = -Math.pow(2, bitWidth - 1);
  const maxVal = Math.pow(2, bitWidth - 1) - 1;
  const isOutOfRange = numVal < minVal || numVal > maxVal;

  const result = calculateTwosComplement(numVal, bitWidth);

  const handleInputChange = (val: string) => {
    // Allow empty string, single minus, single plus, or valid integer format
    if (val === '' || val === '-' || val === '+' || /^[+-]?\d*$/.test(val)) {
      setInputStr(val);
    }
  };

  const toggleSign = () => {
    if (inputStr === '' || inputStr === '0') {
      setInputStr('-1');
      return;
    }
    if (inputStr.startsWith('-')) {
      setInputStr(inputStr.slice(1));
    } else if (inputStr.startsWith('+')) {
      setInputStr('-' + inputStr.slice(1));
    } else {
      setInputStr('-' + inputStr);
    }
  };

  const copyResult = async () => {
    if (result.binaryStr !== 'Overflow') {
      const ok = await copyTextSafe(result.binaryStr);
      if (!ok) {
        setCopyFailed(true);
        setSafeTimeout(() => setCopyFailed(false), 2000);
        return;
      }
      setCopied(true);
      setSafeTimeout(() => setCopied(false), 2000);

      addEntry({
        mode: 'twos_complement',
        operation: `Signed Decimal \u2192 ${bitWidth}-bit Two's Complement`,
        input: numVal.toString(),
        inputLabel: 'Signed Decimal',
        output: result.binaryStr,
        outputLabel: `${bitWidth}-bit Two's Complement`,
      });
    }
  };

  useRegisterShortcutTarget({
    focusInput: () => inputRef.current?.focus(),
    copyResult,
    clearInput: () => setInputStr('0'),
  });

  // Quick preset samples for current bit width
  const presets = [
    { label: `Min (${minVal})`, value: minVal.toString() },
    { label: '-42', value: '-42' },
    { label: '-1', value: '-1' },
    { label: '0', value: '0' },
    { label: '+42', value: '42' },
    { label: `Max (+${maxVal})`, value: maxVal.toString() },
  ];

  return (
    <div className="bg-white dark:bg-[#072818] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1F6B4C]/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0A3324] dark:text-[#D9FFF4]">
                Signed Two's Complement Engine
              </h2>
              <p className="text-xs text-[#1F6B4C] dark:text-[#34E89A]/80 mt-0.5 font-medium">
                Step-by-step arithmetic inversion, binary encoding, and MSB sign-bit derivation
              </p>
            </div>
          </div>
        </div>

        {/* Bit Width Switcher */}
        <div className="flex items-center gap-1.5 bg-[#F4FAF9] dark:bg-[#0A2E1D] p-1 rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 text-xs font-bold">
          {[8, 16, 32].map(w => (
            <button
              key={w}
              onClick={() => setBitWidth(w)}
              aria-pressed={bitWidth === w}
              className={`px-3 py-1.5 rounded-md transition-all ${
                bitWidth === w
                  ? 'bg-[#0A3324] text-[#34E89A] shadow-sm font-bold border border-[#34E89A]/40'
                  : 'text-[#1F6B4C] dark:text-slate-400 hover:text-[#0A3324] dark:hover:text-[#D9FFF4]'
              }`}
            >
              {w}-Bit Architecture
            </button>
          ))}
        </div>
      </div>

      {/* Input Controls & Result Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Input Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="bitforge-twos-complement-input" className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">
              Signed Decimal Input
            </label>
            <span className="text-[11px] font-mono text-[#1F6B4C] dark:text-slate-400">
              Direct Negative Allowed
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              id="bitforge-twos-complement-input"
              type="text"
              inputMode="numeric"
              value={inputStr}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Enter negative or positive integer (e.g. -42)..."
              className={`w-full font-mono text-2xl sm:text-3xl font-bold px-4 py-3 rounded-xl border-2 transition-all outline-none bg-slate-50 dark:bg-[#030D08] ${
                isOutOfRange
                  ? 'border-rose-400 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-[#1F6B4C]/60 text-[#0A3324] dark:text-[#D9FFF4] focus:border-[#34E89A] focus:ring-2 focus:ring-[#34E89A]/20'
              }`}
            />

            {/* Quick Sign Invert Button */}
            <button
              type="button"
              onClick={toggleSign}
              className="absolute right-3 px-2.5 py-1.5 rounded-lg bg-[#0A3324] hover:bg-[#1F6B4C] text-[#34E89A] hover:text-white font-mono text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
              title="Invert Sign (+ / -)"
            >
              <span className="text-sm font-bold">±</span>
              <span>Sign</span>
            </button>
          </div>

          {/* Range indicator and out-of-range alert */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#1F6B4C] dark:text-slate-400 pt-1">
            <span>Range: [{minVal.toLocaleString()} to {maxVal.toLocaleString()}]</span>
            {isOutOfRange && (
              <span className="flex items-center gap-1 text-rose-500 font-bold">
                <AlertCircle className="w-3 h-3" /> Exceeds {bitWidth}-bit capacity
              </span>
            )}
          </div>

          {/* Quick Boundary Preset Pills */}
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-500 block mb-1.5">
              Quick Test Values:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setInputStr(p.value)}
                  aria-pressed={inputStr === p.value}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                    inputStr === p.value
                      ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]'
                      : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Box */}
        <div className="bg-[#0A3324] text-white p-5 rounded-xl border border-[#1F6B4C]/60 flex flex-col justify-between shadow-sm relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#34E89A]/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between text-xs text-[#34E89A]">
              <span className="font-bold tracking-wider uppercase">{bitWidth}-Bit Signed Binary Output</span>
              <span className="font-mono bg-[#041A11] px-2 py-0.5 rounded text-[#D9FFF4] border border-[#1F6B4C]/50">
                HEX: 0x{result.hexStr}
              </span>
            </div>

            <div className="mt-3">
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[#34E89A] break-all leading-tight">
                {result.binaryStr}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-300 font-mono">
                <span>MSB Sign Bit: <strong className={numVal < 0 ? 'text-amber-300 font-bold' : 'text-[#34E89A]'}>{numVal < 0 ? '1 (Negative)' : '0 (Positive)'}</strong></span>
                <span>•</span>
                <span>Unsigned: {result.binaryStr && result.binaryStr !== 'Overflow' ? parseInt(result.binaryStr, 2) : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1F6B4C]/40">
            <div className="text-[11px] text-slate-300 font-sans">
              Representation for <span className="font-mono font-bold text-[#D9FFF4]">{numVal}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyResult}
                disabled={result.binaryStr === 'Overflow'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : copyFailed
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#1F6B4C] hover:bg-[#34E89A] hover:text-[#0A3324] text-white'
                }`}
                title={copyFailed ? 'Copy failed \u2014 clipboard unavailable' : 'Copy Binary Output'}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : copyFailed ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Binary</span>
                  </>
                )}
              </button>
              {result.binaryStr !== 'Overflow' && (
                <ShareButton
                  label="Share"
                  shareTitle="BitForge Two's Complement"
                  getText={() =>
                    `BitForge Two's Complement (${bitWidth}-bit)\nSigned Decimal: ${numVal}\nBinary: ${result.binaryStr}\nHex: 0x${result.hexStr}`
                  }
                  historyEntry={() => ({
                    mode: 'twos_complement',
                    operation: `Shared ${bitWidth}-bit Two's Complement`,
                    input: numVal.toString(),
                    inputLabel: 'Signed Decimal',
                    output: result.binaryStr,
                    outputLabel: `${bitWidth}-bit Two's Complement`,
                  })}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-black/20 text-[#D9FFF4]/80 hover:text-[#34E89A] border border-[#34E89A]/20 hover:border-[#34E89A]/50"
                />
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Step by Step Derivation Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">
            Step-by-Step Derivation Breakdown
          </h3>
          <span className="text-[11px] text-[#1F6B4C] dark:text-slate-400 font-mono">
            {numVal < 0 ? 'Negative Path: Invert Bits + 1' : 'Positive Path: Direct Binary Form'}
          </span>
        </div>

        <div className="space-y-3">
          {result.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D] p-4 space-y-2.5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0A3324] text-[#34E89A] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-[#34E89A]/30">
                    {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-[#0A3324] dark:text-[#D9FFF4] uppercase tracking-wider">
                    {step.title}
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#D9FFF4] dark:bg-[#0A3324] text-[#0A3324] dark:text-[#34E89A] border border-[#34E89A]/30">
                  Step {idx + 1}
                </span>
              </div>

              <p className="text-xs text-[#1F6B4C] dark:text-slate-300 leading-relaxed font-sans">
                {step.explanation}
              </p>

              {step.equationLines && step.equationLines.length > 0 && (
                <div className="bg-[#0A3324] text-[#34E89A] p-3 rounded-lg font-mono text-xs space-y-1 overflow-x-auto scrollbar-none border border-[#1F6B4C]/40">
                  {step.equationLines.map((line, lIdx) => (
                    <div key={lIdx} className="whitespace-pre-wrap">{line}</div>
                  ))}
                </div>
              )}

              {step.finalResult && (
                <div className="flex items-center justify-between text-xs font-mono font-bold bg-white dark:bg-[#0A2E1D] p-2.5 rounded-md border border-slate-200 dark:border-[#1F6B4C]/40">
                  <span className="text-[#1F6B4C] dark:text-slate-400 font-sans text-xs">Stage Outcome:</span>
                  <span className="text-[#0A3324] dark:text-[#34E89A] font-mono font-bold">{step.finalResult}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

