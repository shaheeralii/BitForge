import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers3, Copy, Check, AlertCircle, HelpCircle, ArrowRight, ArrowLeftRight,
  ChevronDown, Gauge, Sparkles, Info,
} from 'lucide-react';
import { useHistory } from '../context/HistoryContext';
import { useRegisterShortcutTarget } from '../context/ShortcutTargetContext';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';
import { copyTextSafe } from '../utils/shareUtils';
import { ShareButton } from './ShareButton';
import { FloatBitStrip, FloatSegment } from './FloatBitStrip';
import {
  decimalToFloatBreakdown, decodeBits, specialValueBits, validateCustomFormat,
  makeCustomFormat, totalBits, biasOf, approxDecimalDigits, CUSTOM_FORMAT_LIMITS,
  numberToFloatBreakdown, SPECIAL_VALUE_BLURBS, STANDARD_FORMATS,
  FloatBreakdown, FPStep, FloatCategory, FloatFormat, BitDecodeResult,
} from '../utils/floatingPoint';

type Direction = 'encode' | 'decode';
type FormatId = 'binary16' | 'binary32' | 'binary64' | 'custom';

const ENCODE_PRESETS: { label: string; value: string }[] = [
  { label: '13.25', value: '13.25' },
  { label: '-6.5', value: '-6.5' },
  { label: '0.1', value: '0.1' },
  { label: '100.5', value: '100.5' },
  { label: 'Tiny (1e-30)', value: '1e-30' },
  { label: 'Huge (1e30)', value: '1e30' },
  { label: 'Zero', value: '0' },
];

const CATEGORY_LABEL: Record<FloatCategory, string> = {
  zero: 'Zero', normal: 'Normal', subnormal: 'Subnormal', infinity: 'Infinity', nan: 'NaN',
};

export const FloatingPointCard: React.FC = () => {
  const [direction, setDirection] = useState<Direction>('encode');
  const [formatId, setFormatId] = useState<FormatId>('binary32');
  const [customExpBits, setCustomExpBits] = useState<number>(5);
  const [customFracBits, setCustomFracBits] = useState<number>(12);

  const customError = formatId === 'custom' ? validateCustomFormat(customExpBits, customFracBits) : null;
  const format: FloatFormat = formatId === 'custom' ? makeCustomFormat(customExpBits, customFracBits) : STANDARD_FORMATS[formatId];

  return (
    <div className="bg-white dark:bg-[#072818] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-5 sm:p-6 shadow-sm space-y-6 transition-colors">

      {/* Header */}
      <div className="border-b border-slate-100 dark:border-[#1F6B4C]/30 pb-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A] shadow-sm shrink-0"><Layers3 className="w-5 h-5" /></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-display font-semibold tracking-wide text-[#0A3324] dark:text-[#D9FFF4]">Floating-Point Explorer</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-[#34E89A] border border-slate-200 dark:border-[#1F6B4C]/40">
                {format.isStandard ? `IEEE 754 \u2022 ${format.label}` : 'Custom Format'}
              </span>
            </div>
            <p className="text-xs text-[#1F6B4C] dark:text-[#34E89A]/80 mt-0.5 font-medium">See how numbers are stored using sign, exponent, and fraction bits.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F4FAF9] dark:bg-[#0A2E1D] p-1 rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 text-xs font-bold w-fit max-w-full overflow-x-auto scrollbar-none">
          <button onClick={() => setDirection('encode')} aria-pressed={direction === 'encode'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${direction === 'encode' ? 'bg-[#0A3324] text-[#34E89A] shadow-sm border border-[#34E89A]/40' : 'text-[#1F6B4C] dark:text-slate-400 hover:text-[#0A3324] dark:hover:text-[#D9FFF4]'}`}>
            <ArrowRight className="w-3.5 h-3.5" /><span>Decimal → Floating Point</span>
          </button>
          <button onClick={() => setDirection('decode')} aria-pressed={direction === 'decode'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${direction === 'decode' ? 'bg-[#0A3324] text-[#34E89A] shadow-sm border border-[#34E89A]/40' : 'text-[#1F6B4C] dark:text-slate-400 hover:text-[#0A3324] dark:hover:text-[#D9FFF4]'}`}>
            <ArrowLeftRight className="w-3.5 h-3.5" /><span>Floating Point → Decimal</span>
          </button>
        </div>
      </div>

      <FormatPicker
        formatId={formatId} onFormatChange={setFormatId}
        customExpBits={customExpBits} customFracBits={customFracBits}
        onCustomExpBitsChange={setCustomExpBits} onCustomFracBitsChange={setCustomFracBits}
        customError={customError}
      />

      {customError ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" /><span>{customError}</span>
        </div>
      ) : direction === 'encode' ? <EncodePanel format={format} /> : <DecodePanel format={format} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Format picker
// ---------------------------------------------------------------------------

const FormatPicker: React.FC<{
  formatId: FormatId; onFormatChange: (id: FormatId) => void;
  customExpBits: number; customFracBits: number;
  onCustomExpBitsChange: (n: number) => void; onCustomFracBitsChange: (n: number) => void;
  customError: string | null;
}> = ({ formatId, onFormatChange, customExpBits, customFracBits, onCustomExpBitsChange, onCustomFracBitsChange, customError }) => {
  const options: { id: FormatId; label: string }[] = [
    { id: 'binary16', label: 'Binary16' }, { id: 'binary32', label: 'Binary32' },
    { id: 'binary64', label: 'Binary64' }, { id: 'custom', label: 'Custom' },
  ];
  const customTotal = 1 + (Number.isFinite(customExpBits) ? customExpBits : 0) + (Number.isFinite(customFracBits) ? customFracBits : 0);
  const previewFormat = !customError ? makeCustomFormat(customExpBits, customFracBits) : null;

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Format</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.id} onClick={() => onFormatChange(o.id)} aria-pressed={formatId === o.id}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${formatId === o.id ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {formatId === 'custom' && (
        <div className="bg-[#F4FAF9]/70 dark:bg-[#05170D] rounded-xl border border-slate-200 dark:border-[#1F6B4C]/40 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400">Custom Floating-Point Format</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 rounded-full px-2 py-0.5">
              <Info className="w-3 h-3" /> Not an IEEE 754 standard format
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 block mb-1">Sign</label>
              <div className="w-full font-mono text-sm font-bold px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-[#1F6B4C]/40 bg-white dark:bg-[#0A2E1D] text-[#0A3324] dark:text-[#D9FFF4]">1 bit — fixed</div>
            </div>
            <div>
              <label htmlFor="fp-custom-exp" className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 block mb-1">Exponent bits</label>
              <input id="fp-custom-exp" type="number" inputMode="numeric" min={CUSTOM_FORMAT_LIMITS.exponentBits.min} max={CUSTOM_FORMAT_LIMITS.exponentBits.max} value={Number.isNaN(customExpBits) ? '' : customExpBits} onChange={e => onCustomExpBitsChange(parseInt(e.target.value, 10))}
                className="w-full font-mono text-sm font-bold px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-[#1F6B4C]/60 bg-white dark:bg-[#030D08] text-[#0A3324] dark:text-[#D9FFF4] outline-none focus:border-[#34E89A]" />
            </div>
            <div>
              <label htmlFor="fp-custom-frac" className="text-[10px] font-bold uppercase tracking-wider text-[#0AA15F] dark:text-[#34E89A] block mb-1">Fraction bits</label>
              <input id="fp-custom-frac" type="number" inputMode="numeric" min={CUSTOM_FORMAT_LIMITS.fractionBits.min} max={CUSTOM_FORMAT_LIMITS.fractionBits.max} value={Number.isNaN(customFracBits) ? '' : customFracBits} onChange={e => onCustomFracBitsChange(parseInt(e.target.value, 10))}
                className="w-full font-mono text-sm font-bold px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-[#1F6B4C]/60 bg-white dark:bg-[#030D08] text-[#0A3324] dark:text-[#D9FFF4] outline-none focus:border-[#34E89A]" />
            </div>
          </div>

          <p className="text-[11px] text-[#1F6B4C] dark:text-slate-400">BitForge's custom model always uses one sign bit; only exponent and fraction widths are configurable.</p>

          <div className="text-xs font-mono text-[#1F6B4C] dark:text-slate-400">
            1 + {customExpBits || 0} + {customFracBits || 0} = <strong className="text-[#0A3324] dark:text-[#D9FFF4]">{customTotal} bits</strong>
          </div>

          {previewFormat && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 rounded-md p-2 space-y-0.5">
                <div className="flex items-start gap-1.5"><Gauge className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span className="font-bold">Exponent bits → control range</span></div>
                <div className="pl-5 opacity-90">Approximate scale: up to roughly ±2<sup>{biasOf(previewFormat)}</sup></div>
              </div>
              <div className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-md p-2 space-y-0.5">
                <div className="flex items-start gap-1.5"><Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span className="font-bold">Fraction bits → control precision</span></div>
                <div className="pl-5 opacity-90">Approximately {approxDecimalDigits(previewFormat)} decimal digits of precision</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Field explanation strip
// ---------------------------------------------------------------------------

const FIELD_BLURBS: Record<FloatSegment, { title: string; text: string }> = {
  sign: { title: 'Sign', text: 'Tells whether the number is positive or negative.' },
  exponent: { title: 'Exponent', text: 'Controls the scale, or magnitude, of the number.' },
  fraction: { title: 'Fraction', text: 'Stores the significant digits that determine precision. (Also called the mantissa.)' },
};

const FieldBlurbs: React.FC<{ onJump: (seg: FloatSegment) => void }> = ({ onJump }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    {(['sign', 'exponent', 'fraction'] as FloatSegment[]).map(seg => (
      <button key={seg} onClick={() => onJump(seg)} className="text-left rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D] p-3 hover:border-[#34E89A] transition-colors">
        <div className="text-xs font-bold text-[#0A3324] dark:text-[#D9FFF4]">{FIELD_BLURBS[seg].title}</div>
        <div className="text-[11px] text-[#1F6B4C] dark:text-slate-400 mt-0.5 leading-relaxed">{FIELD_BLURBS[seg].text}</div>
      </button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Compact step card with a "Show details" disclosure
// ---------------------------------------------------------------------------

const StepCard: React.FC<{ step: FPStep; index: number; highlighted: boolean; children?: React.ReactNode }> = ({ step, index, highlighted, children }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className={`rounded-lg border p-3.5 space-y-2 transition-all duration-300 ${
      highlighted ? 'border-[#34E89A] bg-[#34E89A]/[0.06] dark:bg-[#34E89A]/10 ring-2 ring-[#34E89A]/40' : 'border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D]'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#0A3324] text-[#34E89A] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-[#34E89A]/30">{index}</span>
          <h4 className="text-xs font-bold text-[#0A3324] dark:text-[#D9FFF4] uppercase tracking-wider">{step.title}</h4>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#D9FFF4] dark:bg-[#0A3324] text-[#0A3324] dark:text-[#34E89A] border border-[#34E89A]/30 shrink-0">{step.finalResult}</span>
      </div>

      <p className="text-xs text-[#1F6B4C] dark:text-slate-300 leading-relaxed font-sans">{step.explanation}</p>

      {children}

      {step.equationLines.length > 0 && (
        <>
          <button onClick={() => setDetailsOpen(o => !o)} aria-expanded={detailsOpen} className="flex items-center gap-1 text-[11px] font-semibold text-[#1F6B4C] dark:text-[#34E89A] hover:underline underline-offset-2">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            <span>{detailsOpen ? 'Hide details' : (step.detailsLabel || `Show ${step.title.toLowerCase()} details`)}</span>
          </button>
          {detailsOpen && (
            <div className="bg-[#0A3324] text-[#34E89A] p-3 rounded-lg font-mono text-xs space-y-1 overflow-x-auto scrollbar-none border border-[#1F6B4C]/40">
              {step.equationLines.map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Decimal -> Floating Point
// ---------------------------------------------------------------------------

const JUMP_TO_STEP: Record<FloatSegment, string> = { sign: 'sign', exponent: 'exponent', fraction: 'fraction' };

const EncodePanel: React.FC<{ format: FloatFormat }> = ({ format }) => {
  const [inputStr, setInputStr] = useState<string>('13.25');
  const [selectedSegment, setSelectedSegment] = useState<FloatSegment | null>(null);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const [explorePanel, setExplorePanel] = useState<'special' | 'rounding' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();
  const inputRef = useRef<HTMLInputElement>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const result = useMemo(() => decimalToFloatBreakdown(inputStr, format), [inputStr, format]);
  const breakdown: FloatBreakdown | null = 'error' in result ? null : result;
  const errorMessage = 'error' in result ? result.error : undefined;

  const handleInputChange = (val: string) => {
    if (/^[+-]?\d*\.?\d*(?:[eE][+-]?\d*)?$/.test(val)) setInputStr(val);
  };

  const jumpToSegment = (seg: FloatSegment | null) => {
    setSelectedSegment(seg);
    if (!seg) return;
    const id = JUMP_TO_STEP[seg];
    setHighlightedStep(id);
    stepRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSafeTimeout(() => setHighlightedStep(null), 1600);
  };

  const copyText = async (text: string, key: string) => {
    const ok = await copyTextSafe(text);
    if (!ok) { setCopyFailed(key); setSafeTimeout(() => setCopyFailed(null), 2000); return; }
    setCopied(key); setSafeTimeout(() => setCopied(null), 2000);
    if (breakdown) {
      addEntry({ mode: 'floating_point', operation: `Decimal \u2192 ${format.label}`, input: breakdown.input, inputLabel: 'Decimal', output: text, outputLabel: key === 'hex' ? `${format.label} (Hex)` : `${format.label} (Binary)` });
    }
  };

  useRegisterShortcutTarget({
    focusInput: () => inputRef.current?.focus(),
    copyResult: () => breakdown && copyText(breakdown.hex ? `0x${breakdown.hex}` : breakdown.bitString, 'hex'),
    clearInput: () => setInputStr(''),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="fp-input" className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Decimal Input</label>
        <input ref={inputRef} id="fp-input" type="text" inputMode="decimal" value={inputStr} onChange={e => handleInputChange(e.target.value)}
          placeholder="Enter a decimal number (e.g. 13.25)..."
          className={`w-full font-mono text-2xl sm:text-3xl font-bold px-4 py-3 rounded-xl border-2 transition-all outline-none bg-slate-50 dark:bg-[#030D08] ${errorMessage ? 'border-rose-400 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 dark:border-[#1F6B4C]/60 text-[#0A3324] dark:text-[#D9FFF4] focus:border-[#34E89A] focus:ring-2 focus:ring-[#34E89A]/20'}`} />
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" /><span>{errorMessage}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ENCODE_PRESETS.map(p => (
            <button key={p.label} onClick={() => setInputStr(p.value)} aria-pressed={inputStr === p.value}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${inputStr === p.value ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!breakdown && (
        <div className="bg-[#F4FAF9]/50 dark:bg-[#05170D]/50 rounded-xl border border-dashed border-slate-300 dark:border-[#1F6B4C]/40 p-8 text-center text-[#1F6B4C] dark:text-slate-400">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#1F6B4C] opacity-60" /><p className="font-semibold text-sm">Enter a valid decimal number above</p>
        </div>
      )}

      {breakdown && (
        <>
          <div className="bg-[#0A3324] text-white p-4 sm:p-5 rounded-xl border border-[#1F6B4C]/60 shadow-sm relative overflow-hidden space-y-4">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#34E89A]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold tracking-wider uppercase text-[#34E89A]">Stored Representation</span>
              <span className="font-mono bg-[#041A11] px-2 py-0.5 rounded text-[#D9FFF4] border border-[#1F6B4C]/50">{CATEGORY_LABEL[breakdown.category]} • {totalBits(format)} bits</span>
            </div>
            <div className="relative z-10">
              <FloatBitStrip signBit={breakdown.signBit} exponentBits={breakdown.exponentBits} fractionBits={breakdown.fractionBits}
                selectedSegment={selectedSegment} onSegmentSelect={seg => jumpToSegment(seg === selectedSegment ? null : seg)} />
            </div>
          </div>

          <FieldBlurbs onJump={jumpToSegment} />

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Understand the Result</h3>
            <div className="space-y-2.5">
              {breakdown.steps.map((step, idx) => (
                <div key={step.id} ref={el => { stepRefs.current[step.id] = el; }}>
                  <StepCard step={step} index={idx + 1} highlighted={highlightedStep === step.id}>
                    {step.id === 'normalize' && breakdown.category === 'normal' && <NormalizationVisual breakdown={breakdown} />}
                    {step.id === 'binary' && <LongDivisionTrace breakdown={breakdown} />}
                  </StepCard>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0A3324] text-white p-5 rounded-xl border border-[#1F6B4C]/60 shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#34E89A]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 text-xs font-bold tracking-wider uppercase text-[#34E89A] mb-2">Result</div>
            <div className="relative z-10 font-mono text-2xl sm:text-3xl font-bold text-[#34E89A] mb-3">{breakdown.input}</div>
            <div className="relative z-10 space-y-1.5 text-xs font-mono">
              <div className="flex flex-wrap gap-x-2 items-baseline text-slate-300">
                <span className="text-[#D9FFF4]/60 font-sans not-italic">Stored representation:</span>
                <span className="text-amber-300">{breakdown.signBit}</span>
                <span className="text-sky-300">{breakdown.exponentBits}</span>
                <span className="text-[#34E89A] break-all">{breakdown.fractionBits}</span>
              </div>
              {breakdown.hex && <div className="text-slate-300"><span className="text-[#D9FFF4]/60 font-sans">Hex: </span><strong className="text-[#D9FFF4]">0x{breakdown.hex}</strong></div>}
              {breakdown.conversionChangedValue && <div className="text-amber-300 font-sans text-[11px]">Target-format conversion changed the value — see Precision &amp; Rounding below.</div>}
            </div>
            <div className="relative z-10 flex items-center gap-2 pt-4 mt-4 border-t border-[#1F6B4C]/40 flex-wrap">
              <button onClick={() => copyText(breakdown.bitString, 'binary')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${copied === 'binary' ? 'bg-emerald-500 text-white' : copyFailed === 'binary' ? 'bg-rose-600 text-white' : 'bg-[#1F6B4C] hover:bg-[#34E89A] hover:text-[#0A3324] text-white'}`}>
                {copied === 'binary' ? <Check className="w-3.5 h-3.5" /> : copyFailed === 'binary' ? <AlertCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}<span>Copy Binary</span>
              </button>
              {breakdown.hex && (
                <button onClick={() => copyText(`0x${breakdown.hex}`, 'hex')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${copied === 'hex' ? 'bg-emerald-500 text-white' : copyFailed === 'hex' ? 'bg-rose-600 text-white' : 'bg-[#1F6B4C] hover:bg-[#34E89A] hover:text-[#0A3324] text-white'}`}>
                  {copied === 'hex' ? <Check className="w-3.5 h-3.5" /> : copyFailed === 'hex' ? <AlertCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}<span>Copy Hex</span>
                </button>
              )}
              <ShareButton label="Share" shareTitle="BitForge Floating Point Result"
                getText={() => `BitForge Floating-Point Explorer (${format.label})\nDecimal: ${breakdown.input}\nBinary: ${breakdown.bitString}${breakdown.hex ? `\nHex: 0x${breakdown.hex}` : ''}`}
                historyEntry={() => ({ mode: 'floating_point', operation: 'Shared Floating Point Result', input: breakdown.input, inputLabel: 'Decimal', output: breakdown.hex ? `0x${breakdown.hex}` : breakdown.bitString, outputLabel: format.label })}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-black/20 text-[#D9FFF4]/80 hover:text-[#34E89A] border border-[#34E89A]/20 hover:border-[#34E89A]/50" />
            </div>
          </div>

          <ExploreMore explorePanel={explorePanel} onToggle={setExplorePanel} format={format} breakdown={breakdown} />
        </>
      )}
    </div>
  );
};

function firstOneIndex(digits: string[]): number { const idx = digits.indexOf('1'); return idx === -1 ? 0 : idx; }

const NormalizationVisual: React.FC<{ breakdown: FloatBreakdown }> = ({ breakdown }) => {
  const digits = (breakdown.intPart + breakdown.fracPart).split('');
  const originalPointPos = breakdown.intPart.length;
  const shift = breakdown.unbiasedExponent;
  return (
    <div className="bg-white dark:bg-[#0A2E1D] rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 p-3 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-500">Binary Point Movement</div>
      <PointRow digits={digits} pointPos={originalPointPos} label="Plain form" accent="text-[#0A3324] dark:text-[#D9FFF4]" />
      <div className="flex items-center gap-2 pl-1 text-[11px] font-mono text-[#1F6B4C] dark:text-slate-400">
        <ArrowLeftRight className="w-3.5 h-3.5 text-[#34E89A]" /><span>Point moves {Math.abs(shift)} place{Math.abs(shift) === 1 ? '' : 's'} {shift >= 0 ? 'left' : 'right'}</span>
      </div>
      <PointRow digits={digits} pointPos={firstOneIndex(digits) + 1} label="Normalized form" accent="text-[#0AA15F] dark:text-[#34E89A]" />
    </div>
  );
};

const PointRow: React.FC<{ digits: string[]; pointPos: number; label: string; accent: string }> = ({ digits, pointPos, label, accent }) => (
  <div className="space-y-1">
    <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
    <div className="flex items-center gap-0.5 flex-wrap font-mono text-sm">
      {digits.map((d, i) => (
        <React.Fragment key={i}>
          {i === pointPos && <span className="mx-0.5 w-1.5 h-5 rounded-full bg-[#34E89A] inline-block" aria-hidden="true" />}
          <span className={`w-5 h-6 flex items-center justify-center rounded border ${i < pointPos ? 'bg-[#F4FAF9] dark:bg-[#05170D] border-slate-200 dark:border-[#1F6B4C]/40 text-[#0A3324] dark:text-[#D9FFF4]' : 'bg-[#0A3324] dark:bg-[#030D08] border-[#1F6B4C]/40 text-[#34E89A]'} ${d === '1' ? 'font-bold' : ''}`}>{d}</span>
        </React.Fragment>
      ))}
      {pointPos >= digits.length && <span className="mx-0.5 w-1.5 h-5 rounded-full bg-[#34E89A] inline-block" aria-hidden="true" />}
    </div>
  </div>
);

const LongDivisionTrace: React.FC<{ breakdown: FloatBreakdown }> = ({ breakdown }) => {
  const [expanded, setExpanded] = useState(false);
  const hasRows = breakdown.integerDivisionRows.length > 0 || breakdown.fractionMultiplyRows.length > 0;
  if (!hasRows) return null;
  const intRows = expanded ? breakdown.integerDivisionRows : breakdown.integerDivisionRows.slice(0, 8);
  const fracRows = expanded ? breakdown.fractionMultiplyRows : breakdown.fractionMultiplyRows.slice(0, 8);
  const hasMore = breakdown.integerDivisionRows.length > 8 || breakdown.fractionMultiplyRows.length > 8;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {breakdown.integerDivisionRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-white dark:bg-[#0A2E1D] overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400 bg-[#F4FAF9] dark:bg-[#072818] border-b border-slate-200 dark:border-[#1F6B4C]/40">Integer ÷ 2</div>
          <table className="w-full text-left text-xs font-mono"><tbody className="divide-y divide-slate-100 dark:divide-[#1F6B4C]/30">
            {intRows.map((row, i) => (<tr key={i}><td className="px-3 py-1 text-[#0A3324] dark:text-slate-200">{row.before} ÷ 2</td><td className="px-3 py-1 text-[#1F6B4C] dark:text-slate-400">= {row.after} r</td><td className="px-3 py-1 font-bold text-[#0AA15F] dark:text-[#34E89A]">{row.bit}</td></tr>))}
          </tbody></table>
        </div>
      )}
      {breakdown.fractionMultiplyRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-white dark:bg-[#0A2E1D] overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400 bg-[#F4FAF9] dark:bg-[#072818] border-b border-slate-200 dark:border-[#1F6B4C]/40">Fraction × 2</div>
          <table className="w-full text-left text-xs font-mono"><tbody className="divide-y divide-slate-100 dark:divide-[#1F6B4C]/30">
            {fracRows.map((row, i) => (<tr key={i}><td className="px-3 py-1 text-[#0A3324] dark:text-slate-200">{row.before} × 2</td><td className="px-3 py-1 text-[#1F6B4C] dark:text-slate-400">= {row.after}</td><td className="px-3 py-1 font-bold text-[#0AA15F] dark:text-[#34E89A]">{row.bit}</td></tr>))}
          </tbody></table>
        </div>
      )}
      {hasMore && <button onClick={() => setExpanded(e => !e)} className="sm:col-span-2 text-[11px] font-semibold text-[#1F6B4C] dark:text-[#34E89A] hover:underline underline-offset-2 text-left">{expanded ? 'Show fewer rows' : 'Show all rows'}</button>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Explore More: Special Values + Precision & Rounding
// ---------------------------------------------------------------------------

const SPECIAL_VALUE_KINDS = [
  { kind: 'zero' as const, label: 'Zero' }, { kind: 'infinity' as const, label: 'Infinity' },
  { kind: 'nan' as const, label: 'NaN' }, { kind: 'subnormal' as const, label: 'Subnormal' },
];

const ExploreMore: React.FC<{
  explorePanel: 'special' | 'rounding' | null; onToggle: (p: 'special' | 'rounding' | null) => void;
  format: FloatFormat; breakdown: FloatBreakdown;
}> = ({ explorePanel, onToggle, format, breakdown }) => {
  const [previewKind, setPreviewKind] = useState<typeof SPECIAL_VALUE_KINDS[number]['kind'] | null>(null);
  const previewDecoded: BitDecodeResult | null = previewKind
    ? (() => { const bits = specialValueBits(previewKind, format); return decodeBits(bits[0] === '1' ? 1 : 0, bits.slice(1, 1 + format.exponentBits), bits.slice(1 + format.exponentBits), format); })()
    : null;

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Explore More</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onToggle(explorePanel === 'special' ? null : 'special')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${explorePanel === 'special' ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>Special Values</button>
        <button onClick={() => onToggle(explorePanel === 'rounding' ? null : 'rounding')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${explorePanel === 'rounding' ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>Precision &amp; Rounding</button>
      </div>

      {explorePanel === 'special' && (
        <div className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D] p-4 space-y-3">
          <p className="text-xs text-[#1F6B4C] dark:text-slate-300 leading-relaxed">Certain bit patterns are reserved to represent values outside ordinary numbers. Pick one to see its field configuration for {format.label}.</p>
          <div className="flex flex-wrap gap-1.5">
            {SPECIAL_VALUE_KINDS.map(sv => (
              <button key={sv.kind} onClick={() => setPreviewKind(sv.kind === previewKind ? null : sv.kind)} aria-pressed={previewKind === sv.kind}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${previewKind === sv.kind ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-white dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>
                {sv.label}
              </button>
            ))}
          </div>
          {previewKind && previewDecoded && (
            <div className="space-y-2">
              <p className="text-[11px] text-[#1F6B4C] dark:text-slate-400 italic">{SPECIAL_VALUE_BLURBS[previewKind]}</p>
              <div className="bg-[#0A3324] text-[#34E89A] p-3 rounded-lg font-mono text-xs space-y-1 border border-[#1F6B4C]/40">
                <div>Exponent = {previewDecoded.exponentBits} {previewDecoded.category === 'zero' || previewDecoded.category === 'subnormal' ? '(all zero)' : '(all one)'}</div>
                <div>Fraction {previewDecoded.category === 'nan' ? '\u2260' : '='} {previewDecoded.fractionBits}</div>
                <div className="pt-1 border-t border-[#1F6B4C]/40 text-white">→ {CATEGORY_LABEL[previewDecoded.category]} ({previewDecoded.formula})</div>
              </div>
            </div>
          )}
        </div>
      )}

      {explorePanel === 'rounding' && (
        <div className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D] p-4 space-y-3">
          <p className="text-xs text-[#1F6B4C] dark:text-slate-300 leading-relaxed">Floating-point formats have limited storage space. When a number needs more bits than the format provides, it gets rounded to the nearest representable value.</p>
          {breakdown.roundTripPreserved ? (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-md p-2.5">
              ✓ Round-trip preserved — decoding these bits back gives the same value BitForge started from. (This doesn't guarantee {breakdown.input} has an exact finite binary form in general — only that no <em>additional</em> rounding happened in this conversion.)
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-md p-2.5">
                Target-format conversion changed the value: {breakdown.input} → {breakdown.storedValue}.
              </div>
              <div className="bg-[#0A3324] text-[#34E89A] p-3 rounded-lg font-mono text-xs space-y-1 border border-[#1F6B4C]/40">
                {breakdown.rounding && <div>Guard bit = {breakdown.rounding.guardBit}, sticky bit = {breakdown.rounding.stickyBit ? '1' : '0'} → {breakdown.rounding.roundedUp ? 'rounded up' : 'rounded down (truncated)'}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Floating Point -> Decimal (interactive bit decoder)
// ---------------------------------------------------------------------------

function bitsFor(format: FloatFormat, kind: Parameters<typeof specialValueBits>[0]) { return specialValueBits(kind, format); }

const DecodePanel: React.FC<{ format: FloatFormat }> = ({ format }) => {
  const initialBits = useMemo(() => {
    const base = decimalToFloatBreakdown('13.25', format);
    return 'error' in base ? bitsFor(format, 'zero') : base.bitString;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only on first mount

  const [signBit, setSignBit] = useState<0 | 1>(initialBits[0] === '1' ? 1 : 0);
  const [exponentBits, setExponentBits] = useState<string>(initialBits.slice(1, 1 + format.exponentBits));
  const [fractionBits, setFractionBits] = useState<string>(initialBits.slice(1 + format.exponentBits));
  const [selectedSegment, setSelectedSegment] = useState<FloatSegment | null>(null);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const [explorePanel, setExplorePanel] = useState<'special' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const { addEntry } = useHistory();
  const setSafeTimeout = useAutoResetTimer();
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When the selected format's bit widths change, re-encode the CURRENT
  // numerical value into the new format rather than resizing the raw bit
  // pattern -- switching Binary32 -> Binary16 should show Binary16's
  // representation of the same number, not a truncated copy of the old bits.
  const prevFormatRef = useRef<FloatFormat>(format);
  useEffect(() => {
    const prev = prevFormatRef.current;
    const shapeChanged = prev.exponentBits !== format.exponentBits || prev.fractionBits !== format.fractionBits;
    if (shapeChanged) {
      const decodedUnderOld = decodeBits(signBit, exponentBits, fractionBits, prev);
      const reencoded = numberToFloatBreakdown(decodedUnderOld.value, String(decodedUnderOld.value), format);
      setSignBit(reencoded.signBit);
      setExponentBits(reencoded.exponentBits);
      setFractionBits(reencoded.fractionBits);
    }
    prevFormatRef.current = format;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format.exponentBits, format.fractionBits]);

  const decoded = useMemo(() => decodeBits(signBit, exponentBits, fractionBits, format), [signBit, exponentBits, fractionBits, format]);

  const toggleBit = (field: FloatSegment, indexInField: number) => {
    if (field === 'sign') { setSignBit(signBit === 0 ? 1 : 0); return; }
    if (field === 'exponent') { const arr = exponentBits.split(''); arr[indexInField] = arr[indexInField] === '0' ? '1' : '0'; setExponentBits(arr.join('')); }
    else { const arr = fractionBits.split(''); arr[indexInField] = arr[indexInField] === '0' ? '1' : '0'; setFractionBits(arr.join('')); }
  };

  const applyBits = (bits: string) => {
    setSignBit(bits[0] === '1' ? 1 : 0);
    setExponentBits(bits.slice(1, 1 + format.exponentBits));
    setFractionBits(bits.slice(1 + format.exponentBits));
  };

  const jumpToSegment = (seg: FloatSegment | null) => {
    setSelectedSegment(seg);
    if (!seg) return;
    const id = JUMP_TO_STEP[seg];
    setHighlightedStep(id);
    stepRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSafeTimeout(() => setHighlightedStep(null), 1600);
  };

  const copyValue = async (text: string, key: string) => {
    const ok = await copyTextSafe(text);
    if (!ok) { setFailedKey(key); setSafeTimeout(() => setFailedKey(null), 2000); return; }
    setCopiedKey(key); setSafeTimeout(() => setCopiedKey(null), 2000);
    addEntry({ mode: 'floating_point', operation: `${format.label} \u2192 Decimal`, input: decoded.hex ? `0x${decoded.hex}` : decoded.bitString, inputLabel: `${format.label} (Bits)`, output: text, outputLabel: 'Decimal Value' });
  };

  useRegisterShortcutTarget({
    copyResult: () => copyValue(formatDecodedValue(decoded.value), 'value'),
    clearInput: () => applyBits('0'.repeat(totalBits(format))),
  });

  return (
    <div className="space-y-6">
      <DirectBitInputs format={format} bitString={decoded.bitString} hex={decoded.hex} onCommit={applyBits} />

      <div className="bg-[#0A3324] text-white p-4 sm:p-5 rounded-xl border border-[#1F6B4C]/60 shadow-sm relative overflow-hidden space-y-4">
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#34E89A]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold tracking-wider uppercase text-xs text-[#34E89A]">Click Bits to Toggle</span>
          <span className="font-mono bg-[#041A11] px-2 py-0.5 rounded text-[#D9FFF4] border border-[#1F6B4C]/50 text-xs">{CATEGORY_LABEL[decoded.category]}</span>
        </div>
        <div className="relative z-10">
          <FloatBitStrip signBit={decoded.signBit} exponentBits={decoded.exponentBits} fractionBits={decoded.fractionBits} interactive onToggleBit={toggleBit}
            selectedSegment={selectedSegment} onSegmentSelect={seg => jumpToSegment(seg === selectedSegment ? null : seg)} />
        </div>
      </div>

      <FieldBlurbs onJump={jumpToSegment} />

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Understand the Result</h3>
        <div className="space-y-2.5">
          {decoded.steps.map((step, idx) => (
            <div key={step.id} ref={el => { stepRefs.current[step.id] = el; }}>
              <StepCard step={step} index={idx + 1} highlighted={highlightedStep === step.id} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0A3324] text-white p-5 rounded-xl border border-[#1F6B4C]/60 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#34E89A]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between text-xs text-[#34E89A] flex-wrap gap-1">
            <span className="font-bold tracking-wider uppercase">Result</span>
            <span className="font-mono text-[#D9FFF4]/80">{decoded.formula}</span>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-bold text-[#34E89A] break-all leading-tight">{formatDecodedValue(decoded.value)}</div>
        </div>
        <div className="relative z-10 flex items-center justify-between pt-4 mt-4 border-t border-[#1F6B4C]/40 flex-wrap gap-2">
          <div className="text-[11px] text-slate-300 font-sans">{decoded.hex ? <>Hex: <span className="font-mono font-bold text-[#D9FFF4]">0x{decoded.hex}</span></> : <>Bits: <span className="font-mono font-bold text-[#D9FFF4]">{decoded.bitString}</span></>}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => copyValue(formatDecodedValue(decoded.value), 'value')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${copiedKey === 'value' ? 'bg-emerald-500 text-white' : failedKey === 'value' ? 'bg-rose-600 text-white' : 'bg-[#1F6B4C] hover:bg-[#34E89A] hover:text-[#0A3324] text-white'}`}>
              {copiedKey === 'value' ? <Check className="w-3.5 h-3.5" /> : failedKey === 'value' ? <AlertCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}<span>Copy Value</span>
            </button>
            <ShareButton label="Share" shareTitle="BitForge Floating Point Decode"
              getText={() => `BitForge Floating-Point Explorer (${format.label})\nBits: ${decoded.bitString}\nFormula: ${decoded.formula}\nValue: ${formatDecodedValue(decoded.value)}`}
              historyEntry={() => ({ mode: 'floating_point', operation: 'Shared Floating Point Decode', input: decoded.hex ? `0x${decoded.hex}` : decoded.bitString, inputLabel: `${format.label} (Bits)`, output: formatDecodedValue(decoded.value), outputLabel: 'Decimal Value' })}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-black/20 text-[#D9FFF4]/80 hover:text-[#34E89A] border border-[#34E89A]/20 hover:border-[#34E89A]/50" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-[#34E89A]">Explore More</div>
        <button onClick={() => setExplorePanel(explorePanel === 'special' ? null : 'special')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${explorePanel === 'special' ? 'bg-[#0A3324] text-[#34E89A] border-[#34E89A]' : 'bg-[#F4FAF9] dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A]'}`}>Special Values</button>
        {explorePanel === 'special' && (
          <div className="rounded-lg border border-slate-200 dark:border-[#1F6B4C]/40 bg-[#F4FAF9]/50 dark:bg-[#05170D] p-4 space-y-3">
            <p className="text-xs text-[#1F6B4C] dark:text-slate-300 leading-relaxed">Load a reserved bit pattern directly into the grid above.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPECIAL_VALUE_KINDS.map(sv => (
                <button key={sv.kind} onClick={() => applyBits(bitsFor(format, sv.kind))} className="text-left px-3 py-2 rounded-md border bg-white dark:bg-[#0A2E1D] text-[#1F6B4C] dark:text-slate-300 border-slate-200 dark:border-[#1F6B4C]/40 hover:border-[#34E89A] transition-colors">
                  <div className="font-mono text-xs font-bold text-[#0A3324] dark:text-[#D9FFF4]">{sv.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-80">{SPECIAL_VALUE_BLURBS[sv.kind]}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Direct Binary/Hex entry for Decode mode. Supports partial typing: the
 * field shows a live "X / N" progress count and only commits to the bit
 * grid once the required length is reached, rather than silently ignoring
 * every keystroke until the string happens to be complete.
 */
const DirectBitInputs: React.FC<{ format: FloatFormat; bitString: string; hex: string | null; onCommit: (bits: string) => void }> = ({ format, bitString, hex, onCommit }) => {
  const [binaryDraft, setBinaryDraft] = useState(bitString);
  const [hexDraft, setHexDraft] = useState(hex ?? '');
  const bits = totalBits(format);
  const hexDigits = bits % 4 === 0 ? bits / 4 : null;

  useEffect(() => setBinaryDraft(bitString), [bitString]);
  useEffect(() => setHexDraft(hex ?? ''), [hex]);

  const handleBinaryChange = (v: string) => {
    const cleaned = v.replace(/[^01]/g, '').slice(0, bits);
    setBinaryDraft(cleaned);
    if (cleaned.length === bits) onCommit(cleaned);
  };

  const handleHexChange = (v: string) => {
    if (!hexDigits) return;
    const cleaned = v.replace(/^0x/i, '').replace(/[^0-9a-fA-F]/g, '').slice(0, hexDigits);
    setHexDraft(cleaned);
    if (cleaned.length === hexDigits) {
      onCommit(cleaned.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join(''));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="fp-decode-binary" className="text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400">Binary</label>
          <span className={`text-[10px] font-mono ${binaryDraft.length === bits ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1F6B4C] dark:text-slate-500'}`}>{binaryDraft.length} / {bits} bits</span>
        </div>
        <input id="fp-decode-binary" type="text" value={binaryDraft} onChange={e => handleBinaryChange(e.target.value)}
          placeholder={`Enter ${bits} bits to decode`}
          className="w-full font-mono text-sm px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-[#1F6B4C]/60 bg-white dark:bg-[#030D08] text-[#0A3324] dark:text-[#D9FFF4] outline-none focus:border-[#34E89A]" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="fp-decode-hex" className="text-[10px] font-bold uppercase tracking-wider text-[#1F6B4C] dark:text-slate-400">Hexadecimal</label>
          <span className={`text-[10px] font-mono ${!hexDigits ? 'text-[#1F6B4C] dark:text-slate-500' : hexDraft.length === hexDigits ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1F6B4C] dark:text-slate-500'}`}>
            {hexDigits ? `${hexDraft.length} / ${hexDigits} hex digits` : 'unavailable for this bit width'}
          </span>
        </div>
        <input id="fp-decode-hex" type="text" disabled={!hexDigits} value={hexDraft} onChange={e => handleHexChange(e.target.value)}
          placeholder={hexDigits ? `Enter ${hexDigits} hex digits` : 'Not divisible by 4 bits'}
          className="w-full font-mono text-sm px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-[#1F6B4C]/60 bg-white dark:bg-[#030D08] text-[#0A3324] dark:text-[#D9FFF4] outline-none focus:border-[#34E89A] disabled:opacity-40" />
      </div>
    </div>
  );
};

function formatDecodedValue(v: number): string {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return '\u221e';
  if (v === -Infinity) return '\u2212\u221e';
  if (Object.is(v, -0)) return '\u22120';
  return String(v);
}
