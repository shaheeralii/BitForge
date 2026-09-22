import React from 'react';
import { Info } from 'lucide-react';
import { BitCellRow } from './BitCellRow';
import {
  RepresentationId,
  getBitGridMeta,
  formatRange,
  invertBitString,
  getUnsignedSteps,
  getSignMagnitudeSteps,
  getOnesComplementSteps,
  getTwosComplementDecodeSteps,
} from '../utils/signedRepresentations';
import { StepDetail } from '../types';

interface BitRepresentationPanelProps {
  representation: RepresentationId;
  bits: string;
  bitWidth: number;
}

/** A short, visually-subdued aside — used for the "two zeros" notes rather than a full collapsible, since each is a single sentence. */
const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 text-[11px] text-slate-400 border-l-2 border-[var(--bf-muted)]/50 pl-2.5 py-0.5">
    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--bf-muted)]" />
    <span>{children}</span>
  </div>
);

const StepList: React.FC<{ steps: StepDetail[] }> = ({ steps }) => (
  <div className="space-y-2.5">
    {steps.map((step, idx) => (
      <div key={idx} className="rounded-lg border border-[var(--bf-muted)]/40 bg-[var(--bf-surface-inset)] p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-[var(--bf-chip)] text-[var(--bf-accent)] font-mono text-[9px] font-bold flex items-center justify-center shrink-0 border border-[var(--bf-accent)]/30">
            {idx + 1}
          </span>
          <h4 className="text-[11px] font-bold text-[var(--bf-heading)] uppercase tracking-wide">{step.title}</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{step.explanation}</p>
        {step.equationLines && (
          <div className="bg-[var(--bf-chip)] text-[var(--bf-accent)] p-2.5 rounded-md font-mono text-xs space-y-0.5 overflow-x-auto scrollbar-none">
            {step.equationLines.map((line, i) => <div key={i} className="whitespace-pre">{line}</div>)}
          </div>
        )}
        {step.finalResult && (
          <div className="flex items-center justify-between text-xs font-mono font-bold bg-[var(--bf-chip-alt)] px-2.5 py-1.5 rounded-md">
            <span className="text-slate-400 font-sans font-normal">Result:</span>
            <span className="text-[var(--bf-accent)]">{step.finalResult}</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

export const BitRepresentationPanel: React.FC<BitRepresentationPanelProps> = ({ representation, bits, bitWidth }) => {
  // Same metadata the main bit grid renders from, so the two can never
  // disagree about what a given bit means.
  const meta = getBitGridMeta(representation, bitWidth);
  const rangeText = formatRange(representation, bitWidth);

  if (representation === 'unsigned') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          All bits contribute positive positional weight. There is no sign bit — every bit, including the MSB, simply adds to the total.
        </p>
        <BitCellRow bits={bits} subLabels={meta.labels} size="sm" />
        <StepList steps={getUnsignedSteps(bits)} />
        <p className="text-[11px] text-slate-500 font-mono">Range for {bitWidth}-bit Unsigned: {rangeText}</p>
      </div>
    );
  }

  if (representation === 'sign-magnitude') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          The MSB is a <strong className="text-[var(--bf-heading)]">dedicated sign bit</strong>, entirely separate from the value. The remaining {bitWidth - 1} bits store the magnitude, unmodified whether the number is positive or negative.
        </p>
        <BitCellRow bits={bits} subLabels={meta.labels} dividerAfterIndex={meta.dividerAfterIndex} highlightIndices={meta.highlightIndices} size="sm" />
        <StepList steps={getSignMagnitudeSteps(bits)} />
        <Note>Sign-Magnitude has two bit patterns for zero: <code className="font-mono">{'0'.repeat(bitWidth)}</code> is +0, and <code className="font-mono">{'1' + '0'.repeat(bitWidth - 1)}</code> is −0.</Note>
        <p className="text-[11px] text-slate-500 font-mono">Range for {bitWidth}-bit Sign-Magnitude: {rangeText}</p>
      </div>
    );
  }

  if (representation === 'ones-complement') {
    const isNegative = bits[0] === '1';
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          A negative number is formed by inverting <strong className="text-[var(--bf-heading)]">every bit</strong> of its positive representation. The entire pattern participates — this is not a sign bit plus a magnitude.
        </p>
        {isNegative ? (
          <div className="space-y-2">
            <BitCellRow bits={invertBitString(bits)} subLabels={meta.labels} size="sm" />
            <div className="text-center text-[var(--bf-accent)] text-lg leading-none">↓ invert every bit</div>
            <BitCellRow bits={bits} subLabels={meta.labels} size="sm" />
          </div>
        ) : (
          <BitCellRow bits={bits} subLabels={meta.labels} size="sm" />
        )}
        <StepList steps={getOnesComplementSteps(bits)} />
        <Note>One's Complement also has two zeros: <code className="font-mono">{'0'.repeat(bitWidth)}</code> is +0, and <code className="font-mono">{'1'.repeat(bitWidth)}</code> is −0.</Note>
        <p className="text-[11px] text-slate-500 font-mono">Range for {bitWidth}-bit One's Complement: {rangeText}</p>
      </div>
    );
  }

  // twos-complement
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        A negative number is formed by inverting every bit and adding 1. Unlike Sign-Magnitude, the MSB is not excluded from the value — it carries a <strong className="text-[var(--bf-heading)]">negative positional weight</strong> and participates directly in the sum.
      </p>
      <BitCellRow bits={bits} subLabels={meta.labels} highlightIndices={meta.highlightIndices} size="sm" />
      <StepList steps={getTwosComplementDecodeSteps(bits)} />
      <p className="text-[11px] text-slate-500 font-mono">Range for {bitWidth}-bit Two's Complement: {rangeText} (one extra negative value, one single zero)</p>
    </div>
  );
};
