import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HistoryEntry, HistoryMode } from '../types';
import {
  HistoryOp,
  commitHistoryOp,
  HISTORY_STORAGE_KEY,
  makeHistoryEntry,
  readPersistedHistory,
} from './historyStore';

// Re-exported so existing imports (and tests) that reach for these through
// the context module keep working; the implementations live in historyStore.
export { isHistoryEntry, parseStoredHistoryPayload, serializeHistoryPayload } from './historyStore';

interface HistoryContextValue {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  clearMode: (mode: HistoryMode) => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

/**
 * React state here is a *mirror* of what's persisted, not a second source of
 * truth. Every mutation is an operation committed against the latest
 * persisted list under a cross-tab lock (see historyStore.ts), and the
 * result — which already includes anything other tabs wrote — becomes the
 * new state. The old design saved the whole in-memory list from an effect,
 * so two tabs adding at nearly the same moment each wrote a list missing the
 * other's entry and one entry silently vanished.
 */
export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => readPersistedHistory() ?? []);

  // In-memory copy used only as the base when storage is unavailable.
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const commit = useCallback((op: HistoryOp) => {
    commitHistoryOp(op, () => entriesRef.current)
      .then(next => {
        if (unmountedRef.current) return;
        entriesRef.current = next;
        setEntries(next);
      })
      .catch(() => {
        // Never let a persistence problem surface as an unhandled rejection.
      });
  }, []);

  // Multi-tab sync: the `storage` event fires in every *other* tab sharing
  // this origin when localStorage actually changes (never in the tab that
  // made the write). Because every writer commits under the lock against the
  // latest persisted list, the persisted list is always complete, so simply
  // mirroring it here can neither drop entries nor resurrect deleted ones.
  // This tab does not write in response, so no event ping-pong is possible.
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key !== HISTORY_STORAGE_KEY && e.key !== null) return;
      const latest = readPersistedHistory();
      if (latest) {
        entriesRef.current = latest;
        setEntries(latest);
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  const addEntry = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => commit({ type: 'add', entry: makeHistoryEntry(entry) }),
    [commit],
  );
  const removeEntry = useCallback((id: string) => commit({ type: 'remove', id }), [commit]);
  const clearAll = useCallback(() => commit({ type: 'clearAll' }), [commit]);
  const clearMode = useCallback((mode: HistoryMode) => commit({ type: 'clearMode', mode }), [commit]);

  return (
    <HistoryContext.Provider value={{ entries, addEntry, removeEntry, clearAll, clearMode }}>
      {children}
    </HistoryContext.Provider>
  );
};

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within a HistoryProvider');
  return ctx;
}
