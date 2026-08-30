import { useEffect, MutableRefObject } from 'react';
import { ShortcutTarget } from '../context/ShortcutTargetContext';

interface UseKeyboardShortcutsOptions {
  targetRef: MutableRefObject<ShortcutTarget>;
  isHistoryOpen: boolean;
  isHelpOpen: boolean;
  onToggleHistory: () => void;
  onCloseHistory: () => void;
  onToggleHelp: () => void;
  onCloseHelp: () => void;
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Wires up a small, deliberately short set of global shortcuts. Letter-key
 * shortcuts only fire when focus isn't inside an editable field, so normal
 * typing (including typing "c", "h", "x" into any input) is never
 * interrupted. Escape is the one exception, since dismissing an overlay or
 * stepping out of a field is exactly what Escape is for everywhere else.
 */
export function useKeyboardShortcuts({
  targetRef,
  isHistoryOpen,
  isHelpOpen,
  onToggleHistory,
  onCloseHistory,
  onToggleHelp,
  onCloseHelp,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never fight the browser/OS over modified key combos.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (isHelpOpen) {
          onCloseHelp();
          return;
        }
        if (isHistoryOpen) {
          onCloseHistory();
          return;
        }
        if (isEditableElement(document.activeElement)) {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      const editing = isEditableElement(document.activeElement);
      if (editing) return;

      if (e.key === '?') {
        e.preventDefault();
        onToggleHelp();
      } else if (e.key === '/') {
        e.preventDefault();
        targetRef.current.focusInput?.();
      } else if (e.key === 'c' || e.key === 'C') {
        targetRef.current.copyResult?.();
      } else if (e.key === 'x' || e.key === 'X') {
        targetRef.current.clearInput?.();
      } else if (e.key === 'h' || e.key === 'H') {
        onToggleHistory();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetRef, isHistoryOpen, isHelpOpen, onToggleHistory, onCloseHistory, onToggleHelp, onCloseHelp]);
}
