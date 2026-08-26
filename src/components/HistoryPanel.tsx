import React, { useMemo, useState } from 'react';
import { useHistory } from '../context/HistoryContext';
import { HistoryMode } from '../types';
import { History, X, Search, Trash2, ArrowRight, RotateCcw, Calculator, Binary, Cpu, Type, SquareSigma } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReuseConverterEntry: (input: string) => void;
}

const MODE_META: Record<HistoryMode, { label: string; icon: React.ElementType }> = {
  converter: { label: 'Number Converter', icon: Calculator },
  bitgrid: { label: 'Bit Grid', icon: Binary },
  twos_complement: { label: "Two's Complement", icon: Cpu },
  ascii: { label: 'Text & ASCII', icon: Type },
  operations: { label: 'Binary Operations', icon: SquareSigma },
};

function timeAgo(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString();
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onReuseConverterEntry }) => {
  const { entries, removeEntry, clearAll, clearMode } = useHistory();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<HistoryMode | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (modeFilter !== 'all' && e.mode !== modeFilter) return false;
      if (!q) return true;
      return (
        e.input.toLowerCase().includes(q) ||
        e.output.toLowerCase().includes(q) ||
        e.operation.toLowerCase().includes(q) ||
        e.inputLabel.toLowerCase().includes(q) ||
        e.outputLabel.toLowerCase().includes(q)
      );
    });
  }, [entries, query, modeFilter]);

  const modesInUse = useMemo(() => {
    const s = new Set<HistoryMode>();
    entries.forEach(e => s.add(e.mode));
    return Array.from(s);
  }, [entries]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Conversion history"
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#041A11] border-l border-[#34E89A]/20 shadow-2xl z-50 flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1F6B4C]/30 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#34E89A]" />
            <h2 className="text-sm font-bold text-[#D9FFF4] uppercase tracking-wider">Conversion History</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A3324] text-[#34E89A] border border-[#34E89A]/30">
              {entries.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#D9FFF4]/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-4 py-3 border-b border-[#1F6B4C]/30 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#D9FFF4]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-black/25 border border-[#34E89A]/15 text-[#D9FFF4] placeholder:text-[#D9FFF4]/30 outline-none focus:border-[#34E89A]/50 transition-colors"
            />
          </div>
          {modesInUse.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                onClick={() => setModeFilter('all')}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                  modeFilter === 'all'
                    ? 'bg-[#34E89A] text-[#0A3324] border-[#34E89A]'
                    : 'bg-black/20 text-[#D9FFF4]/60 border-[#34E89A]/15 hover:border-[#34E89A]/40'
                }`}
              >
                All
              </button>
              {modesInUse.map(m => (
                <button
                  key={m}
                  onClick={() => setModeFilter(m)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                    modeFilter === m
                      ? 'bg-[#34E89A] text-[#0A3324] border-[#34E89A]'
                      : 'bg-black/20 text-[#D9FFF4]/60 border-[#34E89A]/15 hover:border-[#34E89A]/40'
                  }`}
                >
                  {MODE_META[m].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {entries.length === 0 && (
            <div className="text-center py-12 text-[#D9FFF4]/40">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No conversions recorded yet.</p>
              <p className="text-[11px] mt-1">Copy any result and it'll show up here.</p>
            </div>
          )}
          {entries.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12 text-[#D9FFF4]/40">
              <p className="text-xs font-medium">No entries match your search.</p>
            </div>
          )}
          {filtered.map(entry => {
            const meta = MODE_META[entry.mode];
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="group rounded-lg border border-[#1F6B4C]/40 bg-[#072818]/60 p-3 space-y-1.5 hover:border-[#34E89A]/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#34E89A]/80">
                    <Icon className="w-3 h-3" />
                    <span>{meta.label}</span>
                    <span className="text-[#D9FFF4]/30 font-normal normal-case">· {entry.operation}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.mode === 'converter' && (
                      <button
                        onClick={() => {
                          onReuseConverterEntry(entry.input);
                          onClose();
                        }}
                        className="p-1 text-[#D9FFF4]/50 hover:text-[#34E89A] rounded transition-colors"
                        title="Reuse this input in the converter"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-[#D9FFF4]/50 hover:text-rose-400 rounded transition-colors"
                      title="Remove this entry"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] uppercase text-[#D9FFF4]/40">{entry.inputLabel}</div>
                    <div className="text-[#D9FFF4] truncate" title={entry.input}>{entry.input}</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#34E89A]/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] uppercase text-[#D9FFF4]/40">{entry.outputLabel}</div>
                    <div className="text-[#34E89A] font-bold truncate" title={entry.output}>{entry.output}</div>
                  </div>
                </div>

                <div className="text-[10px] text-[#D9FFF4]/35">{timeAgo(entry.timestamp)}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1F6B4C]/30 shrink-0">
            <button
              onClick={() => (modeFilter === 'all' ? clearAll() : clearMode(modeFilter))}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-black/20 hover:bg-rose-950/40 text-[#D9FFF4]/70 hover:text-rose-300 border border-[#1F6B4C]/40 hover:border-rose-900/60 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{modeFilter === 'all' ? 'Clear all history' : `Clear ${MODE_META[modeFilter].label} history`}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
