import React, { useRef, useState } from 'react';
import { textToNumberSystems } from '../utils/converter';
import { Type, Copy, Check, AlertCircle } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { ShareButton } from './ShareButton';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';
import { copyTextSafe } from '../utils/shareUtils';

export const AsciiConverterCard: React.FC = () => {
  const [text, setText] = useState<string>('Hello World!');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [wasTruncated, setWasTruncated] = useState(false);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();
  const inputRef = useRef<HTMLInputElement>(null);

  // Each character renders its own row in the per-character breakdown table
  // below, so an unbounded paste turns directly into an unbounded amount of
  // DOM work. This is a plain text-conversion tool, not a document editor —
  // 500 characters is generous for any educational example while keeping a
  // pasted novel from freezing the tab.
  const MAX_TEXT_LENGTH = 500;

  const handleTextChange = (value: string) => {
    if (value.length > MAX_TEXT_LENGTH) {
      setText(value.slice(0, MAX_TEXT_LENGTH));
      setWasTruncated(true);
      setSafeTimeout(() => setWasTruncated(false), 2500);
    } else {
      setText(value);
    }
  };

  const converted = textToNumberSystems(text);

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
      mode: 'ascii',
      operation: `Text \u2192 ${outputLabel}`,
      input: text,
      inputLabel: 'Text',
      output: val,
      outputLabel,
    });
  };

  useRegisterShortcutTarget({
    focusInput: () => inputRef.current?.focus(),
    copyResult: () => copyVal(converted.fullHex, 'fullHex', 'Hexadecimal Bytes'),
    clearInput: () => setText(''),
  });

  return (
    <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 border-b border-[var(--bf-muted)]/30 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)]">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-semibold tracking-wide text-[var(--bf-heading)]">
              Text & UTF-8 Encoding
            </h2>
            <p className="text-xs text-[var(--bf-accent)]/80 mt-0.5">
              Convert text into UTF-8 bytes shown as Binary, Hexadecimal, Octal, and Decimal. Standard ASCII characters (0-127) map to a single 8-bit byte.
            </p>
          </div>
        </div>
        {text.length > 0 && (
          <ShareButton
            label="Share"
            shareTitle="BitForge Text & ASCII"
            getText={() =>
              `BitForge Text & ASCII Encoding\nText: ${text}\nBinary: ${converted.fullBinary}\nHex: ${converted.fullHex}`
            }
            historyEntry={() => ({
              mode: 'ascii',
              operation: 'Shared text encoding summary',
              input: text,
              inputLabel: 'Text',
              output: converted.fullHex,
              outputLabel: 'Hexadecimal Bytes',
            })}
          />
        )}
      </div>

      {/* Input Field */}
      <div>
        <label htmlFor="bitforge-ascii-input" className="block text-xs font-bold uppercase tracking-wider text-[var(--bf-accent)] mb-2">
          Text Input
        </label>
        <input
          ref={inputRef}
          id="bitforge-ascii-input"
          type="text"
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Enter text..."
          aria-describedby={wasTruncated ? 'bitforge-ascii-truncated' : undefined}
          className="w-full font-mono text-lg font-bold px-4 py-3 rounded-xl border border-[var(--bf-muted)]/60 bg-[var(--bf-surface-deep)] text-[var(--bf-heading)] outline-none focus:border-[var(--bf-accent)] focus:ring-2 focus:ring-[var(--bf-accent)]/20 transition-all"
        />
        {wasTruncated && (
          <p id="bitforge-ascii-truncated" role="status" className="mt-1.5 text-xs text-amber-400">
            Trimmed to {MAX_TEXT_LENGTH} characters — that's the limit for this tool.
          </p>
        )}
      </div>

      {/* Stream Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Full Binary Stream */}
        <div className="bg-[var(--bf-chip)] text-[var(--bf-heading)] p-4 rounded-xl border border-[var(--bf-muted)]/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--bf-accent)]">
            <span className="font-bold">8-Bit Binary Stream</span>
            <button
              onClick={() => copyVal(converted.fullBinary, 'fullBin', '8-Bit Binary Stream')}
              className="p-1 text-[var(--bf-heading)]/65 hover:text-white"
              aria-label={copiedKey === 'fullBin' ? 'Copied binary stream' : failedKey === 'fullBin' ? 'Copy failed — clipboard unavailable' : 'Copy 8-bit binary stream'}
            >
              {copiedKey === 'fullBin' ? <Check className="w-4 h-4 text-emerald-400" /> : failedKey === 'fullBin' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-[var(--bf-heading)] break-all bg-[var(--bf-surface)]/80 p-2.5 rounded-lg border border-[var(--bf-muted)]/40">
            {converted.fullBinary || '(empty)'}
          </div>
        </div>

        {/* Full Hex Stream */}
        <div className="bg-[var(--bf-chip)] text-[var(--bf-heading)] p-4 rounded-xl border border-[var(--bf-muted)]/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--bf-accent)]">
            <span className="font-bold">Hexadecimal Bytes</span>
            <button
              onClick={() => copyVal(converted.fullHex, 'fullHex', 'Hexadecimal Bytes')}
              className="p-1 text-[var(--bf-heading)]/65 hover:text-white"
              aria-label={copiedKey === 'fullHex' ? 'Copied hexadecimal bytes' : failedKey === 'fullHex' ? 'Copy failed — clipboard unavailable' : 'Copy hexadecimal bytes'}
            >
              {copiedKey === 'fullHex' ? <Check className="w-4 h-4 text-emerald-400" /> : failedKey === 'fullHex' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-[var(--bf-heading)] break-all bg-[var(--bf-surface)]/80 p-2.5 rounded-lg border border-[var(--bf-muted)]/40">
            {converted.fullHex || '(empty)'}
          </div>
        </div>

      </div>

      {/* Character-by-Character Table */}
      {text.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-display font-medium uppercase tracking-wide text-[var(--bf-accent)]">
            Character-by-Character Encoding Table
          </h3>

          <div className="overflow-x-auto scrollbar-none rounded-xl border border-[var(--bf-muted)]/40">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[var(--bf-chip-alt)] text-[var(--bf-heading)] border-b border-[var(--bf-muted)]/40">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Char</th>
                  <th className="px-4 py-2.5 font-bold">Encoding</th>
                  <th className="px-4 py-2.5 font-bold">Decimal (UTF-8 Bytes)</th>
                  <th className="px-4 py-2.5 font-bold">Binary (8-Bit/Byte)</th>
                  <th className="px-4 py-2.5 font-bold">Hexadecimal</th>
                  <th className="px-4 py-2.5 font-bold">Octal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bf-muted)]/30 text-[var(--bf-heading)]">
                {converted.characters.map((c, i) => (
                  <tr key={i} className="hover:bg-[var(--bf-chip)]/30">
                    <td className="px-4 py-2 font-bold text-[var(--bf-accent)]">
                      {c.char === ' ' ? '<space>' : c.char}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.isAscii
                            ? 'bg-[var(--bf-chip)] text-[var(--bf-accent)]'
                            : 'bg-amber-900/40 text-amber-300'
                        }`}
                      >
                        {c.isAscii ? 'ASCII' : `UTF-8 \u00d7${c.bytes.length}`}
                      </span>
                    </td>
                    <td className="px-4 py-2">{c.bytes.join(' ')}</td>
                    <td className="px-4 py-2 font-semibold">
                      {c.bytes.map(b => b.toString(2).padStart(8, '0')).join(' ')}
                    </td>
                    <td className="px-4 py-2">
                      {c.bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
                    </td>
                    <td className="px-4 py-2">
                      {c.bytes.map(b => '0o' + b.toString(8).padStart(3, '0')).join(' ')}
                    </td>
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

