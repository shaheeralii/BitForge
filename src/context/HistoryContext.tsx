import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { HistoryEntry, HistoryMode } from '../types';

const STORAGE_KEY = 'bitforge_conversion_history';
const MAX_ENTRIES = 200;

const VALID_MODES: readonly HistoryMode[] = ['converter', 'bitgrid', 'twos_complement', 'ascii', 'operations'];

interface HistoryContextValue {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  clearMode: (mode: HistoryMode) => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

/**
 * Runtime type guard for a single stored history entry. Guards against
 * malformed or outdated localStorage data (e.g. from a previous schema
 * version) reaching application state and causing a downstream crash when a
 * component reads a field that isn't actually there.
 */
function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.timestamp === 'number' &&
    Number.isFinite(v.timestamp) &&
    typeof v.mode === 'string' &&
    (VALID_MODES as string[]).includes(v.mode) &&
    typeof v.operation === 'string' &&
    typeof v.input === 'string' &&
    typeof v.inputLabel === 'string' &&
    typeof v.output === 'string' &&
    typeof v.outputLabel === 'string'
  );
}

function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Discard malformed entries individually rather than rejecting the
    // whole list, so one bad/outdated entry doesn't wipe out valid history.
    return parsed.filter(isHistoryEntry);
  } catch {
    // Corrupt or inaccessible storage shouldn't take down the app.
    return [];
  }
}

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadFromStorage());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage may be full or unavailable (e.g. private browsing); the
      // in-memory list still works for the rest of the session.
    }
  }, [entries]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setEntries(prev => {
      const next: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      };
      // Skip near-duplicate of the most recent entry (e.g. copying the same
      // value twice in a row) so the list doesn't fill up with repeats.
      const last = prev[0];
      if (last && last.mode === next.mode && last.input === next.input && last.output === next.output) {
        return prev;
      }
      return [next, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearAll = useCallback(() => setEntries([]), []);

  const clearMode = useCallback((mode: HistoryMode) => {
    setEntries(prev => prev.filter(e => e.mode !== mode));
  }, []);

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
