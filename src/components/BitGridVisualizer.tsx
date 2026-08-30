import React, { useState } from 'react';
import { Binary, RotateCcw, ArrowLeft, ArrowRight, Zap, Copy, Check, AlertCircle } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { ShareButton } from './ShareButton';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';
import { copyTextSafe } from '../utils/shareUtils';

export const BitGridVisualizer: React.FC = () => {
  const [bitWidth, setBitWidth] = useState<8 | 16 | 32>(16);
  // Bits array indexed 0 (MSB) to bitWidth - 1 (LSB)
  const [bits, setBits] = useState<number[]>(() => {
    // Default value e.g. 0x00A5 = 165
    const init = new Array(16).fill(0);
    init[8] = 1; init[10] = 1; init[13] = 1; init[15] = 1; // 10100101
    return init;
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();

  const handleWidthChange = (newWidth: 8 | 16 | 32) => {
    setBitWidth(newWidth);
    if (newWidth > bits.length) {
      const padding = new Array(newWidth - bits.length).fill(0);
      setBits([...padding, ...bits]);
    } else {
      setBits(bits.slice(bits.length - newWidth));
    }
  };

  const toggleBit = (index: number) => {
    const updated = [...bits];
    updated[index] = updated[index] === 0 ? 1 : 0;
    setBits(updated);
  };

  const clearBits = () => setBits(new Array(bitWidth).fill(0));
  const setAllBits = () => setBits(new Array(bitWidth).fill(1));
  const invertBits = () => setBits(bits.map(b => (b === 0 ? 1 : 0)));
  const shiftLeft = () => setBits([...bits.slice(1), 0]);
  const shiftRight = () => setBits([0, ...bits.slice(0, bitWidth - 1)]);

  // Compute values
  const binaryString = bits.join('');
  let unsignedBigInt = 0n;
  for (let b of bits) {
    unsignedBigInt = (unsignedBigInt << 1n) | BigInt(b);
  }

  // Signed calculation
  let signedVal = unsignedBigInt;
  const isMsbSet = bits[0] === 1;
  if (isMsbSet) {
    const maxUnsigned = 1n << BigInt(bitWidth);
    signedVal = unsignedBigInt - maxUnsigned;
  }

  const hexVal = unsignedBigInt.toString(16).toUpperCase().padStart(bitWidth / 4, '0');
  const octalVal = unsignedBigInt.toString(8);
  const denaryVal = unsignedBigInt.toString();

  const copyVal = async (val: string, key: string, outputLabel: string) => {
    const ok = await copyTextSafe(val);
    if (!ok) {
      setFailedKey(key);
      setSafeTimeout(() => setFailedKey(null), 2000);
      return;
    }
    setCopiedKey(key);
    setSafeTimeout(() => setCopiedKey(null), 2000);

    addEntry({
      mode: 'bitgrid',
      operation: `${bitWidth}-bit \u2192 ${outputLabel}`,
      input: binaryString,
      inputLabel: `${bitWidth}-bit Binary`,
      output: val,
      outputLabel,
    });
  };

  useRegisterShortcutTarget({
    copyResult: () => copyVal(denaryVal, 'denary', 'Unsigned Denary'),
    clearInput: clearBits,
  });

  return (
    <div className="bg-white dark:bg-[#072818] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1F6B4C]/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shadow-sm">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0A3324] dark:text-[#D9FFF4]">
                Interactive Bit Grid Matrix
              </h2>
              <p className="text-xs text-[#1F6B4C] dark:text-[#34E89A]/80 mt-0.5 font-medium">
                Click individual bit weights to toggle state and evaluate signed/unsigned representations
              </p>
            </div>
          </div>
        </div>

        {/* Bit Width Controls */}
        <div className="flex items-center gap-1.5 bg-[#F4FAF9] dark:bg-[#0A2E1D] p-1 rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 text-xs font-bold">
          {([8, 16, 32] as const).map(w => (
            <button
              key={w}
              onClick={() => handleWidthChange(w)}
              aria-pressed={bitWidth === w}
              className={`px-3 py-1.5 rounded-md transition-all ${
                bitWidth === w
                  ? 'bg-[#0A3324] text-[#34E89A] shadow-sm font-bold border border-[#34E89A]/40'
                  : 'text-[#1F6B4C] dark:text-slate-400 hover:text-[#0A3324] dark:hover:text-[#D9FFF4]'
              }`}
            >
              {w}-Bit
            </button>
          ))}
        </div>
      </div>

      {/* Bit Manipulation Quick Toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={invertBits}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#0A3324] border border-slate-200 dark:border-[#1F6B4C]/40 transition-colors font-medium"
        >
          <Zap className="w-3.5 h-3.5 text-[#0AA15F] dark:text-[#34E89A]" />
          <span>Invert All (NOT)</span>
        </button>
        <button
          onClick={shiftLeft}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#0A3324] border border-slate-200 dark:border-[#1F6B4C]/40 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#1F6B4C] dark:text-[#34E89A]" />
          <span>Shift Left (&lt;&lt; 1)</span>
        </button>
        <button
          onClick={shiftRight}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#0A3324] border border-slate-200 dark:border-[#1F6B4C]/40 transition-colors font-medium"
        >
          <ArrowRight className="w-3.5 h-3.5 text-[#1F6B4C] dark:text-[#34E89A]" />
          <span>Shift Right (&gt;&gt; 1)</span>
        </button>
        <button
          onClick={clearBits}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#0A3324] border border-slate-200 dark:border-[#1F6B4C]/40 transition-colors font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#1F6B4C] dark:text-[#34E89A]" />
          <span>Clear (0s)</span>
        </button>
        <button
          onClick={setAllBits}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#0A3324] border border-slate-200 dark:border-[#1F6B4C]/40 transition-colors font-medium"
        >
          <span>Set All (1s)</span>
        </button>
      </div>

      {/* Bit Array Grid Display */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-[#1F6B4C] dark:text-slate-400 flex justify-between px-1">
          <span>MSB (Bit {bitWidth - 1} / Sign Bit)</span>
          <span>LSB (Bit 0 / Weight 1)</span>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 sm:gap-2">
          {bits.map((bitVal, idx) => {
            const bitPosition = bitWidth - 1 - idx;
            const isNibbleStart = bitPosition % 4 === 3 && idx !== 0;

            return (
              <div
                key={idx}
                className={`flex flex-col items-center ${
                  isNibbleStart ? 'ml-1 sm:ml-2 border-l border-slate-300 dark:border-[#1F6B4C] pl-1 sm:pl-2' : ''
                }`}
              >
                {/* Bit Position Weight label */}
                <span className="text-[10px] font-mono text-[#1F6B4C] dark:text-slate-400 mb-1 font-semibold">
                  {bitPosition}
                </span>

                {/* Interactive Bit Toggle Button */}
                <button
                  onClick={() => toggleBit(idx)}
                  aria-pressed={bitVal === 1}
                  aria-label={`Bit ${bitPosition}, weight 2 to the power ${bitPosition}, currently ${bitVal}`}
                  className={`w-full aspect-square max-w-[42px] rounded-xl font-mono text-base sm:text-lg font-bold flex items-center justify-center transition-all duration-150 transform active:scale-95 shadow-sm ${
                    bitVal === 1
                      ? 'bg-[#0A3324] text-[#34E89A] border-2 border-[#34E89A] shadow-md ring-2 ring-[#34E89A]/30'
                      : 'bg-[#F4FAF9] dark:bg-[#030D08] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]/60'
                  }`}
                  title={`Bit ${bitPosition} (Weight: 2^${bitPosition} = ${Math.pow(2, bitPosition)})`}
                >
                  {bitVal}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Calculated Output Grid */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400">
          Live Calculated Output
        </span>
        <ShareButton
          label="Share"
          shareTitle="BitForge Bit Grid"
          getText={() =>
            `BitForge Bit Grid (${bitWidth}-bit)\nBinary: ${binaryString}\nUnsigned Denary: ${denaryVal}\nSigned (2's Comp): ${signedVal.toString()}\nHexadecimal: 0x${hexVal}\nOctal: 0o${octalVal}`
          }
          historyEntry={() => ({
            mode: 'bitgrid',
            operation: `Shared ${bitWidth}-bit grid state`,
            input: binaryString,
            inputLabel: `${bitWidth}-bit Binary`,
            output: `Denary ${denaryVal} / Signed ${signedVal.toString()} / 0x${hexVal} / 0o${octalVal}`,
            outputLabel: 'All Representations',
          })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        
        {/* Unsigned Decimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#05170D] p-3.5 rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40">
          <div className="flex items-center justify-between text-xs text-[#1F6B4C] dark:text-[#34E89A] mb-1">
            <span className="font-bold">Unsigned Denary</span>
            <span className="font-mono text-[10px]">Base 10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#0A3324] dark:text-[#D9FFF4] truncate">
              {denaryVal}
            </span>
            <button
              onClick={() => copyVal(denaryVal, 'denary', 'Unsigned Denary')}
              className="p-1.5 text-[#1F6B4C] hover:text-[#0A3324] dark:hover:text-[#34E89A]"
              aria-label={copiedKey === 'denary' ? 'Copied unsigned denary value' : failedKey === 'denary' ? 'Copy failed — clipboard unavailable' : 'Copy unsigned denary value'}
            >
              {copiedKey === 'denary' ? <Check className="w-4 h-4 text-emerald-500" /> : failedKey === 'denary' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Signed Two's Complement Decimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#05170D] p-3.5 rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40">
          <div className="flex items-center justify-between text-xs text-[#1F6B4C] dark:text-[#34E89A] mb-1">
            <span className="font-bold">Signed (2's Comp)</span>
            <span className="font-mono text-[10px]">{isMsbSet ? 'Negative' : 'Positive'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-mono text-lg font-bold truncate ${signedVal < 0n ? 'text-amber-600 dark:text-amber-400' : 'text-[#0A3324] dark:text-[#D9FFF4]'}`}>
              {signedVal.toString()}
            </span>
            <button
              onClick={() => copyVal(signedVal.toString(), 'signed', "Signed (2's Comp)")}
              className="p-1.5 text-[#1F6B4C] hover:text-[#0A3324] dark:hover:text-[#34E89A]"
              aria-label={copiedKey === 'signed' ? "Copied signed two's complement value" : failedKey === 'signed' ? 'Copy failed — clipboard unavailable' : "Copy signed two's complement value"}
            >
              {copiedKey === 'signed' ? <Check className="w-4 h-4 text-emerald-500" /> : failedKey === 'signed' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hexadecimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#05170D] p-3.5 rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40">
          <div className="flex items-center justify-between text-xs text-[#1F6B4C] dark:text-[#34E89A] mb-1">
            <span className="font-bold">Hexadecimal</span>
            <span className="font-mono text-[10px]">Base 16</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#0A3324] dark:text-[#D9FFF4] truncate">
              0x{hexVal}
            </span>
            <button
              onClick={() => copyVal(`0x${hexVal}`, 'hex', 'Hexadecimal')}
              className="p-1.5 text-[#1F6B4C] hover:text-[#0A3324] dark:hover:text-[#34E89A]"
              aria-label={copiedKey === 'hex' ? 'Copied hexadecimal value' : failedKey === 'hex' ? 'Copy failed — clipboard unavailable' : 'Copy hexadecimal value'}
            >
              {copiedKey === 'hex' ? <Check className="w-4 h-4 text-emerald-500" /> : failedKey === 'hex' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Octal */}
        <div className="bg-[#F4FAF9] dark:bg-[#05170D] p-3.5 rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40">
          <div className="flex items-center justify-between text-xs text-[#1F6B4C] dark:text-[#34E89A] mb-1">
            <span className="font-bold">Octal</span>
            <span className="font-mono text-[10px]">Base 8</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#0A3324] dark:text-[#D9FFF4] truncate">
              0o{octalVal}
            </span>
            <button
              onClick={() => copyVal(`0o${octalVal}`, 'octal', 'Octal')}
              className="p-1.5 text-[#1F6B4C] hover:text-[#0A3324] dark:hover:text-[#34E89A]"
              aria-label={copiedKey === 'octal' ? 'Copied octal value' : failedKey === 'octal' ? 'Copy failed — clipboard unavailable' : 'Copy octal value'}
            >
              {copiedKey === 'octal' ? <Check className="w-4 h-4 text-emerald-500" /> : failedKey === 'octal' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

