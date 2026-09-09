import { useEffect } from 'react';

// Module-level counter so multiple dialogs locking scroll at once (however
// unlikely) don't stomp on each other's restore value — only the last lock
// to release actually restores the original overflow style.
let lockCount = 0;
let previousOverflow = '';

/**
 * Prevents the underlying page from scrolling while a modal or full-screen
 * mobile panel is open, and restores normal scrolling when it closes. Call
 * with `isOpen` from any dialog/panel component; safe to use from several
 * components at once since locks are reference-counted.
 */
export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen]);
}
