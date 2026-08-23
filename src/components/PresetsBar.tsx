import React from 'react';
import { BaseType, PresetItem } from '../types';
import { Sparkles, Bookmark } from 'lucide-react';

interface PresetsBarProps {
  onSelectPreset: (preset: PresetItem) => void;
}

export const PRESETS: PresetItem[] = [
  {
    label: '255 (8-Bit Max)',
    value: '255',
    base: '10',
    category: 'common',
    description: 'Max 8-bit unsigned integer (0xFF / 0b11111111)',
  },
  {
    label: '1024 (2¹⁰)',
    value: '1024',
    base: '10',
    category: 'common',
    description: '1 Kibibyte in bytes (0x400 / 0b10000000000)',
  },
  {
    label: '0x1A3F (Hex)',
    value: '1A3F',
    base: '16',
    category: 'common',
    description: '16-bit Hexadecimal word (6719 in Decimal)',
  },
  {
    label: '0b11010110',
    value: '11010110',
    base: '2',
    category: 'common',
    description: '8-bit binary pattern (214 in Decimal / 0xD6)',
  },
  {
    label: '755 (Unix Octal)',
    value: '755',
    base: '8',
    category: 'networking',
    description: 'Standard rwxr-xr-x Unix directory permissions',
  },
  {
    label: '13.625 (Fraction)',
    value: '13.625',
    base: '10',
    category: 'fraction',
    description: 'Decimal with fractional part (0b1101.101 in binary)',
  },
  {
    label: '65535 (16-Bit Max)',
    value: '65535',
    base: '10',
    category: 'common',
    description: 'Max 16-bit unsigned integer (0xFFFF)',
  },
];

export const PresetsBar: React.FC<PresetsBarProps> = ({ onSelectPreset }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
      <div className="flex items-center gap-1.5 text-[#1F6B4C] dark:text-[#34E89A] font-bold uppercase tracking-wider shrink-0 mr-1">
        <Bookmark className="w-3.5 h-3.5 text-[#34E89A]" />
        <span>Quick Presets:</span>
      </div>

      {PRESETS.map((p, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPreset(p)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0A2E1D] hover:bg-[#D9FFF4] hover:text-[#0A3324] dark:hover:bg-[#0A3324] dark:hover:text-[#34E89A] text-[#0A3324] dark:text-[#D9FFF4] border border-slate-200 dark:border-[#1F6B4C]/40 transition-all font-medium shadow-xs"
          title={p.description}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};
