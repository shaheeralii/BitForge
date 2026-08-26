import React, { useState } from 'react';
import { textToNumberSystems } from '../utils/converter';
import { Type, Copy, Check } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';

export const AsciiConverterCard: React.FC = () => {
  const [text, setText] = useState<string>('Hello World!');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const converted = textToNumberSystems(text);

  const copyVal = (val: string, key: string, outputLabel: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);

    addEntry({
      mode: 'ascii',
      operation: `Text \u2192 ${outputLabel}`,
      input: text,
      inputLabel: 'Text',
      output: val,
      outputLabel,
    });
  };

  return (
    <div className="bg-white dark:bg-[#072818] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#1F6B4C]/30 pb-4">
        <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A]">
          <Type className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#0A3324] dark:text-[#D9FFF4]">
            Text & ASCII Character Encoding
          </h2>
          <p className="text-xs text-[#1F6B4C] dark:text-[#34E89A]/80 mt-0.5">
            Convert text strings into 8-bit Binary, Hexadecimal, Octal, and Decimal character codes
          </p>
        </div>
      </div>

      {/* Input Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A] mb-2">
          Text Input
        </label>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text..."
          className="w-full font-mono text-lg font-bold px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-[#1F6B4C]/60 bg-slate-50 dark:bg-[#030D08] text-[#0A3324] dark:text-[#D9FFF4] outline-none focus:border-[#34E89A] focus:ring-2 focus:ring-[#34E89A]/20 transition-all"
        />
      </div>

      {/* Stream Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Full Binary Stream */}
        <div className="bg-[#0A3324] text-white p-4 rounded-xl border border-[#1F6B4C]/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#34E89A]">
            <span className="font-bold">8-Bit Binary Stream</span>
            <button
              onClick={() => copyVal(converted.fullBinary, 'fullBin', '8-Bit Binary Stream')}
              className="p-1 text-slate-400 hover:text-white"
            >
              {copiedKey === 'fullBin' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-[#D9FFF4] break-all bg-[#072818]/80 p-2.5 rounded-lg border border-[#1F6B4C]/40">
            {converted.fullBinary || '(empty)'}
          </div>
        </div>

        {/* Full Hex Stream */}
        <div className="bg-[#0A3324] text-white p-4 rounded-xl border border-[#1F6B4C]/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#34E89A]">
            <span className="font-bold">Hexadecimal Bytes</span>
            <button
              onClick={() => copyVal(converted.fullHex, 'fullHex', 'Hexadecimal Bytes')}
              className="p-1 text-slate-400 hover:text-white"
            >
              {copiedKey === 'fullHex' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-[#D9FFF4] break-all bg-[#072818]/80 p-2.5 rounded-lg border border-[#1F6B4C]/40">
            {converted.fullHex || '(empty)'}
          </div>
        </div>

      </div>

      {/* Character-by-Character Table */}
      {text.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">
            Character-by-Character Encoding Table
          </h3>

          <div className="overflow-x-auto scrollbar-none rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-[#D9FFF4] border-b border-slate-200 dark:border-[#1F6B4C]/40">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Char</th>
                  <th className="px-4 py-2.5 font-bold">Decimal ASCII</th>
                  <th className="px-4 py-2.5 font-bold">Binary (8-Bit)</th>
                  <th className="px-4 py-2.5 font-bold">Hexadecimal</th>
                  <th className="px-4 py-2.5 font-bold">Octal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F6B4C]/30 text-[#0A3324] dark:text-slate-100">
                {text.split('').map((char, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#0A3324]/30">
                    <td className="px-4 py-2 font-bold text-[#0AA15F] dark:text-[#34E89A]">
                      {char === ' ' ? '<space>' : char}
                    </td>
                    <td className="px-4 py-2">{converted.asciiCodes[i]}</td>
                    <td className="px-4 py-2 font-semibold">{converted.binaryList[i]}</td>
                    <td className="px-4 py-2">0x{converted.hexList[i]}</td>
                    <td className="px-4 py-2">0o{converted.octalList[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

