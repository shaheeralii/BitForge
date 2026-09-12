import React from 'react';

export type FloatSegment = 'sign' | 'exponent' | 'fraction';

interface FloatBitStripProps {
  signBit: 0 | 1;
  exponentBits: string;
  fractionBits: string;
  /** When true, bits are clickable toggles (used by the decode direction). */
  interactive?: boolean;
  onToggleBit?: (field: FloatSegment, indexInField: number) => void;
  /** Highlights one field and dims the others; clicking a bit also reports its field. */
  selectedSegment?: FloatSegment | null;
  onSegmentSelect?: (field: FloatSegment) => void;
}

const SEGMENT_META: Record<FloatSegment, { label: string; base: string; active: string; text: string; ring: string }> = {
  sign: {
    label: 'Sign',
    base: 'bg-[var(--bf-surface-deep)] border-amber-500/30 text-amber-200/70',
    active: 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]',
    text: 'text-amber-300',
    ring: 'ring-amber-400/40',
  },
  exponent: {
    label: 'Exponent',
    base: 'bg-[var(--bf-surface-deep)] border-sky-500/30 text-sky-200/70',
    active: 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.3)]',
    text: 'text-sky-300',
    ring: 'ring-sky-400/40',
  },
  fraction: {
    label: 'Fraction',
    base: 'bg-[var(--bf-surface-deep)] border-[var(--bf-accent)]/30 text-[var(--bf-accent)]/70',
    active: 'bg-[var(--bf-accent)]/20 border-[var(--bf-accent)] text-[var(--bf-heading)] shadow-[0_0_0_1px_rgb(var(--bf-accent-rgb)/35%)]',
    text: 'text-[var(--bf-accent)]',
    ring: 'ring-[var(--bf-accent)]/40',
  },
};

/**
 * Renders the sign / exponent / fraction fields as three color-coded groups
 * of bit boxes. Box size scales down automatically for wider formats
 * (Binary64's 52-bit fraction, or a large Custom Format) so the strip stays
 * legible without needing a different component per format.
 */
export const FloatBitStrip: React.FC<FloatBitStripProps> = ({
  signBit,
  exponentBits,
  fractionBits,
  interactive = false,
  onToggleBit,
  selectedSegment = null,
  onSegmentSelect,
}) => {
  const totalBits = 1 + exponentBits.length + fractionBits.length;
  const boxSize = totalBits > 40
    ? 'w-4 h-5 sm:w-5 sm:h-6 text-[9px]'
    : totalBits > 24
    ? 'w-5 h-6 sm:w-6 sm:h-7 text-[10px]'
    : 'w-6 h-8 sm:w-7 sm:h-9 text-xs';

  const renderField = (field: FloatSegment, bitsStr: string) => {
    const meta = SEGMENT_META[field];
    const isDimmed = selectedSegment !== null && selectedSegment !== field;

    return (
      <div className={`flex flex-col gap-1.5 transition-opacity ${isDimmed ? 'opacity-40' : 'opacity-100'}`}>
        <button
          type="button"
          onClick={() => onSegmentSelect?.(field)}
          className={`text-left text-[10px] font-bold uppercase tracking-wider px-0.5 ${meta.text} hover:underline underline-offset-2 w-fit`}
        >
          {meta.label} <span className="font-mono normal-case text-[9px] opacity-70">({bitsStr.length} bit{bitsStr.length === 1 ? '' : 's'})</span>
        </button>
        <div className={`flex gap-0.5 sm:gap-1 flex-wrap`} aria-hidden={!interactive}>
          {bitsStr.split('').map((bit, i) => (
            interactive ? (
              <button
                key={i}
                type="button"
                onClick={() => { onSegmentSelect?.(field); onToggleBit?.(field, i); }}
                aria-pressed={bit === '1'}
                aria-label={`${meta.label} bit ${i}, currently ${bit}`}
                className={`${boxSize} rounded-md border font-mono font-bold flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 cursor-pointer ${bit === '1' ? meta.active : meta.base} ${selectedSegment === field ? `ring-2 ${meta.ring}` : ''}`}
                title={`Click to toggle bit ${i} of ${meta.label}`}
              >
                {bit}
              </button>
            ) : (
              // Decorative/duplicate of the plain-text bit values already
              // readable in the Result section below, so these individual
              // boxes are not real per-bit controls here (unlike the decode
              // grid) — only the field label above is a focusable control,
              // rather than making every one of up to 52 identical-purpose
              // boxes its own keyboard tab stop for the same "select this
              // field" action.
              <span
                key={i}
                onClick={() => onSegmentSelect?.(field)}
                className={`${boxSize} rounded-md border font-mono font-bold flex items-center justify-center shrink-0 cursor-pointer ${bit === '1' ? meta.active : meta.base} ${selectedSegment === field ? `ring-2 ${meta.ring}` : ''}`}
              >
                {bit}
              </span>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-3 sm:gap-4">
      {renderField('sign', String(signBit))}
      {renderField('exponent', exponentBits)}
      {renderField('fraction', fractionBits)}
    </div>
  );
};
