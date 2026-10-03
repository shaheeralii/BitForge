import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`. Used to
 * keep screen-reader announcements from firing on every keystroke: the
 * announcement text is derived immediately, but only the value that survives
 * a short pause is handed to the live region.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
