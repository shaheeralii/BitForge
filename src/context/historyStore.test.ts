import { describe, it, expect } from 'vitest';
import {
  HISTORY_STORAGE_KEY,
  HistoryDeps,
  HistoryOp,
  LockManagerLike,
  MAX_HISTORY_ENTRIES,
  applyHistoryOp,
  commitHistoryOp,
  normalizeHistory,
  parseStoredHistoryPayload,
  readPersistedHistory,
  serializeHistoryPayload,
} from './historyStore';
import { HistoryEntry, HistoryMode } from '../types';

// ---- fakes -----------------------------------------------------------------

class FakeStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

/**
 * A cross-"tab" lock manager: strict FIFO, and it yields to the event loop
 * between acquiring the lock and running the callback — the same kind of gap
 * in which the old design's independent read-modify-write cycles interleaved.
 */
class FakeLocks implements LockManagerLike {
  private tail: Promise<unknown> = Promise.resolve();
  acquisitions = 0;
  request<T>(_name: string, cb: () => Promise<T> | T): Promise<T> {
    const run = this.tail.then(async () => {
      this.acquisitions++;
      await new Promise(r => setTimeout(r, 0));
      return cb();
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}

/** One browser tab: its own in-memory mirror, but the SAME storage + lock manager as every other tab. */
function makeTab(storage: FakeStorage, locks: LockManagerLike | null) {
  let mirror: HistoryEntry[] = [];
  const deps: HistoryDeps = { storage, locks };
  return {
    async run(op: HistoryOp) {
      mirror = await commitHistoryOp(op, () => mirror, deps);
      return mirror;
    },
    get mirror() { return mirror; },
    read: () => readPersistedHistory(storage)!,
  };
}

let seq = 0;
const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => {
  seq++;
  return {
    id: `e${seq}`,
    timestamp: 1_000_000 + seq,
    mode: 'converter',
    operation: 'Decimal to Binary',
    input: `in${seq}`,
    inputLabel: 'Decimal',
    output: `out${seq}`,
    outputLabel: 'Binary',
    ...over,
  };
};
const add = (e: HistoryEntry): HistoryOp => ({ type: 'add', entry: e });
const ids = (list: HistoryEntry[]) => list.map(e => e.id);

// ---- pure reducer ----------------------------------------------------------

describe('normalizeHistory', () => {
  it('dedupes by id (first wins), sorts newest first, caps at 200', () => {
    const a = entry({ id: 'a', timestamp: 10 });
    const b = entry({ id: 'b', timestamp: 30 });
    const aDupe = entry({ id: 'a', timestamp: 99, input: 'different' });
    const out = normalizeHistory([a, b, aDupe]);
    expect(ids(out)).toEqual(['b', 'a']);
    expect(out[1].input).toBe(a.input);
  });
  it('is a stable sort for equal timestamps', () => {
    const x = entry({ id: 'x', timestamp: 5 });
    const y = entry({ id: 'y', timestamp: 5 });
    expect(ids(normalizeHistory([x, y]))).toEqual(['x', 'y']);
  });
  it('keeps the 200 NEWEST entries', () => {
    const many = Array.from({ length: 250 }, (_, i) => entry({ id: `n${i}`, timestamp: i }));
    const out = normalizeHistory(many);
    expect(out).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(out[0].id).toBe('n249');
    expect(out[199].id).toBe('n50');
  });
});

describe('applyHistoryOp', () => {
  it('add: newest first, and suppresses an immediate duplicate of the latest entry', () => {
    const first = entry({ mode: 'ascii', input: 'A', output: '65' });
    const dupe = entry({ mode: 'ascii', input: 'A', output: '65' });
    const other = entry({ mode: 'ascii', input: 'B', output: '66' });
    let list = applyHistoryOp([], add(first));
    list = applyHistoryOp(list, add(dupe));
    expect(list).toHaveLength(1);
    list = applyHistoryOp(list, add(other));
    list = applyHistoryOp(list, add(entry({ mode: 'ascii', input: 'A', output: '65' }))); // not consecutive any more
    expect(list).toHaveLength(3);
  });
  it('add: out-of-order timestamps still end up newest-first', () => {
    const newer = entry({ timestamp: 500 });
    const older = entry({ timestamp: 100 });
    const list = applyHistoryOp(applyHistoryOp([], add(newer)), add(older));
    expect(ids(list)).toEqual([newer.id, older.id]);
  });
  it('remove / clearMode / clearAll', () => {
    const a = entry({ mode: 'ascii' });
    const b = entry({ mode: 'converter' });
    const c = entry({ mode: 'ascii' });
    const start = normalizeHistory([a, b, c]);
    expect(ids(applyHistoryOp(start, { type: 'remove', id: b.id }))).toEqual(ids(start).filter(i => i !== b.id));
    expect(applyHistoryOp(start, { type: 'clearMode', mode: 'ascii' as HistoryMode }).map(e => e.mode)).toEqual(['converter']);
    expect(applyHistoryOp(start, { type: 'clearAll' })).toEqual([]);
  });
});

// ---- concurrency: the Copilot finding --------------------------------------

describe('CONTROL: why the previous design lost entries', () => {
  it('two tabs that each save a whole list computed from their own stale copy overwrite one another', () => {
    // The old HistoryProvider: state = [entry, ...state]; an effect then saved
    // the ENTIRE list. Both tabs start from the same snapshot and neither
    // has seen the other's entry when it writes.
    const storage = new FakeStorage();
    const base = [entry()];
    storage.setItem(HISTORY_STORAGE_KEY, serializeHistoryPayload(base));
    const tabA = [entry(), ...parseStoredHistoryPayload(storage.getItem(HISTORY_STORAGE_KEY))];
    const tabB = [entry(), ...parseStoredHistoryPayload(storage.getItem(HISTORY_STORAGE_KEY))];
    storage.setItem(HISTORY_STORAGE_KEY, serializeHistoryPayload(tabA));
    storage.setItem(HISTORY_STORAGE_KEY, serializeHistoryPayload(tabB)); // last writer wins
    expect(parseStoredHistoryPayload(storage.getItem(HISTORY_STORAGE_KEY))).toHaveLength(2); // A's entry is gone (3 expected)
  });
});


describe('concurrent additions from multiple tabs are never lost (Copilot finding)', () => {
  it('two tabs adding at the same moment: both entries survive', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    const ea = entry(); const eb = entry();
    await Promise.all([A.run(add(ea)), B.run(add(eb))]);
    expect(new Set(ids(A.read()))).toEqual(new Set([ea.id, eb.id]));
    // and each tab's mirror converges on the complete list (the later commit saw both)
    expect(A.read()).toHaveLength(2);
  });

  it('50 additions split across two tabs, fully interleaved: all 50 present, unique, newest-first', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    const all: HistoryEntry[] = [];
    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 25; i++) {
      const ea = entry(); const eb = entry();
      all.push(ea, eb);
      ops.push(A.run(add(ea)), B.run(add(eb)));
    }
    await Promise.all(ops);
    const stored = A.read();
    expect(stored).toHaveLength(50);
    expect(new Set(ids(stored))).toEqual(new Set(ids(all)));
    for (let i = 1; i < stored.length; i++) expect(stored[i - 1].timestamp).toBeGreaterThanOrEqual(stored[i].timestamp);
  });

  it('the 200-entry cap holds under concurrency and keeps the newest', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    const all: HistoryEntry[] = [];
    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 130; i++) {
      const ea = entry(); const eb = entry();
      all.push(ea, eb);
      ops.push(A.run(add(ea)), B.run(add(eb)));
    }
    await Promise.all(ops);
    const stored = A.read();
    expect(stored).toHaveLength(MAX_HISTORY_ENTRIES);
    const newest200 = [...all].sort((x, y) => y.timestamp - x.timestamp).slice(0, 200);
    expect(new Set(ids(stored))).toEqual(new Set(ids(newest200)));
  });

  it("duplicate suppression is evaluated against the freshest list, so it holds across tabs", async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    await A.run(add(entry({ mode: 'ascii', input: 'Z', output: '90' })));
    await B.run(add(entry({ mode: 'ascii', input: 'Z', output: '90' })));
    expect(A.read()).toHaveLength(1);
  });

  it('a tab that has not yet received the other tab\'s storage event still commits on top of it', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    const eb = entry();
    await B.run(add(eb));         // A's mirror is still empty (no storage event delivered)
    expect(A.mirror).toEqual([]);
    const ea = entry();
    const result = await A.run(add(ea));
    expect(new Set(ids(result))).toEqual(new Set([ea.id, eb.id])); // nothing overwritten
  });
});

describe('destructive operations are deterministic and never resurrect data', () => {
  it('remove in one tab + add in another: the removed entry stays gone, the added one stays', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    const keep = entry(); const doomed = entry();
    await A.run(add(keep)); await A.run(add(doomed));
    const fresh = entry();
    await Promise.all([A.run({ type: 'remove', id: doomed.id }), B.run(add(fresh))]);
    expect(new Set(ids(A.read()))).toEqual(new Set([keep.id, fresh.id]));
    // A later write from the tab that "never saw" the deletion cannot bring it back
    await B.run(add(entry()));
    expect(ids(B.read())).not.toContain(doomed.id);
  });

  it('clearAll then add (in lock order): only the add survives', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    await A.run(add(entry())); await A.run(add(entry()));
    const late = entry();
    await Promise.all([A.run({ type: 'clearAll' }), B.run(add(late))]);
    expect(ids(A.read())).toEqual([late.id]);
  });

  it('add then clearAll (in lock order): empty — the clear is not silently undone', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    await Promise.all([B.run(add(entry())), A.run({ type: 'clearAll' })]);
    expect(A.read()).toEqual([]);
  });

  it('clearAll in one tab is not undone when the OTHER tab (with a stale mirror) later adds', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    for (let i = 0; i < 3; i++) await A.run(add(entry()));
    // B never got A's storage events, so its mirror is stale/empty; A clears
    await A.run({ type: 'clearAll' });
    const after = entry();
    await B.run(add(after));
    expect(ids(B.read())).toEqual([after.id]);
  });

  it('clearMode only removes that mode, concurrent adds of other modes survive', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks); const B = makeTab(storage, locks);
    await A.run(add(entry({ mode: 'ascii' }))); await A.run(add(entry({ mode: 'converter' })));
    const conc = entry({ mode: 'operations' });
    await Promise.all([A.run({ type: 'clearMode', mode: 'ascii' }), B.run(add(conc))]);
    expect(new Set(A.read().map(e => e.mode))).toEqual(new Set(['converter', 'operations']));
  });

  it('removing an id that no longer exists is a harmless no-op', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks);
    const e1 = entry();
    await A.run(add(e1));
    await A.run({ type: 'remove', id: 'ghost' });
    expect(ids(A.read())).toEqual([e1.id]);
  });
});

// ---- compatibility / robustness ---------------------------------------------

describe('backward compatibility and robustness', () => {
  it('reads a legacy bare-array payload and upgrades it to the versioned wrapper on the next write, keeping every entry', async () => {
    const storage = new FakeStorage();
    const legacy = [entry({ timestamp: 10 }), entry({ timestamp: 20 })];
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(legacy));
    const A = makeTab(storage, new FakeLocks());
    const fresh = entry({ timestamp: 30 });
    await A.run(add(fresh));
    const raw = JSON.parse(storage.getItem(HISTORY_STORAGE_KEY)!);
    expect(raw.version).toBe(1);
    expect(raw.entries.map((e: HistoryEntry) => e.id)).toEqual([fresh.id, legacy[1].id, legacy[0].id]);
  });

  it('the stored payload keeps the existing versioned wrapper format', async () => {
    const storage = new FakeStorage();
    const A = makeTab(storage, new FakeLocks());
    const e = entry();
    await A.run(add(e));
    expect(parseStoredHistoryPayload(storage.getItem(HISTORY_STORAGE_KEY))).toEqual([e]);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBe(serializeHistoryPayload([e]));
  });

  it('corrupt stored JSON is treated as empty (no crash) and the next add recovers it', async () => {
    const storage = new FakeStorage();
    storage.setItem(HISTORY_STORAGE_KEY, '{not json');
    const A = makeTab(storage, new FakeLocks());
    const e = entry();
    await A.run(add(e));
    expect(ids(A.read())).toEqual([e.id]);
  });

  it('invalid entries inside stored data are dropped, valid ones kept', async () => {
    const storage = new FakeStorage();
    const good = entry();
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: [good, { junk: true }, 42] }));
    const A = makeTab(storage, new FakeLocks());
    await A.run(add(entry()));
    expect(A.read()).toHaveLength(2);
    expect(ids(A.read())).toContain(good.id);
  });

  it('storage that throws on write: the operation still resolves with the in-memory result', async () => {
    const storage = new FakeStorage();
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const A = makeTab(storage, new FakeLocks());
    const e = entry();
    const out = await A.run(add(e));
    expect(ids(out)).toEqual([e.id]);
  });

  it('storage that is entirely unavailable: falls back to the in-memory list', async () => {
    const dead = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    let mirror: HistoryEntry[] = [];
    const run = async (op: HistoryOp) => (mirror = await commitHistoryOp(op, () => mirror, { storage: dead, locks: null }));
    const a = entry(); const b = entry();
    await run(add(a)); await run(add(b));
    expect(new Set(ids(mirror))).toEqual(new Set([a.id, b.id]));
    await run({ type: 'remove', id: a.id });
    expect(ids(mirror)).toEqual([b.id]);
  });
});

describe('lock fallback behaviour', () => {
  it('without the Web Locks API, same-tab operations still apply strictly in order', async () => {
    const storage = new FakeStorage();
    const A = makeTab(storage, null);
    const es = Array.from({ length: 20 }, () => entry());
    await Promise.all(es.map(e => A.run(add(e))));
    expect(new Set(ids(A.read()))).toEqual(new Set(ids(es)));
  });

  it('uses the lock manager when present (every operation acquires it)', async () => {
    const storage = new FakeStorage(); const locks = new FakeLocks();
    const A = makeTab(storage, locks);
    await A.run(add(entry())); await A.run(add(entry()));
    expect(locks.acquisitions).toBe(2);
  });

  it('if the lock cannot be acquired (request rejects before running), the write is applied once via the fallback', async () => {
    const storage = new FakeStorage();
    const refusing: LockManagerLike = { request: () => Promise.reject(new DOMException('nope', 'SecurityError')) };
    const A = makeTab(storage, refusing);
    const e = entry();
    await A.run(add(e));
    expect(ids(A.read())).toEqual([e.id]);
  });

  it('an error thrown by the operation itself is not retried (no double execution)', async () => {
    let runs = 0;
    const locks: LockManagerLike = { request: async (_n, cb) => cb() };
    const storage = { getItem: () => { runs++; throw new Error('never reached: read is guarded'); }, setItem() {} };
    // getItem failures are handled inside the op (storage unavailable), so the op runs exactly once.
    await commitHistoryOp(add(entry()), () => [], { storage, locks });
    expect(runs).toBe(1);
  });
});
