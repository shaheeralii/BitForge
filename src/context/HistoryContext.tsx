import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BaseType, HistoryEntry, HistoryMode } from '../types';

const STORAGE_KEY = 'bitforge_conversion_history';
const MAX_ENTRIES = 200;

/**
 * Bumped whenever the stored shape changes in a way a future load needs to
 * know about. There are no migrations yet — `loadFromStorage` has one
 * clearly-marked spot to add a branch on `version` when that day comes,
 * rather than a new field silently reinterpreting old data or an old field
 * silently vanishing.
 */
const STORAGE_VERSION = 1;

const VALID_MODES: readonly HistoryMode[] = ['converter', 'bitgrid', 'twos_complement', 'bit_representation', 'ascii', 'operations', 'floating_point'];
const VALID_BASES: readonly BaseType[] = ['10', '2', '8', '16', 'custom'];

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
export function isHistoryEntry(value: unknown): value is HistoryEntry {
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
    typeof v.outputLabel === 'string' &&
    // Both are optional (older stored entries won't have them), but if
    // present they must be well-formed rather than blindly trusted.
    (v.sourceBase === undefined || (VALID_BASES as string[]).includes(v.sourceBase as string)) &&
    (v.customRadix === undefined || (typeof v.customRadix === 'number' && Number.isFinite(v.customRadix)))
  );
}

/**
 * Pure parsing of the raw stored string into a validated entry list — no
 * dependency on `localStorage` itself, so this is what's actually under
 * test in history-persistence.test.ts rather than something that needs a
 * browser-global mock to exercise at all.
 */
export function parseStoredHistoryPayload(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);

    // Pre-versioning storage was a bare array. Kept readable indefinitely —
    // shipping the version wrapper is no reason to discard an existing
    // user's history the first time they load the updated app.
    if (Array.isArray(parsed)) {
      return parsed.filter(isHistoryEntry);
    }

    if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { entries?: unknown }).entries)) {
      const { entries } = parsed as { version?: unknown; entries: unknown[] };
      // No migrations exist between versions yet; when one is needed,
      // branch on `version` here instead of guessing at an unfamiliar shape.
      return entries.filter(isHistoryEntry);
    }

    return [];
  } catch {
    // Corrupt JSON shouldn't take down the app.
    return [];
  }
}

/** The inverse of `parseStoredHistoryPayload` — also pure, also directly tested. */
export function serializeHistoryPayload(entries: HistoryEntry[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, entries });
}

function loadFromStorage(): HistoryEntry[] {
  try {
    return parseStoredHistoryPayload(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage inaccessible entirely (e.g. disabled in this browser context).
    return [];
  }
}

function saveToStorage(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, serializeHistoryPayload(entries));
}

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadFromStorage());

  useEffect(() => {
    try {
      saveToStorage(entries);
    } catch {
      // Storage may be full or unavailable (e.g. private browsing); the
      // in-memory list still works for the rest of the session.
    }
  }, [entries]);

  // Multi-tab sync: the `storage` event fires in every *other* tab sharing
  // this origin when localStorage actually changes (never in the tab that
  // made the write, and never for a write of an unchanged value — both by
  // spec — which is what keeps this from looping with the save effect
  // above: a tab that re-saves the exact data it just received here writes
  // an identical string, so no further event fires from that write). Without
  // this, adding an entry in one tab would leave every other open tab
  // showing a stale list until it was manually refreshed.
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setEntries(loadFromStorage());
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

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
