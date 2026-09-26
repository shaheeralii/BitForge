import React, { useRef, useState } from 'react';
import { Binary, RotateCcw, ArrowLeft, ArrowRight, Zap, Copy, Check, AlertCircle } from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { ShareButton } from './ShareButton';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';
import { copyTextSafe } from '../utils/shareUtils';
import { BitCellRow } from './BitCellRow';
import { BitRepresentationPanel } from './BitRepresentationPanel';
import { BitRepresentationInsights } from './BitRepresentationInsights';
import {
  RepresentationId,
  REPRESENTATION_LABELS,
  getBitGridMeta,
  formatValueForInput,
  formatRange,
  decodeBits,
  encodeValue,
  encodeAllSigned,
  getRepresentationRange,
  invertBitString,
  resizeBits,
  bitsToHex,
  bitsToOctal,
} from '../utils/signedRepresentations';

const REPR_TABS: RepresentationId[] = ['unsigned', 'sign-magnitude', 'ones-complement', 'twos-complement'];
const BIT_WIDTHS = [8, 16, 32] as const;
type BitWidth = typeof BIT_WIDTHS[number];

const DEFAULT_WIDTH: BitWidth = 8;
const DEFAULT_REPRESENTATION: RepresentationId = 'twos-complement';
const DEFAULT_VALUE = -25;

export const BitRepresentationLab: React.FC = () => {
  const [bitWidth, setBitWidth] = useState<BitWidth>(DEFAULT_WIDTH);
  const [activeRepresentation, setActiveRepresentation] = useState<RepresentationId>(DEFAULT_REPRESENTATION);
  const [bits, setBits] = useState<string>(() => encodeValue(DEFAULT_VALUE, DEFAULT_REPRESENTATION, DEFAULT_WIDTH).bits);
  const [denaryDraft, setDenaryDraft] = useState<string>(DEFAULT_VALUE.toString());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();
  const denaryInputRef = useRef<HTMLInputElement>(null);

  const syncDenary = (nextBits: string, representation: RepresentationId) => {
    // formatValueForInput, not toString(): Sign-Magnitude's 10000000 and
    // One's Complement's 11111111 decode to -0, and default conversion would
    // show those as plain "0", contradicting the page's own note that these
    // systems have two distinct zeros. The ASCII form keeps parseInt working
    // so the field stays editable.
    setDenaryDraft(formatValueForInput(decodeBits(nextBits, representation)));
  };

  const applyBits = (nextBits: string) => {
    setBits(nextBits);
    syncDenary(nextBits, activeRepresentation);
  };

  const handleToggleBit = (index: number) => {
    const arr = bits.split('');
    arr[index] = arr[index] === '0' ? '1' : '0';
    applyBits(arr.join(''));
  };

  const handleBitWidthChange = (newWidth: BitWidth) => {
    const resized = resizeBits(bits, newWidth, activeRepresentation);
    setBitWidth(newWidth);
    applyBits(resized);
  };

  /**
   * Switching representation keeps the *number* the user is working with and
   * re-encodes the bits for the newly selected system — it does not keep the
   * bits and re-read them as a different number. That direction is the
   * lesson of this control: "-5 is 10000101 here but 11111011 there".
   * (The reverse reading — one fixed pattern under all four systems at once —
   * is what the "Same Bits, Different Meaning" panel is for, so nothing is
   * lost by not doing it here too.)
   *
   * The value carried over is whatever the user actually typed when that's a
   * valid integer, not the currently-encoded value. This matters at the
   * boundaries: typing -128 under Sign-Magnitude is out of range and leaves
   * the bits untouched, but switching to Two's Complement should then encode
   * the -128 they asked for rather than silently reverting to whatever the
   * stale bits happened to mean.
   */
  const handleRepresentationChange = (rep: RepresentationId) => {
    const typed = parseInt(denaryDraft.trim(), 10);
    const carried = isNaN(typed) ? decodeBits(bits, activeRepresentation) : typed;

    setActiveRepresentation(rep);
    setDenaryDraft(formatValueForInput(carried));

    // If the value can't be represented in the newly selected system (e.g.
    // -128 under Sign-Magnitude), leave the bits alone; the range warning
    // under the input explains why, which is itself the point being taught.
    const enc = encodeValue(carried, rep, bitWidth);
    if (enc.valid) setBits(enc.bits);
  };

  const range = getRepresentationRange(activeRepresentation, bitWidth);
  const cleanedDraft = denaryDraft.trim();
  const isPending = cleanedDraft === '' || cleanedDraft === '-' || cleanedDraft === '+';
  const parsedDraft = isPending ? NaN : parseInt(cleanedDraft, 10);
  const isOutOfRange = !isPending && !isNaN(parsedDraft) && (parsedDraft < range.min || parsedDraft > range.max);

  const handleDenaryChange = (val: string) => {
    if (!(val === '' || val === '-' || val === '+' || /^[+-]?\d*$/.test(val))) return;
    setDenaryDraft(val);
    if (val === '' || val === '-' || val === '+') return;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    const enc = encodeValue(parsed, activeRepresentation, bitWidth);
    if (enc.valid) setBits(enc.bits);
  };

  const handleInvert = () => applyBits(invertBitString(bits));
  const handleShiftLeft = () => applyBits(bits.slice(1) + '0');
  const handleShiftRight = () => applyBits('0' + bits.slice(0, -1));
  const handleClear = () => applyBits('0'.repeat(bitWidth));

  const currentValue = decodeBits(bits, activeRepresentation);
  const gridMeta = getBitGridMeta(activeRepresentation, bitWidth);
  const hexVal = bitsToHex(bits);
  const octalVal = bitsToOctal(bits);
  const allSigned = encodeAllSigned(currentValue, bitWidth);

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
      mode: 'bit_representation',
      operation: `${bitWidth}-bit ${REPRESENTATION_LABELS[activeRepresentation]} → ${outputLabel}`,
      input: bits,
      inputLabel: `${bitWidth}-bit Binary`,
      output: val,
      outputLabel,
    });
  };

  const CopyIcon = ({ k }: { k: string }) =>
    copiedKey === k ? <Check className="w-3 h-3 text-emerald-500" /> : failedKey === k ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <Copy className="w-3 h-3" />;

  useRegisterShortcutTarget({
    focusInput: () => denaryInputRef.current?.focus(),
    copyResult: () => copyVal(bits, 'bits', 'Binary Pattern'),
    clearInput: handleClear,
  });

  return (
    <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-5 sm:p-6 shadow-sm space-y-5 transition-colors">

      {/* Header — compact, no separate spaced-out intro block */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shadow-sm shrink-0">
              <Binary className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-display font-semibold tracking-wide text-[var(--bf-heading)]">
                Bit Representation
              </h2>
              <p className="text-xs text-[var(--bf-accent)]/80 font-medium">
                Build, manipulate, and understand binary values at the bit level
              </p>
            </div>
          </div>

          {/* Bit width sits up here in the header rather than beside the denary
              input: it configures the whole workspace, it's set once and rarely
              touched, and keeping it out of the input row leaves that row a
              single full-width field instead of a cramped two-column split. */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--bf-heading)]/50">Bit width</span>
            <div className="flex items-center gap-0.5 bg-[var(--bf-chip-alt)] p-0.5 rounded-md border border-[var(--bf-muted)]/40 text-[11px] font-semibold">
              {BIT_WIDTHS.map(w => (
                <button
                  key={w}
                  onClick={() => handleBitWidthChange(w)}
                  aria-pressed={bitWidth === w}
                  aria-label={`${w}-bit width`}
                  className={`px-2 py-1 rounded transition-all ${
                    bitWidth === w
                      ? 'bg-[var(--bf-chip)] text-[var(--bf-accent)] font-bold'
                      : 'text-[var(--bf-heading)]/65 hover:text-[var(--bf-heading)]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--bf-heading)]/65 leading-relaxed">
          A sequence of bits can represent different values depending on how those bits are interpreted.
        </p>
      </div>

      {/* Control cluster: Denary, Representation Selector, Bit Grid, Bit Controls —
          grouped tightly so they read as one workspace rather than isolated blocks. */}
      <div className="space-y-3.5 pt-3 border-t border-[var(--bf-muted)]/30">

        {/* Denary input — full width; bit width lives in the header above */}
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bitforge-denary-input" className="text-xs font-bold uppercase tracking-wider text-[var(--bf-accent)]">
                Denary
              </label>
              <span className="text-[11px] font-mono text-[var(--bf-heading)]/65 truncate">
                as {REPRESENTATION_LABELS[activeRepresentation]}
              </span>
            </div>
            <input
              ref={denaryInputRef}
              id="bitforge-denary-input"
              type="text"
              inputMode="numeric"
              value={denaryDraft}
              onChange={e => handleDenaryChange(e.target.value)}
              placeholder="e.g. +25 or -25"
              className={`w-full font-mono text-2xl sm:text-3xl font-bold px-4 py-3 rounded-xl border transition-all outline-none bg-[var(--bf-surface-deep)] ${
                isOutOfRange
                  ? 'border-rose-400 text-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-[var(--bf-muted)]/60 text-[var(--bf-heading)] focus:border-[var(--bf-accent)] focus:ring-2 focus:ring-[var(--bf-accent)]/20'
              }`}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bf-heading)]/65">
              <span>Range: {formatRange(activeRepresentation, bitWidth)}</span>
              {isOutOfRange && (
                <span className="flex items-center gap-1 text-rose-500 font-bold">
                  <AlertCircle className="w-3 h-3" /> Outside range — bits unchanged
                </span>
              )}
            </div>
        </div>

        {/* Representation Selector — one of the most important controls on the page: bigger,
            bolder, and more prominent than the bit-width pills above through hierarchy, not size. */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--bf-accent)]">How should these bits be interpreted?</h3>
          <div className="flex items-center gap-1 bg-[var(--bf-chip-alt)] p-1 rounded-lg border border-[var(--bf-muted)]/40 text-sm font-mono font-bold overflow-x-auto scrollbar-none w-fit max-w-full">
            {REPR_TABS.map(id => (
              <button
                key={id}
                onClick={() => handleRepresentationChange(id)}
                aria-current={activeRepresentation === id ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                  activeRepresentation === id
                    ? 'bg-[var(--bf-chip)] text-[var(--bf-accent)] shadow-sm border border-[var(--bf-accent)]/40'
                    : 'text-[var(--bf-heading)]/65 hover:text-[var(--bf-heading)]'
                }`}
              >
                {REPRESENTATION_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Bit Grid */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-[var(--bf-heading)]/65 flex justify-between px-1">
            <span>MSB (Bit {bitWidth - 1})</span>
            <span>LSB (Bit 0)</span>
          </div>
          <BitCellRow
            bits={bits}
            onToggle={handleToggleBit}
            subLabels={gridMeta.labels}
            dividerAfterIndex={gridMeta.dividerAfterIndex}
            highlightIndices={gridMeta.highlightIndices}
          />
        </div>

        {/* Bit Controls — functional, visually subordinate to the grid and representation selector */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button onClick={handleInvert} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bf-chip-alt)] text-[var(--bf-heading)]/80 hover:bg-[var(--bf-chip)] hover:text-[var(--bf-heading)] border border-[var(--bf-muted)]/40 transition-colors font-medium">
            <Zap className="w-3 h-3 text-[var(--bf-accent)]" /><span>Invert</span>
          </button>
          <button onClick={handleShiftLeft} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bf-chip-alt)] text-[var(--bf-heading)]/80 hover:bg-[var(--bf-chip)] hover:text-[var(--bf-heading)] border border-[var(--bf-muted)]/40 transition-colors font-medium">
            <ArrowLeft className="w-3 h-3 text-[var(--bf-accent)]" /><span>Shift Left</span>
          </button>
          <button onClick={handleShiftRight} title="Logical shift right — shifts a 0 into the MSB regardless of representation" className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bf-chip-alt)] text-[var(--bf-heading)]/80 hover:bg-[var(--bf-chip)] hover:text-[var(--bf-heading)] border border-[var(--bf-muted)]/40 transition-colors font-medium">
            <ArrowRight className="w-3 h-3 text-[var(--bf-accent)]" /><span>Logical Shift Right</span>
          </button>
          <button onClick={handleClear} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bf-chip-alt)] text-[var(--bf-heading)]/80 hover:bg-[var(--bf-chip)] hover:text-[var(--bf-heading)] border border-[var(--bf-muted)]/40 transition-colors font-medium">
            <RotateCcw className="w-3 h-3 text-[var(--bf-accent)]" /><span>Clear</span>
          </button>
        </div>
      </div>

      {/* Representation Panel — THE centerpiece of the page */}
      <div className="rounded-xl border border-[var(--bf-accent)]/30 bg-[var(--bf-surface-inset)] p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--bf-muted)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--bf-accent)]" />
          <h3 className="text-sm sm:text-base font-display font-bold text-[var(--bf-heading)]">
            {REPRESENTATION_LABELS[activeRepresentation]}
          </h3>
        </div>
        <BitRepresentationPanel representation={activeRepresentation} bits={bits} bitWidth={bitWidth} />
      </div>

      {/* Secondary: Same Number, Different Encoding */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--bf-accent)]">Same Number, Different Encoding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['sign-magnitude', 'ones-complement', 'twos-complement'] as const).map(id => {
            const enc = allSigned[id];
            const isActive = id === activeRepresentation;
            return (
              <div
                key={id}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'bg-[var(--bf-chip)] border-[var(--bf-accent)]/50'
                    : 'bg-[var(--bf-surface-inset)] border-[var(--bf-muted)]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--bf-heading)]/65">{REPRESENTATION_LABELS[id]}</span>
                  {isActive && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--bf-accent)] shrink-0">Current</span>
                  )}
                </div>
                {enc.valid ? (
                  <div className={`font-mono text-sm font-bold break-all mt-0.5 ${isActive ? 'text-[var(--bf-accent)]' : 'text-[var(--bf-heading)]'}`}>{enc.bits}</div>
                ) : (
                  <div className="text-[11px] text-rose-400 mt-0.5 leading-snug">Not representable</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower / optional reference — closed by default via the existing disclosure pattern */}
      <BitRepresentationInsights bits={bits} bitWidth={bitWidth} currentValue={currentValue} />

      {/* Compact secondary metadata — supporting details, not the lesson */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-[var(--bf-muted)]/30">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-[var(--bf-heading)]/65">
          {[
            { key: 'bits', label: 'Binary', value: bits },
            { key: 'hex', label: 'Hex', value: `0x${hexVal}` },
            { key: 'octal', label: 'Octal', value: octalVal },
          ].map(row => (
            <span key={row.key} className="inline-flex items-center gap-1">
              <span className="text-[var(--bf-heading)]/50">{row.label}:</span>
              <span className="text-[var(--bf-heading)] font-semibold">{row.value}</span>
              <button
                onClick={() => copyVal(row.value, row.key, row.label)}
                className="p-0.5 text-[var(--bf-muted)] hover:text-[var(--bf-accent)]"
                aria-label={`Copy ${row.label} value`}
              >
                <CopyIcon k={row.key} />
              </button>
            </span>
          ))}
        </div>
        <ShareButton
          label="Share"
          shareTitle="BitForge Bit Representation"
          getText={() =>
            `BitForge Bit Representation (${bitWidth}-bit)\nBinary: ${bits}\nHex: 0x${hexVal}\nOctal: ${octalVal}\n${REPRESENTATION_LABELS[activeRepresentation]}: ${currentValue}`
          }
          historyEntry={() => ({
            mode: 'bit_representation',
            operation: `Shared ${bitWidth}-bit pattern`,
            input: bits,
            inputLabel: `${bitWidth}-bit Binary`,
            output: `0x${hexVal} / ${octalVal} / ${REPRESENTATION_LABELS[activeRepresentation]} ${currentValue}`,
            outputLabel: 'All Representations',
          })}
        />
      </div>
    </div>
  );
};
