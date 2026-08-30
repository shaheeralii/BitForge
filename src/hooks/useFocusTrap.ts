import { useEffect, RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Standard modal-dialog focus behavior:
 *  - On open, moves focus into the dialog (its first focusable element, or
 *    the dialog container itself if it has none).
 *  - While open, Tab/Shift+Tab cycle only through elements inside the
 *    dialog, so focus can't silently leak to the page behind it.
 *  - On close, restores focus to whatever element had it before the dialog
 *    opened (typically the button that triggered it).
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const focusable = getFocusable();
    (focusable[0] ?? container).focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to whatever opened the dialog, if it's still around.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef]);
}
