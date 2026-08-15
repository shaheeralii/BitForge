import React, { useState } from 'react';
import { Binary, RotateCcw, ArrowLeft, ArrowRight, Zap, Copy, Check } from 'lucide-react';

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

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#1E132B] rounded-xl border border-slate-200 dark:border-[#43637E]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#43637E]/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#321E48] text-[#65DCD5] shadow-sm">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#321E48] dark:text-[#D9FFF4]">
                Interactive Bit Grid Matrix
              </h2>
              <p className="text-xs text-[#43637E] dark:text-[#65DCD5]/80 mt-0.5 font-medium">
                Click individual bit weights to toggle state and evaluate signed/unsigned representations
              </p>
            </div>
          </div>
        </div>

        {/* Bit Width Controls */}
        <div className="flex items-center gap-1.5 bg-[#F4FAF9] dark:bg-[#251737] p-1 rounded-lg border border-slate-200 dark:border-[#43637E]/40 text-xs font-bold">
          {([8, 16, 32] as const).map(w => (
            <button
              key={w}
              onClick={() => handleWidthChange(w)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                bitWidth === w
                  ? 'bg-[#321E48] text-[#65DCD5] shadow-sm font-bold border border-[#65DCD5]/40'
                  : 'text-[#43637E] dark:text-slate-400 hover:text-[#321E48] dark:hover:text-[#D9FFF4]'
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#251737] text-[#321E48] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#321E48] border border-slate-200 dark:border-[#43637E]/40 transition-colors font-medium"
        >
          <Zap className="w-3.5 h-3.5 text-[#0D9488] dark:text-[#65DCD5]" />
          <span>Invert All (NOT)</span>
        </button>
        <button
          onClick={shiftLeft}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#251737] text-[#321E48] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#321E48] border border-slate-200 dark:border-[#43637E]/40 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#43637E] dark:text-[#65DCD5]" />
          <span>Shift Left (&lt;&lt; 1)</span>
        </button>
        <button
          onClick={shiftRight}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#251737] text-[#321E48] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#321E48] border border-slate-200 dark:border-[#43637E]/40 transition-colors font-medium"
        >
          <ArrowRight className="w-3.5 h-3.5 text-[#43637E] dark:text-[#65DCD5]" />
          <span>Shift Right (&gt;&gt; 1)</span>
        </button>
        <button
          onClick={clearBits}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#251737] text-[#321E48] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#321E48] border border-slate-200 dark:border-[#43637E]/40 transition-colors font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#43637E] dark:text-[#65DCD5]" />
          <span>Clear (0s)</span>
        </button>
        <button
          onClick={setAllBits}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4FAF9] dark:bg-[#251737] text-[#321E48] dark:text-[#D9FFF4] hover:bg-[#D9FFF4] dark:hover:bg-[#321E48] border border-slate-200 dark:border-[#43637E]/40 transition-colors font-medium"
        >
          <span>Set All (1s)</span>
        </button>
      </div>

      {/* Bit Array Grid Display */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-[#43637E] dark:text-slate-400 flex justify-between px-1">
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
                  isNibbleStart ? 'ml-1 sm:ml-2 border-l border-slate-300 dark:border-[#43637E] pl-1 sm:pl-2' : ''
                }`}
              >
                {/* Bit Position Weight label */}
                <span className="text-[10px] font-mono text-[#43637E] dark:text-slate-400 mb-1 font-semibold">
                  {bitPosition}
                </span>

                {/* Interactive Bit Toggle Button */}
                <button
                  onClick={() => toggleBit(idx)}
                  className={`w-full aspect-square max-w-[42px] rounded-xl font-mono text-base sm:text-lg font-bold flex items-center justify-center transition-all duration-150 transform active:scale-95 shadow-sm ${
                    bitVal === 1
                      ? 'bg-[#321E48] text-[#65DCD5] border-2 border-[#65DCD5] shadow-md ring-2 ring-[#65DCD5]/30'
                      : 'bg-[#F4FAF9] dark:bg-[#130B1C] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-[#43637E]/40 hover:border-[#65DCD5]/60'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        
        {/* Unsigned Decimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#180E24] p-3.5 rounded-xl border border-slate-200 dark:border-[#43637E]/40">
          <div className="flex items-center justify-between text-xs text-[#43637E] dark:text-[#65DCD5] mb-1">
            <span className="font-bold">Unsigned Denary</span>
            <span className="font-mono text-[10px]">Base 10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#321E48] dark:text-[#D9FFF4] truncate">
              {denaryVal}
            </span>
            <button
              onClick={() => copyVal(denaryVal, 'denary')}
              className="p-1.5 text-[#43637E] hover:text-[#321E48] dark:hover:text-[#65DCD5]"
            >
              {copiedKey === 'denary' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Signed Two's Complement Decimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#180E24] p-3.5 rounded-xl border border-slate-200 dark:border-[#43637E]/40">
          <div className="flex items-center justify-between text-xs text-[#43637E] dark:text-[#65DCD5] mb-1">
            <span className="font-bold">Signed (2's Comp)</span>
            <span className="font-mono text-[10px]">{isMsbSet ? 'Negative' : 'Positive'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-mono text-lg font-bold truncate ${signedVal < 0n ? 'text-amber-600 dark:text-amber-400' : 'text-[#321E48] dark:text-[#D9FFF4]'}`}>
              {signedVal.toString()}
            </span>
            <button
              onClick={() => copyVal(signedVal.toString(), 'signed')}
              className="p-1.5 text-[#43637E] hover:text-[#321E48] dark:hover:text-[#65DCD5]"
            >
              {copiedKey === 'signed' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hexadecimal */}
        <div className="bg-[#F4FAF9] dark:bg-[#180E24] p-3.5 rounded-xl border border-slate-200 dark:border-[#43637E]/40">
          <div className="flex items-center justify-between text-xs text-[#43637E] dark:text-[#65DCD5] mb-1">
            <span className="font-bold">Hexadecimal</span>
            <span className="font-mono text-[10px]">Base 16</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#321E48] dark:text-[#D9FFF4] truncate">
              0x{hexVal}
            </span>
            <button
              onClick={() => copyVal(`0x${hexVal}`, 'hex')}
              className="p-1.5 text-[#43637E] hover:text-[#321E48] dark:hover:text-[#65DCD5]"
            >
              {copiedKey === 'hex' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Octal */}
        <div className="bg-[#F4FAF9] dark:bg-[#180E24] p-3.5 rounded-xl border border-slate-200 dark:border-[#43637E]/40">
          <div className="flex items-center justify-between text-xs text-[#43637E] dark:text-[#65DCD5] mb-1">
            <span className="font-bold">Octal</span>
            <span className="font-mono text-[10px]">Base 8</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-[#321E48] dark:text-[#D9FFF4] truncate">
              0o{octalVal}
            </span>
            <button
              onClick={() => copyVal(`0o${octalVal}`, 'octal')}
              className="p-1.5 text-[#43637E] hover:text-[#321E48] dark:hover:text-[#65DCD5]"
            >
              {copiedKey === 'octal' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

