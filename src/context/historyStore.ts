import { BaseType, HistoryEntry, HistoryMode } from '../types';

/**
 * Persistence + concurrency logic for Activity History, kept free of React so
 * it can be tested with fake storage and a fake lock manager.
 *
 * THE DESIGN, in one paragraph: localStorage is the source of truth and React
 * state is only a mirror of it. Every mutation (add / remove / clear /
 * clearMode) is an *operation* applied to the latest persisted list inside a
 * cross-tab lock (Web Locks API): lock -> read latest -> apply op -> write ->
 * unlock. Because no tab ever writes back a whole list computed from a stale
 * in-memory copy, concurrent additions cannot overwrite each other, and a
 * delete/clear cannot be undone by another tab's stale snapshot (there are no
 * stale snapshots to resurrect data from). No tombstones or merge heuristics
 * are needed — the ordering the lock imposes IS the merge.
 */

export const HISTORY_STORAGE_KEY = 'bitforge_conversion_history';
export const MAX_HISTORY_ENTRIES = 200;
const LOCK_NAME = 'bitforge_conversion_history_write';

/**
 * Bumped whenever the stored shape changes in a way a future load needs to
 * know about. There are no migrations yet — `parseStoredHistoryPayload` has
 * one clearly-marked spot to add a branch on `version` when that day comes.
 */
const STORAGE_VERSION = 1;

const VALID_MODES: readonly HistoryMode[] = ['converter', 'bitgrid', 'twos_complement', 'bit_representation', 'ascii', 'operations', 'floating_point'];
const VALID_BASES: readonly BaseType[] = ['10', '2', '8', '16', 'custom'];

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
 * dependency on `localStorage` itself. Reads both the versioned wrapper and
 * the pre-versioning bare array indefinitely.
 */
export function parseStoredHistoryPayload(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);

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

/**
 * Canonical list form: unique by id (first occurrence wins), newest first by
 * timestamp (stable, so equal timestamps keep their relative order), capped
 * at MAX_HISTORY_ENTRIES. Applied to every list that is about to be stored,
 * which is also what repairs any hand-edited or legacy payload.
 */
export function normalizeHistory(entries: readonly HistoryEntry[]): HistoryEntry[] {
  const seen = new Set<string>();
  const unique: HistoryEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    unique.push(entry);
  }
  // Array.prototype.sort is stable (ES2019+).
  unique.sort((a, b) => b.timestamp - a.timestamp);
  return unique.slice(0, MAX_HISTORY_ENTRIES);
}

export type HistoryOp =
  | { type: 'add'; entry: HistoryEntry }
  | { type: 'remove'; id: string }
  | { type: 'clearAll' }
  | { type: 'clearMode'; mode: HistoryMode };

/**
 * Applies one operation to a list. Pure. Deletes and clears act on whatever
 * list they're handed — inside `commitHistoryOp` that is always the latest
 * persisted list, so they can only ever remove what currently exists and can
 * never be "undone" by another tab's older copy.
 */
export function applyHistoryOp(current: readonly HistoryEntry[], op: HistoryOp): HistoryEntry[] {
  switch (op.type) {
    case 'add': {
      // Skip a near-duplicate of the most recent entry (e.g. copying the same
      // value twice in a row) so the list doesn't fill up with repeats. This
      // is evaluated against the freshest persisted list, so it also holds
      // across tabs. (Also covers a same-id replay of the same operation.)
      const last = current[0];
      if (
        last &&
        (last.id === op.entry.id ||
          (last.mode === op.entry.mode && last.input === op.entry.input && last.output === op.entry.output))
      ) {
        return normalizeHistory(current);
      }
      return normalizeHistory([op.entry, ...current]);
    }
    case 'remove':
      return normalizeHistory(current.filter(e => e.id !== op.id));
    case 'clearAll':
      return [];
    case 'clearMode':
      return normalizeHistory(current.filter(e => e.mode !== op.mode));
  }
}

export function makeHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>, now: number = Date.now()): HistoryEntry {
  return {
    ...entry,
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: now,
  };
}

// ---------------------------------------------------------------------------
// Storage + locking
// ---------------------------------------------------------------------------

export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
}

export interface HistoryDeps {
  /** Defaults to window.localStorage. May throw/be unavailable (private mode). */
  storage?: HistoryStorage;
  /** Defaults to navigator.locks when available. */
  locks?: LockManagerLike | null;
}

function defaultStorage(): HistoryStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function defaultLocks(): LockManagerLike | null {
  try {
    return typeof navigator !== 'undefined' && navigator.locks ? (navigator.locks as unknown as LockManagerLike) : null;
  } catch {
    return null;
  }
}

/** Reads the persisted list. Returns null when storage itself is unavailable. */
export function readPersistedHistory(storage: HistoryStorage | null = defaultStorage()): HistoryEntry[] | null {
  if (!storage) return null;
  try {
    return parseStoredHistoryPayload(storage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return null;
  }
}

// Same-tab fallback queue, used when the Web Locks API is missing (older
// browsers, insecure contexts) or refuses the request. It keeps this tab's
// own operations strictly ordered; without Web Locks, *cross*-tab safety
// degrades to "each operation is one synchronous read-modify-write", which
// is a far narrower window than the previous whole-list-from-stale-state
// save, but not a guarantee.
let localQueue: Promise<unknown> = Promise.resolve();
function runInLocalQueue<T>(fn: () => T): Promise<T> {
  const run = localQueue.then(fn, fn);
  localQueue = run.catch(() => undefined);
  return run;
}

async function withHistoryLock<T>(locks: LockManagerLike | null, fn: () => T): Promise<T> {
  if (locks) {
    let started = false;
    try {
      return await locks.request(LOCK_NAME, () => {
        started = true;
        return fn();
      });
    } catch (e) {
      // If `fn` itself ran and threw, that's its error — never run it twice.
      // Otherwise the lock could not be *acquired* (e.g. SecurityError in a
      // sandboxed frame); don't lose the write, fall back to the local queue.
      if (started) throw e;
    }
  }
  return runInLocalQueue(fn);
}

/**
 * Applies `op` to the latest persisted history under the cross-tab lock,
 * persists the result and resolves with it.
 *
 * `fallbackBase` is the in-memory list to operate on if storage is
 * unavailable (private browsing etc.), so history still works for the
 * session, in memory only.
 */
export async function commitHistoryOp(
  op: HistoryOp,
  fallbackBase: () => HistoryEntry[],
  deps: HistoryDeps = {},
): Promise<HistoryEntry[]> {
  const storage = deps.storage ?? defaultStorage();
  const locks = deps.locks === undefined ? defaultLocks() : deps.locks;

  const run = (): HistoryEntry[] => {
    const base = readPersistedHistory(storage) ?? fallbackBase();
    const next = applyHistoryOp(base, op);
    try {
      storage?.setItem(HISTORY_STORAGE_KEY, serializeHistoryPayload(next));
    } catch {
      // Storage full/unavailable: the in-memory result still applies for the
      // rest of the session.
    }
    return next;
  };

  return withHistoryLock(locks, run);
}
