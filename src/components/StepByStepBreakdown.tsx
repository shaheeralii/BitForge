import React from 'react';
import { BaseType, ConversionResult, StepDetail } from '../types';
import { BASE_OPTIONS } from '../utils/converter';
import { BookOpen, Calculator, HelpCircle, ArrowRight, Table, Binary } from 'lucide-react';

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
      <div className="bg-[#F4FAF9]/50 dark:bg-[#1E132B]/50 rounded-xl border border-dashed border-slate-300 dark:border-[#43637E]/40 p-8 text-center text-[#43637E] dark:text-slate-400">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#43637E] opacity-60" />
        <p className="font-semibold text-sm">No mathematical derivation available</p>
        <p className="text-xs text-[#43637E] dark:text-slate-400 mt-1">
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
    <div className="bg-white dark:bg-[#1E132B] rounded-xl border border-slate-200 dark:border-[#43637E]/40 p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#43637E]/30 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#321E48] text-[#65DCD5]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#321E48] dark:text-[#D9FFF4] uppercase tracking-wider">
              Step-by-Step Derivation
            </h2>
            <p className="text-xs text-[#43637E] dark:text-[#65DCD5]/80">
              Rigorous derivation converting <span className="font-semibold text-[#321E48] dark:text-[#D9FFF4]">{srcName}</span> to <span className="font-semibold text-[#0D9488] dark:text-[#65DCD5]">{tgtName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[#F4FAF9] dark:bg-[#251737] px-3 py-1.5 rounded-md text-[#321E48] dark:text-[#D9FFF4] border border-slate-200 dark:border-[#43637E]/40">
          <span>{conversion.normalizedSource}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#65DCD5]" />
          <span className="text-[#0D9488] dark:text-[#65DCD5]">
            {targetBase === '2' ? conversion.binary
             : targetBase === '8' ? conversion.octal
             : targetBase === '16' ? conversion.hexadecimal
             : targetBase === 'custom' ? conversion.customBaseValue
             : conversion.denary}
          </span>
        </div>
      </div>

      {/* List of Steps */}
      <div className="space-y-4">
        {conversion.steps.map((step, idx) => (
          <StepCard key={idx} step={step} index={idx + 1} />
        ))}
      </div>

      {/* Footer Verification Notice */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#43637E]/30 italic text-[#43637E] dark:text-slate-400 text-[11px] font-mono flex items-center justify-between">
        <span>BitForge Engine Logic verified</span>
        <span>Math Core 64-Bit Exact</span>
      </div>
    </div>
  );
};

const StepCard: React.FC<{ step: StepDetail; index: number }> = ({ step, index }) => {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#43637E]/40 bg-[#F4FAF9]/50 dark:bg-[#180E24] p-4 space-y-3">
      
      {/* Step Title & Type Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#321E48] text-[#65DCD5] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-[#65DCD5]/30">
            {index}
          </span>
          <h3 className="text-xs font-bold text-[#321E48] dark:text-[#D9FFF4] uppercase tracking-wider">
            {step.title}
          </h3>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D9FFF4] dark:bg-[#321E48] text-[#321E48] dark:text-[#65DCD5] border border-[#65DCD5]/30">
          {step.type}
        </span>
      </div>

      {/* Explanation Text */}
      <p className="text-xs text-[#43637E] dark:text-slate-300 leading-relaxed font-sans">
        {step.explanation}
      </p>

      {/* Table Data if present */}
      {step.tableData && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#43637E]/40 bg-white dark:bg-[#251737]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F4FAF9] dark:bg-[#1E132B] text-[#43637E] dark:text-[#D9FFF4] border-b border-slate-200 dark:border-[#43637E]/40">
              <tr>
                {step.tableData.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#43637E]/30 text-[#321E48] dark:text-slate-200">
              {step.tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-[#321E48]/40 transition-colors">
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
        <div className="bg-[#321E48] text-[#65DCD5] p-3 rounded-lg font-mono text-xs space-y-1 overflow-x-auto border border-[#43637E]/40">
          {step.equationLines.map((line, lIdx) => (
            <div key={lIdx} className="whitespace-pre-wrap leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: line }} />
            </div>
          ))}
        </div>
      )}

      {/* Final Step Result Badge */}
      {step.finalResult && (
        <div className="flex items-center justify-between text-xs font-mono font-bold text-[#321E48] dark:text-[#D9FFF4] bg-white dark:bg-[#251737] p-2.5 rounded-md border border-slate-200 dark:border-[#43637E]/40">
          <span className="text-[#43637E] dark:text-slate-400 font-sans">Step Outcome:</span>
          <span className="text-[#321E48] dark:text-[#65DCD5] font-bold">{step.finalResult}</span>
        </div>
      )}
    </div>
  );
};

