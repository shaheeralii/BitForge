import React, { useState } from 'react';
import { calculateTwosComplement } from '../utils/converter';
import { Cpu, Copy, Check, AlertCircle, Info } from 'lucide-react';

export const TwosComplementCard: React.FC = () => {
  const [inputStr, setInputStr] = useState<string>('-42');
  const [bitWidth, setBitWidth] = useState<number>(8);
  const [copied, setCopied] = useState<boolean>(false);

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

  const copyResult = () => {
    if (result.binaryStr !== 'Overflow') {
      navigator.clipboard.writeText(result.binaryStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
    <div className="bg-white dark:bg-[#1E132B] rounded-xl border border-slate-200 dark:border-[#43637E]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#43637E]/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#321E48] text-[#65DCD5] shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#321E48] dark:text-[#D9FFF4]">
                Signed Two's Complement Engine
              </h2>
              <p className="text-xs text-[#43637E] dark:text-[#65DCD5]/80 mt-0.5 font-medium">
                Step-by-step arithmetic inversion, binary encoding, and MSB sign-bit derivation
              </p>
            </div>
          </div>
        </div>

        {/* Bit Width Switcher */}
        <div className="flex items-center gap-1.5 bg-[#F4FAF9] dark:bg-[#251737] p-1 rounded-lg border border-slate-200 dark:border-[#43637E]/40 text-xs font-bold">
          {[8, 16, 32].map(w => (
            <button
              key={w}
              onClick={() => setBitWidth(w)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                bitWidth === w
                  ? 'bg-[#321E48] text-[#65DCD5] shadow-sm font-bold border border-[#65DCD5]/40'
                  : 'text-[#43637E] dark:text-slate-400 hover:text-[#321E48] dark:hover:text-[#D9FFF4]'
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
            <label className="text-xs font-bold uppercase tracking-wider text-[#43637E] dark:text-[#65DCD5]">
              Signed Decimal Input
            </label>
            <span className="text-[11px] font-mono text-[#43637E] dark:text-slate-400">
              Direct Negative Allowed
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={inputStr}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Enter negative or positive integer (e.g. -42)..."
              className={`w-full font-mono text-2xl sm:text-3xl font-bold px-4 py-3 rounded-xl border-2 transition-all outline-none bg-slate-50 dark:bg-[#130B1C] ${
                isOutOfRange
                  ? 'border-rose-400 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-[#43637E]/60 text-[#321E48] dark:text-[#D9FFF4] focus:border-[#65DCD5] focus:ring-2 focus:ring-[#65DCD5]/20'
              }`}
            />

            {/* Quick Sign Invert Button */}
            <button
              type="button"
              onClick={toggleSign}
              className="absolute right-3 px-2.5 py-1.5 rounded-lg bg-[#321E48] hover:bg-[#43637E] text-[#65DCD5] hover:text-white font-mono text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
              title="Invert Sign (+ / -)"
            >
              <span className="text-sm font-bold">±</span>
              <span>Sign</span>
            </button>
          </div>

          {/* Range indicator and out-of-range alert */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#43637E] dark:text-slate-400 pt-1">
            <span>Range: [{minVal.toLocaleString()} to {maxVal.toLocaleString()}]</span>
            {isOutOfRange && (
              <span className="flex items-center gap-1 text-rose-500 font-bold">
                <AlertCircle className="w-3 h-3" /> Exceeds {bitWidth}-bit capacity
              </span>
            )}
          </div>

          {/* Quick Boundary Preset Pills */}
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#43637E] dark:text-slate-500 block mb-1.5">
              Quick Test Values:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setInputStr(p.value)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                    inputStr === p.value
                      ? 'bg-[#321E48] text-[#65DCD5] border-[#65DCD5]'
                      : 'bg-[#F4FAF9] dark:bg-[#251737] text-[#43637E] dark:text-slate-300 border-slate-200 dark:border-[#43637E]/40 hover:border-[#65DCD5]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Box */}
        <div className="bg-[#321E48] text-white p-5 rounded-xl border border-[#43637E]/60 flex flex-col justify-between shadow-sm relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#65DCD5]/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between text-xs text-[#65DCD5]">
              <span className="font-bold tracking-wider uppercase">{bitWidth}-Bit Signed Binary Output</span>
              <span className="font-mono bg-[#221432] px-2 py-0.5 rounded text-[#D9FFF4] border border-[#43637E]/50">
                HEX: 0x{result.hexStr}
              </span>
            </div>

            <div className="mt-3">
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[#65DCD5] break-all leading-tight">
                {result.binaryStr}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-300 font-mono">
                <span>MSB Sign Bit: <strong className={numVal < 0 ? 'text-amber-300 font-bold' : 'text-[#65DCD5]'}>{numVal < 0 ? '1 (Negative)' : '0 (Positive)'}</strong></span>
                <span>•</span>
                <span>Unsigned: {result.binaryStr && result.binaryStr !== 'Overflow' ? parseInt(result.binaryStr, 2) : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#43637E]/40">
            <div className="text-[11px] text-slate-300 font-sans">
              Representation for <span className="font-mono font-bold text-[#D9FFF4]">{numVal}</span>
            </div>
            <button
              onClick={copyResult}
              disabled={result.binaryStr === 'Overflow'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#43637E] hover:bg-[#65DCD5] hover:text-[#321E48] text-white'
              }`}
              title="Copy Binary Output"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Binary</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Step by Step Derivation Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#43637E] dark:text-[#65DCD5]">
            Step-by-Step Derivation Breakdown
          </h3>
          <span className="text-[11px] text-[#43637E] dark:text-slate-400 font-mono">
            {numVal < 0 ? 'Negative Path: Invert Bits + 1' : 'Positive Path: Direct Binary Form'}
          </span>
        </div>

        <div className="space-y-3">
          {result.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 dark:border-[#43637E]/40 bg-[#F4FAF9]/50 dark:bg-[#180E24] p-4 space-y-2.5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#321E48] text-[#65DCD5] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-[#65DCD5]/30">
                    {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-[#321E48] dark:text-[#D9FFF4] uppercase tracking-wider">
                    {step.title}
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#D9FFF4] dark:bg-[#321E48] text-[#321E48] dark:text-[#65DCD5] border border-[#65DCD5]/30">
                  Step {idx + 1}
                </span>
              </div>

              <p className="text-xs text-[#43637E] dark:text-slate-300 leading-relaxed font-sans">
                {step.explanation}
              </p>

              {step.equationLines && step.equationLines.length > 0 && (
                <div className="bg-[#321E48] text-[#65DCD5] p-3 rounded-lg font-mono text-xs space-y-1 overflow-x-auto border border-[#43637E]/40">
                  {step.equationLines.map((line, lIdx) => (
                    <div key={lIdx} className="whitespace-pre-wrap">{line}</div>
                  ))}
                </div>
              )}

              {step.finalResult && (
                <div className="flex items-center justify-between text-xs font-mono font-bold bg-white dark:bg-[#251737] p-2.5 rounded-md border border-slate-200 dark:border-[#43637E]/40">
                  <span className="text-[#43637E] dark:text-slate-400 font-sans text-xs">Stage Outcome:</span>
                  <span className="text-[#321E48] dark:text-[#65DCD5] font-mono font-bold">{step.finalResult}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

