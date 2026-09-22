import React from 'react';

interface BitCellRowProps {
  /** '0'/'1' characters, MSB first. */
  bits: string;
  /** Present to make cells interactive toggle buttons; omit for a read-only row. */
  onToggle?: (index: number) => void;
  /** Labels rendered under each cell (e.g. positional weight or bit index). */
  subLabels?: (string | number)[];
  /** Draws a visual gap/divider after this cell index (0-based) \u2014 used to split the sign bit from the magnitude bits in Sign-Magnitude. */
  dividerAfterIndex?: number;
  /** Cell indices to render in the accent/highlight treatment (e.g. the MSB). */
  highlightIndices?: number[];
  size?: 'sm' | 'md';
}

/**
 * Renders one row of bit cells, optionally interactive, optionally split by
 * a divider (Sign-Magnitude's [S][MMMMMMM] visual) and optionally annotated
 * with a sub-label per cell (positional weight, bit index, etc). This is the
 * single bit-visualization primitive reused across the whole Bit
 * Representation lab so there is exactly one interactive-bit-grid
 * implementation in the app, not one per page.
 */
export const BitCellRow: React.FC<BitCellRowProps> = ({
  bits,
  onToggle,
  subLabels,
  dividerAfterIndex,
  highlightIndices = [],
  size = 'md',
}) => {
  const cellSize = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm' : 'w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base';

  return (
    <div className="flex items-start gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
      {bits.split('').map((bit, idx) => {
        const isHighlighted = highlightIndices.includes(idx);
        const hasDivider = dividerAfterIndex === idx;
        const cellClasses = `shrink-0 ${cellSize} rounded-lg font-mono font-bold flex items-center justify-center transition-all duration-150 border ${
          isHighlighted
            ? 'bg-amber-400/15 border-amber-400/70 text-amber-300'
            : bit === '1'
            ? 'bg-[var(--bf-chip)] border-[var(--bf-accent)] text-[var(--bf-accent)] ring-1 ring-[var(--bf-accent)]/30'
            : 'bg-[var(--bf-surface-deep)] border-[var(--bf-muted)]/40 text-slate-500'
        }`;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1">
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => onToggle(idx)}
                  aria-pressed={bit === '1'}
                  aria-label={`Bit ${bits.length - 1 - idx}, currently ${bit}`}
                  className={`${cellClasses} active:scale-95 transform hover:border-[var(--bf-accent)]/70`}
                >
                  {bit}
                </button>
              ) : (
                <div className={cellClasses}>{bit}</div>
              )}
              {subLabels && (
                <span className={`text-[9px] sm:text-[10px] font-mono leading-none ${isHighlighted ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                  {subLabels[idx]}
                </span>
              )}
            </div>
            {hasDivider && <div className="w-2 sm:w-3 self-stretch flex items-center shrink-0"><div className="w-px h-8 sm:h-10 bg-[var(--bf-muted)]/60" /></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
};
