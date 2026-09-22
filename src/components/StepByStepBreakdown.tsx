import React from 'react';
import { BaseType, ConversionResult, StepDetail } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { BookOpen, HelpCircle, ArrowRight } from 'lucide-react';
import { DerivationDisclosure } from './DerivationDisclosure';

interface StepByStepBreakdownProps {
  conversion: ConversionResult;
  targetBase: BaseType;
  customRadix: number;
}

export const StepByStepBreakdown: React.FC<StepByStepBreakdownProps> = ({
  conversion,
  targetBase,
  customRadix,
}) => {
  if (!conversion.isValid || conversion.steps.length === 0) {
    return (
      <div className="bg-[var(--bf-surface)]/50 rounded-xl border border-dashed border-[var(--bf-muted)]/40 p-8 text-center text-slate-400">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[var(--bf-muted)] opacity-60" />
        <p className="font-semibold text-sm">No mathematical derivation available</p>
        <p className="text-xs text-slate-400 mt-1">
          Enter a valid number above to generate real-time step-by-step calculation steps.
        </p>
      </div>
    );
  }

  const srcName = conversion.sourceBase === 'custom'
    ? `Base ${customRadix}`
    : BASE_OPTIONS[conversion.sourceBase]?.name || `Base ${conversion.sourceBase}`;

  const tgtName = targetBase === 'custom'
    ? `Base ${customRadix}`
    : BASE_OPTIONS[targetBase]?.name || `Base ${targetBase}`;

  return (
    <div className="bg-[var(--bf-surface)] rounded-xl border border-[var(--bf-muted)]/40 p-5 sm:p-6 shadow-sm">
      <DerivationDisclosure
        toggleLabel="Toggle step-by-step derivation"
        bar={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-display font-semibold text-[var(--bf-heading)] uppercase tracking-wide">
                  Step-by-Step Derivation
                </h2>
                <p className="text-xs text-[var(--bf-accent)]/80">
                  Rigorous derivation converting <span className="font-semibold text-[var(--bf-heading)]">{srcName}</span> to <span className="font-semibold text-[var(--bf-accent)]">{tgtName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[var(--bf-chip-alt)] px-3 py-1.5 rounded-md text-[var(--bf-heading)] border border-[var(--bf-muted)]/40">
              <span>{conversion.normalizedSource}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--bf-accent)]" />
              <span className="text-[var(--bf-accent)]">
                {targetBase === '2' ? conversion.binary
                 : targetBase === '8' ? conversion.octal
                 : targetBase === '16' ? conversion.hexadecimal
                 : targetBase === 'custom' ? conversion.customBaseValue
                 : conversion.denary}
              </span>
              <span className="hidden sm:inline text-[10px] font-sans font-semibold uppercase tracking-wide text-[var(--bf-accent)]/70 border-l border-[var(--bf-muted)]/40 pl-2 ml-0.5">
                {conversion.steps.length} {conversion.steps.length === 1 ? 'step' : 'steps'}
              </span>
            </div>
          </div>
        }
      >
        <div className="border-t border-[var(--bf-muted)]/30 pt-4 space-y-4">
          {/* List of Steps */}
          <div className="space-y-4">
            {conversion.steps.map((step, idx) => (
              <StepCard key={idx} step={step} index={idx + 1} />
            ))}
          </div>

          {/* Footer Verification Notice */}
          <div className="pt-4 border-t border-[var(--bf-muted)]/30 italic text-slate-400 text-[11px] font-mono flex items-center justify-between">
            <span>BitForge Engine Logic verified</span>
            <span>Integer Engine: Exact</span>
          </div>
        </div>
      </DerivationDisclosure>
    </div>
  );
};

const StepCard: React.FC<{ step: StepDetail; index: number }> = ({ step, index }) => {
  return (
    <div className="rounded-lg border border-[var(--bf-muted)]/40 bg-[var(--bf-surface-inset)] p-4 space-y-3">
      
      {/* Step Title & Type Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--bf-chip)] text-[var(--bf-accent)] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-[var(--bf-accent)]/30">
            {index}
          </span>
          <h3 className="text-xs font-bold text-[var(--bf-heading)] uppercase tracking-wider">
            {step.title}
          </h3>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bf-chip)] text-[var(--bf-accent)] border border-[var(--bf-accent)]/30">
          {step.type}
        </span>
      </div>

      {/* Explanation Text */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {step.explanation}
      </p>

      {/* Table Data if present */}
      {step.tableData && (
        <div className="overflow-x-auto scrollbar-none rounded-lg border border-[var(--bf-muted)]/40 bg-[var(--bf-chip-alt)]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--bf-surface)] text-[var(--bf-heading)] border-b border-[var(--bf-muted)]/40">
              <tr>
                {step.tableData.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bf-muted)]/30 text-slate-200">
              {step.tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--bf-chip)]/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equation Lines if present */}
      {step.equationLines && step.equationLines.length > 0 && (
        <div className="bg-[var(--bf-chip)] text-[var(--bf-accent)] p-3 rounded-lg font-mono text-xs space-y-1 overflow-x-auto scrollbar-none border border-[var(--bf-muted)]/40">
          {step.equationLines.map((line, lIdx) => (
            <div key={lIdx} className="whitespace-pre-wrap leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Final Step Result Badge */}
      {step.finalResult && (
        <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--bf-heading)] bg-[var(--bf-chip-alt)] p-2.5 rounded-md border border-[var(--bf-muted)]/40">
          <span className="text-slate-400 font-sans">Step Outcome:</span>
          <span className="text-[var(--bf-accent)] font-bold">{step.finalResult}</span>
        </div>
      )}
    </div>
  );
};

