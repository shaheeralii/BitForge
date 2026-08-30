import React, { createContext, useContext, useEffect, useRef } from 'react';

export interface ShortcutTarget {
  /** Focuses this mode's primary input field. */
  focusInput?: () => void;
  /** Copies this mode's primary result value. */
  copyResult?: () => void;
  /** Clears this mode's primary input back to its default/empty state. */
  clearInput?: () => void;
}

const ShortcutTargetRefContext = createContext<React.MutableRefObject<ShortcutTarget> | null>(null);

export const ShortcutTargetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<ShortcutTarget>({});
  return <ShortcutTargetRefContext.Provider value={ref}>{children}</ShortcutTargetRefContext.Provider>;
};

/**
 * Lets the currently-mounted mode register handlers for the global
 * keyboard shortcuts. Since only one mode's components are mounted at a
 * time (App.tsx renders one branch per activeMode), whichever mode is
 * active simply owns these fields for as long as it's mounted, and
 * cleanly removes only the fields it added on unmount.
 */
export function useRegisterShortcutTarget(partial: ShortcutTarget) {
  const ref = useContext(ShortcutTargetRefContext);
  useEffect(() => {
    if (!ref) return;
    Object.assign(ref.current, partial);
    return () => {
      for (const key of Object.keys(partial)) {
        delete (ref.current as Record<string, unknown>)[key];
      }
    };
  });
}

export function useShortcutTargetRef(): React.MutableRefObject<ShortcutTarget> {
  const ref = useContext(ShortcutTargetRefContext);
  if (!ref) throw new Error('useShortcutTargetRef must be used within a ShortcutTargetProvider');
  return ref;
}
