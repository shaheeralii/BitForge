import React from 'react';
import { Layers, HelpCircle, Table2 } from 'lucide-react';
import { DerivationDisclosure } from './DerivationDisclosure';
import {
  RepresentationId,
  REPRESENTATION_LABELS,
  decodeAllRepresentations,
  formatValueForDisplay,
  encodeTwosComplement,
  getRepresentationRange,
  addBitStrings,
} from '../utils/signedRepresentations';

interface BitRepresentationInsightsProps {
  bits: string;
  bitWidth: number;
  /** The number currently shown in the main workspace, under whichever lens is active — used to pick a "live" example for the Why Two's Complement addition demo when it fits the current bit width. */
  currentValue: number;
}

const REPR_ORDER: RepresentationId[] = ['unsigned', 'sign-magnitude', 'ones-complement', 'twos-complement'];

const COMPARISON_ROWS: { id: RepresentationId; positive: string; negative: string; zero: string }[] = [
  { id: 'unsigned', positive: 'Written directly in binary', negative: 'Not representable', zero: 'One (00000000)' },
  { id: 'sign-magnitude', positive: 'Written directly; sign bit = 0', negative: 'Set the dedicated sign bit to 1', zero: 'Two (+0 and −0)' },
  { id: 'ones-complement', positive: 'Written directly in binary', negative: 'Invert every bit', zero: 'Two (+0 and −0)' },
  { id: 'twos-complement', positive: 'Written directly in binary', negative: 'Invert every bit, then add 1', zero: 'One (00000000)' },
];

export const BitRepresentationInsights: React.FC<BitRepresentationInsightsProps> = ({ bits, bitWidth, currentValue }) => {
  const decoded = decodeAllRepresentations(bits);

  // Prefer demonstrating with the value currently on screen; fall back to a
  // safe, universally-valid example (25) if that value can't be negated
  // within the current bit width under Two's Complement.
  const liveFits = encodeTwosComplement(currentValue, bitWidth).valid && encodeTwosComplement(-currentValue, bitWidth).valid && currentValue !== 0;
  const demoValue = liveFits ? Math.abs(currentValue) : 25;
  const posEnc = encodeTwosComplement(demoValue, bitWidth);
  const negEnc = encodeTwosComplement(-demoValue, bitWidth);
  const sum = posEnc.valid && negEnc.valid ? addBitStrings(posEnc.bits, negEnc.bits) : null;

  return (
    <div className="space-y-3">
      {/* Same Bits, Different Meaning */}
      <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-4 sm:p-5">
        <DerivationDisclosure
          toggleLabel="Toggle same bits, different meaning"
          bar={
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-semibold text-[var(--bf-heading)]">Same Bits, Different Meaning</h3>
                <p className="text-[11px] text-[var(--bf-accent)]/80">What your current bit pattern means under all four systems at once</p>
              </div>
            </div>
          }
        >
          <div className="border-t border-[var(--bf-muted)]/30 pt-3 space-y-3">
            <div className="font-mono text-sm text-[var(--bf-heading)] font-bold tracking-wide">{bits}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REPR_ORDER.map(id => (
                <div key={id} className="bg-[var(--bf-surface-inset)] rounded-lg border border-[var(--bf-muted)]/40 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--bf-heading)]/65">{REPRESENTATION_LABELS[id]}</div>
                  <div className="font-mono text-base font-bold text-[var(--bf-accent)]">{formatValueForDisplay(decoded[id])}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--bf-heading)]/65 leading-relaxed">
              A bit pattern has no universal signed meaning on its own — its value depends entirely on which representation system is being applied to it.
            </p>
          </div>
        </DerivationDisclosure>
      </div>

      {/* Why Two's Complement */}
      <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-4 sm:p-5">
        <DerivationDisclosure
          toggleLabel="Toggle why two's complement is preferred"
          bar={
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-semibold text-[var(--bf-heading)]">Why Is Two's Complement Preferred?</h3>
                <p className="text-[11px] text-[var(--bf-accent)]/80">The practical reason modern computers standardized on it</p>
              </div>
            </div>
          }
        >
          <div className="border-t border-[var(--bf-muted)]/30 pt-3 space-y-3">
            <ul className="text-xs text-[var(--bf-heading)]/80 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Only <strong className="text-[var(--bf-heading)]">one</strong> representation of zero — no wasted or ambiguous bit pattern.</li>
              <li>Addition and subtraction reuse the exact same binary adder hardware as unsigned arithmetic — no special-cased circuitry for signs.</li>
              <li>Negative numbers participate naturally in ordinary binary addition; the sign never needs to be handled separately.</li>
              <li>The full {bitWidth}-bit range includes one additional negative value ({getRepresentationRange('twos-complement', bitWidth).min.toLocaleString()}) that Sign-Magnitude and One's Complement can't reach.</li>
            </ul>
            {sum && (
              <div>
                <p className="text-xs text-[var(--bf-heading)]/65 mb-1.5">{demoValue} + (−{demoValue}) using ordinary binary addition:</p>
                <div className="bg-[var(--bf-chip)] text-[var(--bf-accent)] p-3 rounded-lg font-mono text-xs space-y-0.5 overflow-x-auto scrollbar-none">
                  <div>{'  '}{posEnc.bits}{'   ('}+{demoValue}{')'}</div>
                  <div>+ {negEnc.bits}{'   ('}−{demoValue}{')'}</div>
                  <div className="border-t border-[var(--bf-accent)]/30 pt-0.5">{sum.carryOut === '1' ? sum.carryOut : ''} {sum.sumBits}</div>
                </div>
                <p className="text-[11px] text-[var(--bf-heading)]/50 mt-1.5">
                  The result is <code className="font-mono text-[var(--bf-accent)]">{sum.sumBits}</code> = 0{sum.carryOut === '1' ? ' — the extra carry bit simply falls off the end of the register and is discarded' : ''}.
                </p>
              </div>
            )}
          </div>
        </DerivationDisclosure>
      </div>

      {/* Representation Comparison Table */}
      <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-4 sm:p-5">
        <DerivationDisclosure
          toggleLabel="Toggle representation comparison table"
          bar={
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0">
                <Table2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-semibold text-[var(--bf-heading)]">Representation Comparison</h3>
                <p className="text-[11px] text-[var(--bf-accent)]/80">All four systems, side by side, at {bitWidth}-bit width</p>
              </div>
            </div>
          }
        >
          <div className="border-t border-[var(--bf-muted)]/30 pt-3 space-y-3">
            <div className="overflow-x-auto scrollbar-none rounded-lg border border-[var(--bf-muted)]/40 bg-[var(--bf-chip-alt)]">
              <table className="w-full text-left text-[11px] sm:text-xs font-mono">
                <thead className="bg-[var(--bf-surface)] text-[var(--bf-heading)] border-b border-[var(--bf-muted)]/40">
                  <tr>
                    {['Representation', 'Positive Rule', 'Negative Rule', 'Zero', `${bitWidth}-bit Range`].map(h => (
                      <th key={h} className="px-2.5 py-2 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bf-muted)]/30 text-[var(--bf-heading)]">
                  {COMPARISON_ROWS.map(row => {
                    const range = getRepresentationRange(row.id, bitWidth);
                    return (
                      <tr key={row.id} className="hover:bg-[var(--bf-chip)]/40 transition-colors">
                        <td className="px-2.5 py-1.5 whitespace-nowrap font-bold text-[var(--bf-accent)]">{REPRESENTATION_LABELS[row.id]}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap font-sans">{row.positive}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap font-sans">{row.negative}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap font-sans">{row.zero}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">{range.min.toLocaleString()} → {range.max.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[var(--bf-heading)]/65 leading-relaxed italic border-t border-[var(--bf-muted)]/30 pt-2.5">
              The same bits can mean different numbers under different representation systems. Sign-Magnitude uses a dedicated sign bit, One's Complement inverts every bit, and Two's Complement inverts every bit and adds 1. Modern computers primarily use Two's Complement because it provides a single zero and works naturally with binary arithmetic.
            </p>
          </div>
        </DerivationDisclosure>
      </div>
    </div>
  );
};
