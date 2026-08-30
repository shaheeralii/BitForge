import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a setTimeout-like function that automatically clears any pending
 * timers when the owning component unmounts. Used for transient UI
 * feedback (e.g. "Copied!" resetting after 2s) so a component that
 * unmounts mid-countdown (switching tools right after a copy, for example)
 * doesn't leave a dangling callback that fires a state update after the
 * fact.
 */
export function useAutoResetTimer() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
}
