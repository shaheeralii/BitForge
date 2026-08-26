import React, { useMemo, useState } from 'react';
import { Plus, Minus, X, Divide, AlertTriangle, Sigma, Table as TableIcon, Hash, Copy, Check } from 'lucide-react';
import {
  BinaryOperator,
  BitWidth,
  parseBinaryOperand,
  computeBinaryOperation,
  bitsToSignedBigInt,
} from '../utils/binaryOps';
import { useHistory } from '../context/HistoryContext';

const WIDTHS: BitWidth[] = [4, 8, 16, 32, 64];
const OPERATORS: { id: BinaryOperator; icon: React.ElementType; label: string }[] = [
  { id: '+', icon: Plus, label: 'Add' },
  { id: '-', icon: Minus, label: 'Subtract' },
  { id: '×', icon: X, label: 'Multiply' },
  { id: '÷', icon: Divide, label: 'Divide' },
];

function groupNibbles(bits: string): string {
  const chunks: string[] = [];
  for (let i = bits.length; i > 0; i -= 4) {
    chunks.unshift(bits.slice(Math.max(0, i - 4), i));
  }
  return chunks.join(' ');
}

function bitsToHex(bits: string): string {
  const val = BigInt('0b' + bits);
  const hexLen = Math.ceil(bits.length / 4);
  return '0x' + val.toString(16).toUpperCase().padStart(hexLen, '0');
}

export const BinaryOperationsCard: React.FC = () => {
  const [width, setWidth] = useState<BitWidth>(8);
  const [rawA, setRawA] = useState('00001101');
  const [rawB, setRawB] = useState('00000101');
  const [operator, setOperator] = useState<BinaryOperator>('+');

  const parsedA = useMemo(() => parseBinaryOperand(rawA, width), [rawA, width]);
  const parsedB = useMemo(() => parseBinaryOperand(rawB, width), [rawB, width]);

  const bothValid = parsedA.valid && parsedB.valid;

  const result = useMemo(() => {
    if (!bothValid) return null;
    return computeBinaryOperation(parsedA.bits, parsedB.bits, width, operator);
  }, [bothValid, parsedA.bits, parsedB.bits, width, operator]);

  const opMeta = OPERATORS.find(o => o.id === operator)!;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- Controls */}
      <div className="glass-panel mint-glow rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#0A3324] text-[#34E89A]">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#EAFFF6] uppercase tracking-wider">
              Binary Arithmetic Operations
            </h2>
            <p className="text-xs text-[#34E89A]/80">
              Bit-accurate addition, subtraction, multiplication &amp; division with full derivations
            </p>
          </div>
        </div>

        {/* Bit width selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9FFF4]/60 mr-1">Bit Width</span>
          {WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold border transition-colors ${
                width === w
                  ? 'bg-[#34E89A] text-[#0A3324] border-[#34E89A] shadow-sm shadow-[#34E89A]/40'
                  : 'bg-black/20 text-[#D9FFF4]/70 border-[#34E89A]/15 hover:border-[#34E89A]/40 hover:text-white'
              }`}
            >
              {w}-bit
            </button>
          ))}
        </div>

        {/* Operand + operator row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <OperandField label="Operand A" value={rawA} onChange={setRawA} parsed={parsedA} />

          <div className="flex md:flex-col items-center justify-center gap-1.5 pt-1 md:pt-6">
            {OPERATORS.map(op => {
              const Icon = op.icon;
              const active = operator === op.id;
              return (
                <button
                  key={op.id}
                  onClick={() => setOperator(op.id)}
                  title={op.label}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                    active
                      ? 'bg-[#34E89A] text-[#0A3324] border-[#34E89A] shadow-sm shadow-[#34E89A]/40'
                      : 'bg-black/20 text-[#D9FFF4]/70 border-[#34E89A]/15 hover:border-[#34E89A]/40 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <OperandField label="Operand B" value={rawB} onChange={setRawB} parsed={parsedB} />
        </div>
      </div>

      {/* ---------------------------------------------------------------- Results */}
      {result && <ResultSummary result={result} width={width} opMeta={opMeta} rawA={rawA} rawB={rawB} />}
      {result && <ResultTrace result={result} width={width} />}

      {!bothValid && (
        <div className="glass-panel rounded-xl p-6 text-center text-[#D9FFF4]/60 border-dashed">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-[#34E89A]/60" />
          <p className="text-sm font-semibold text-[#D9FFF4]">Fix the operand errors above to see the calculation.</p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const OperandField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  parsed: ReturnType<typeof parseBinaryOperand>;
}> = ({ label, value, onChange, parsed }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-[#D9FFF4]/60">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      spellCheck={false}
      placeholder="e.g. 1101"
      className={`w-full font-mono text-lg tracking-widest px-4 py-2.5 rounded-lg bg-black/25 border outline-none transition-colors text-[#EAFFF6] placeholder:text-[#D9FFF4]/30 ${
        parsed.valid ? 'border-[#34E89A]/25 focus:border-[#34E89A]' : 'border-red-400/60 focus:border-red-400'
      }`}
    />
    {parsed.valid ? (
      <p className="text-[11px] font-mono text-[#34E89A]/70">{groupNibbles(parsed.bits)}</p>
    ) : (
      <p className="text-[11px] font-mono text-red-300 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 shrink-0" /> {parsed.error}
      </p>
    )}
  </div>
);

const Chip: React.FC<{ label: string; value: string; tone?: 'ok' | 'warn' }> = ({ label, value, tone = 'ok' }) => (
  <div
    className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold border ${
      tone === 'warn'
        ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
        : 'bg-black/20 text-[#D9FFF4]/80 border-[#34E89A]/15'
    }`}
  >
    {label}: <span className={tone === 'warn' ? 'text-amber-200' : 'text-[#34E89A]'}>{value}</span>
  </div>
);

const ResultSummary: React.FC<{
  result: ReturnType<typeof computeBinaryOperation>;
  width: number;
  opMeta: typeof OPERATORS[number];
  rawA: string;
  rawB: string;
}> = ({
  result,
  width,
  opMeta,
  rawA,
  rawB,
}) => {
  const { addEntry } = useHistory();
  const [copied, setCopied] = useState(false);

  if (result.kind === 'divide' && result.data.divideByZero) {
    return (
      <div className="glass-panel mint-glow rounded-xl p-6 text-center">
        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-300" />
        <p className="text-sm font-bold text-red-300">Division by zero is undefined.</p>
        <p className="text-xs text-[#D9FFF4]/60 mt-1">Operand B must be non-zero to compute A ÷ B.</p>
      </div>
    );
  }

  let resultBits: string;
  let extraChips: React.ReactNode = null;

  if (result.kind === 'addsub') {
    const d = result.data;
    resultBits = d.resultBits;
    extraChips = (
      <>
        <Chip label="Final Carry" value={d.finalCarryOut} />
        {d.operator === '-' && <Chip label="Borrow" value={d.borrow ? 'Yes (A < B)' : 'No'} tone={d.borrow ? 'warn' : 'ok'} />}
        <Chip label="Unsigned Overflow" value={d.unsignedOverflow ? 'Yes' : 'No'} tone={d.unsignedOverflow ? 'warn' : 'ok'} />
        <Chip label="Signed Overflow" value={d.signedOverflow ? 'Yes' : 'No'} tone={d.signedOverflow ? 'warn' : 'ok'} />
      </>
    );
  } else if (result.kind === 'multiply') {
    const d = result.data;
    resultBits = d.resultBits;
    extraChips = (
      <>
        <Chip label={`Full Product (${width * 2}-bit)`} value={groupNibbles(d.fullProductBits)} />
        <Chip label={`Fits in ${width}-bit`} value={d.overflow ? 'No — truncated' : 'Yes'} tone={d.overflow ? 'warn' : 'ok'} />
      </>
    );
  } else {
    const d = result.data;
    resultBits = d.quotientBits;
    extraChips = <Chip label="Remainder" value={`${groupNibbles(d.remainderBits)} (${d.decimalRemainder.toString()})`} />;
  }

  const signedVal = bitsToSignedBigInt(resultBits, width);
  const unsignedVal = BigInt('0b' + resultBits);

  const copyResult = () => {
    navigator.clipboard.writeText(resultBits);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    addEntry({
      mode: 'operations',
      operation: `A ${opMeta.id} B (${width}-bit)`,
      input: `A=${rawA.trim() || '0'}  B=${rawB.trim() || '0'}`,
      inputLabel: `${width}-bit Operands`,
      output: groupNibbles(resultBits),
      outputLabel: `Result (${opMeta.label})`,
    });
  };

  return (
    <div className="glass-panel mint-glow rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9FFF4]/60">
          <opMeta.icon className="w-3.5 h-3.5 text-[#34E89A]" />
          Result — A {opMeta.id} B
        </div>
        <button
          onClick={copyResult}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-black/20 text-[#D9FFF4]/70 hover:text-[#34E89A] border border-[#34E89A]/15 hover:border-[#34E89A]/40'
          }`}
          title="Copy result"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      <div className="font-mono text-2xl sm:text-3xl tracking-widest text-[#34E89A] break-all">
        {groupNibbles(resultBits)}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Unsigned Decimal" value={unsignedVal.toString()} />
        <Chip label="Signed Decimal (2's complement)" value={signedVal.toString()} />
        <Chip label="Hexadecimal" value={bitsToHex(resultBits)} />
        {extraChips}
      </div>
    </div>
  );
};

const ResultTrace: React.FC<{ result: ReturnType<typeof computeBinaryOperation>; width: number }> = ({ result, width }) => {
  if (result.kind === 'divide' && result.data.divideByZero) return null;

  return (
    <div className="glass-panel rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9FFF4]/60">
        <TableIcon className="w-3.5 h-3.5 text-[#34E89A]" />
        Step-by-Step Derivation
      </div>

      {result.kind === 'addsub' && <AddSubTrace data={result.data} />}
      {result.kind === 'multiply' && <MultiplyTrace data={result.data} />}
      {result.kind === 'divide' && !result.data.divideByZero && <DivideTrace data={result.data} />}
    </div>
  );
};

const thClass = 'px-3 py-2 text-left font-bold text-[#34E89A]/80 uppercase tracking-wider text-[10px]';
const tdClass = 'px-3 py-2 border-t border-[#34E89A]/10 text-[#D9FFF4]';

const AddSubTrace: React.FC<{ data: ReturnType<typeof computeBinaryOperation> extends { kind: 'addsub'; data: infer D } ? D : never }> = ({ data }) => {
  const rowsMsbFirst = [...data.rows].reverse();
  return (
    <div className="space-y-3">
      {data.operator === '-' && (
        <p className="text-xs text-[#D9FFF4]/70 leading-relaxed">
          Subtraction is performed as <span className="font-mono text-[#34E89A]">A + (two's complement of B)</span>:
          invert every bit of B, then add 1. That value is added to A using standard binary addition; the
          carry out of the top bit is discarded (or used as the "no borrow" flag).
        </p>
      )}
      {data.operator === '-' && data.bComplementBits && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="bg-black/20 rounded-md px-3 py-2 border border-[#34E89A]/10">
            <div className="text-[#D9FFF4]/50 uppercase text-[10px] mb-1">B (original)</div>
            <div className="text-[#D9FFF4]">{groupNibbles(data.bBits)}</div>
          </div>
          <div className="bg-black/20 rounded-md px-3 py-2 border border-[#34E89A]/10">
            <div className="text-[#D9FFF4]/50 uppercase text-[10px] mb-1">~B (inverted)</div>
            <div className="text-[#D9FFF4]">{groupNibbles(data.bBits.split('').map(c => c === '0' ? '1' : '0').join(''))}</div>
          </div>
          <div className="bg-black/20 rounded-md px-3 py-2 border border-[#34E89A]/10">
            <div className="text-[#D9FFF4]/50 uppercase text-[10px] mb-1">~B + 1 (two's complement)</div>
            <div className="text-[#34E89A]">{groupNibbles(data.bComplementBits)}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-xs font-mono min-w-[420px]">
          <thead>
            <tr>
              <th className={thClass}>Bit</th>
              <th className={thClass}>A</th>
              <th className={thClass}>{data.operator === '-' ? "B'" : 'B'}</th>
              <th className={thClass}>Carry In</th>
              <th className={thClass}>Sum</th>
              <th className={thClass}>Carry Out</th>
            </tr>
          </thead>
          <tbody>
            {rowsMsbFirst.map(r => (
              <tr key={r.index}>
                <td className={tdClass}>{r.index}{r.index === 0 ? ' (LSB)' : (r.index === data.width - 1 ? ' (MSB)' : '')}</td>
                <td className={tdClass}>{r.a}</td>
                <td className={tdClass}>{r.b}</td>
                <td className={tdClass}>{r.carryIn}</td>
                <td className={`${tdClass} text-[#34E89A] font-bold`}>{r.sum}</td>
                <td className={tdClass}>{r.carryOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MultiplyTrace: React.FC<{ data: ReturnType<typeof computeBinaryOperation> extends { kind: 'multiply'; data: infer D } ? D : never }> = ({ data }) => (
  <div className="space-y-3">
    <p className="text-xs text-[#D9FFF4]/70 leading-relaxed">
      Shift-and-add multiplication: for every bit of B (LSB → MSB), if the bit is 1, add A shifted left by
      that bit's position into a running sum. The final sum is the exact {data.width * 2}-bit product.
    </p>
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full text-xs font-mono min-w-[560px]">
        <thead>
          <tr>
            <th className={thClass}>Step (B bit)</th>
            <th className={thClass}>Multiplier Bit</th>
            <th className={thClass}>Partial Product (A ≪ i)</th>
            <th className={thClass}>Running Sum</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(r => (
            <tr key={r.index}>
              <td className={tdClass}>i = {r.index}</td>
              <td className={`${tdClass} ${r.multiplierBit === '1' ? 'text-[#34E89A] font-bold' : ''}`}>{r.multiplierBit}</td>
              <td className={tdClass}>{groupNibbles(r.shiftedBits)}</td>
              <td className={tdClass}>{groupNibbles(r.runningSumBits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DivideTrace: React.FC<{ data: ReturnType<typeof computeBinaryOperation> extends { kind: 'divide'; data: infer D } ? D : never }> = ({ data }) => (
  <div className="space-y-3">
    <p className="text-xs text-[#D9FFF4]/70 leading-relaxed">
      Restoring binary long division: process each bit of A from MSB → LSB. Shift the remainder left and
      bring down the next bit. If the remainder is ≥ the divisor, subtract the divisor and record a
      quotient bit of 1; otherwise record 0 and leave the remainder unchanged.
    </p>
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full text-xs font-mono min-w-[640px]">
        <thead>
          <tr>
            <th className={thClass}>Step</th>
            <th className={thClass}>Bit Brought Down</th>
            <th className={thClass}>Remainder (shifted)</th>
            <th className={thClass}>Comparison</th>
            <th className={thClass}>Remainder After</th>
            <th className={thClass}>Quotient Bit</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(r => (
            <tr key={r.index}>
              <td className={tdClass}>{r.index + 1}</td>
              <td className={tdClass}>{r.bitBroughtDown}</td>
              <td className={tdClass}>{r.remainderShifted}</td>
              <td className={`${tdClass} ${r.comparison === 'remainder >= divisor' ? 'text-[#34E89A]' : 'text-[#D9FFF4]/60'}`}>{r.comparison}</td>
              <td className={tdClass}>{r.remainderAfterSubtract}</td>
              <td className={`${tdClass} ${r.quotientBit === '1' ? 'text-[#34E89A] font-bold' : ''}`}>{r.quotientBit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
