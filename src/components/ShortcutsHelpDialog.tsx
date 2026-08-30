import React, { useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ShortcutRow {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['/'], description: "Focus this tool's primary input" },
  { keys: ['C'], description: 'Copy the primary result' },
  { keys: ['X'], description: 'Clear the primary input' },
  { keys: ['H'], description: 'Open / close activity history' },
  { keys: ['?'], description: 'Open / close this shortcuts guide' },
  { keys: ['Esc'], description: 'Close a panel, or step out of a field' },
  { keys: ['Tab'], description: 'Move to the next field' },
  { keys: ['Shift', 'Tab'], description: 'Move to the previous field' },
];

interface ShortcutsHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpDialog: React.FC<ShortcutsHelpDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm bg-[#041A11] border border-[#34E89A]/20 rounded-xl shadow-2xl animate-fadeIn overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1F6B4C]/30">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#34E89A]" />
              <h2 className="text-sm font-bold text-[#D9FFF4] uppercase tracking-wider">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#D9FFF4]/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
              aria-label="Close keyboard shortcuts"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {SHORTCUTS.map(row => (
              <div key={row.description} className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#D9FFF4]/80">{row.description}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {row.keys.map((k, i) => (
                    <React.Fragment key={k}>
                      {i > 0 && <span className="text-[#D9FFF4]/30 text-[10px]">+</span>}
                      <kbd className="px-1.5 py-0.5 rounded-md bg-[#0A3324] border border-[#34E89A]/30 text-[#34E89A] text-[10px] font-mono font-bold">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <p className="text-[10px] text-[#D9FFF4]/35 leading-relaxed">
              Letter shortcuts only work when you're not typing in a field, so they never interrupt normal input.
              Every shortcut also has a visible button in the interface.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
