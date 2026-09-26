// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { HistoryProvider, useHistory } from './HistoryContext';
import { HISTORY_STORAGE_KEY, parseStoredHistoryPayload, serializeHistoryPayload } from './historyStore';
import { HistoryEntry } from '../types';
import { installDomIsolation, flush } from '../test/setup';

installDomIsolation();

type Api = ReturnType<typeof useHistory>;

/** Mounts one "tab": its own provider tree + a handle to its context API. */
function mountTab() {
  const box: { api: Api | null } = { api: null };
  const Probe: React.FC = () => { box.api = useHistory(); return <ul>{box.api.entries.map(e => <li key={e.id} data-mode={e.mode}>{e.input}</li>)}</ul>; };
  const utils = render(<HistoryProvider><Probe /></HistoryProvider>);
  return { get api() { return box.api!; }, ...utils };
}

// jsdom never fires `storage` for same-window writes; deliver it the way a
// browser does for OTHER tabs.
const notifyOtherTabs = () => act(async () => {
  window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_STORAGE_KEY, storageArea: window.localStorage }));
  await flush(0);
});
const settle = () => act(async () => { await flush(30); });
const stored = () => parseStoredHistoryPayload(localStorage.getItem(HISTORY_STORAGE_KEY));
const rec = (input: string, mode: HistoryEntry['mode'] = 'converter') =>
  ({ mode, operation: 'op', input, inputLabel: 'in', output: `out-${input}`, outputLabel: 'out' });
const inputs = (list: HistoryEntry[]) => list.map(e => e.input);

describe('HistoryProvider — persistence mirror', () => {
  it('addEntry appears in state and is persisted in the versioned wrapper format', async () => {
    const tab = mountTab();
    act(() => tab.api.addEntry(rec('one')));
    await settle();
    expect(inputs(tab.api.entries)).toEqual(['one']);
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!).version).toBe(1);
    expect(inputs(stored())).toEqual(['one']);
  });

  it('loads existing (legacy bare-array) history on mount', () => {
    const legacy: HistoryEntry = { id: 'l1', timestamp: 1, mode: 'ascii', operation: 'op', input: 'legacy', inputLabel: 'i', output: 'o', outputLabel: 'o' };
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([legacy]));
    const tab = mountTab();
    expect(inputs(tab.api.entries)).toEqual(['legacy']);
  });

  it('invalid stored data does not crash the provider', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '<<<garbage>>>');
    expect(() => mountTab()).not.toThrow();
  });

  it('removeEntry, clearMode and clearAll update state and storage', async () => {
    const tab = mountTab();
    act(() => { tab.api.addEntry(rec('a', 'ascii')); tab.api.addEntry(rec('b', 'converter')); tab.api.addEntry(rec('c', 'ascii')); });
    await settle();
    expect(tab.api.entries).toHaveLength(3);
    const bId = tab.api.entries.find(e => e.input === 'b')!.id;
    act(() => tab.api.removeEntry(bId)); await settle();
    expect(inputs(tab.api.entries).sort()).toEqual(['a', 'c']);
    act(() => tab.api.clearMode('ascii')); await settle();
    expect(tab.api.entries).toEqual([]);
    act(() => tab.api.addEntry(rec('d'))); await settle();
    act(() => tab.api.clearAll()); await settle();
    expect(stored()).toEqual([]);
    expect(tab.api.entries).toEqual([]);
  });

  it('newest entry first', async () => {
    const tab = mountTab();
    act(() => tab.api.addEntry(rec('first'))); await settle();
    await act(async () => { await flush(5); });
    act(() => tab.api.addEntry(rec('second'))); await settle();
    expect(inputs(tab.api.entries)).toEqual(['second', 'first']);
  });
});

describe('HistoryProvider — two tabs in the same origin (Copilot finding)', () => {
  it('near-simultaneous additions in both tabs: neither entry is lost, and both tabs converge', async () => {
    const A = mountTab(); const B = mountTab();
    // Both tabs act in the same tick, before either has seen the other's storage event.
    act(() => { A.api.addEntry(rec('from-A')); B.api.addEntry(rec('from-B')); });
    await settle();
    await notifyOtherTabs();
    await settle();
    expect(new Set(inputs(stored()))).toEqual(new Set(['from-A', 'from-B']));
    expect(new Set(inputs(A.api.entries))).toEqual(new Set(['from-A', 'from-B']));
    expect(new Set(inputs(B.api.entries))).toEqual(new Set(['from-A', 'from-B']));
  });

  it('a delete in Tab A is not resurrected by Tab B\'s later write', async () => {
    const A = mountTab(); const B = mountTab();
    act(() => A.api.addEntry(rec('x'))); await settle(); await notifyOtherTabs();
    expect(inputs(B.api.entries)).toEqual(['x']);
    const id = A.api.entries[0].id;

    act(() => A.api.removeEntry(id)); await settle(); await notifyOtherTabs();
    expect(B.api.entries).toEqual([]);

    act(() => B.api.addEntry(rec('y'))); await settle(); await notifyOtherTabs();
    expect(inputs(stored())).toEqual(['y']);
    expect(inputs(A.api.entries)).toEqual(['y']);
  });

  it('clearAll in Tab A followed by an add in Tab B (which had not yet received the clear) leaves only the new entry', async () => {
    const A = mountTab(); const B = mountTab();
    act(() => { A.api.addEntry(rec('old1')); A.api.addEntry(rec('old2')); }); await settle();
    // Tab B intentionally does NOT get the storage event yet.
    act(() => A.api.clearAll()); await settle();
    act(() => B.api.addEntry(rec('new'))); await settle();
    await notifyOtherTabs(); await settle();
    expect(inputs(stored())).toEqual(['new']);
    expect(inputs(A.api.entries)).toEqual(['new']);
    expect(inputs(B.api.entries)).toEqual(['new']);
  });

  it('a storage event mirrors the persisted list without writing back (no event ping-pong)', async () => {
    const tab = mountTab();
    const e: HistoryEntry = { id: 'ext1', timestamp: 5, mode: 'converter', operation: 'o', input: 'external', inputLabel: 'i', output: 'o', outputLabel: 'o' };
    localStorage.setItem(HISTORY_STORAGE_KEY, serializeHistoryPayload([e]));
    const original = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (...args: [string, string]) { writes++; return original.apply(this, args); };
    try {
      await notifyOtherTabs(); await settle();
    } finally { Storage.prototype.setItem = original; }
    expect(inputs(tab.api.entries)).toEqual(['external']);
    expect(writes).toBe(0);
  });

  it('a storage event with invalid stored data does not crash and shows an empty list', async () => {
    const tab = mountTab();
    localStorage.setItem(HISTORY_STORAGE_KEY, '{oops');
    await notifyOtherTabs();
    expect(tab.api.entries).toEqual([]);
  });

  it('unrelated storage keys are ignored', async () => {
    const tab = mountTab();
    act(() => tab.api.addEntry(rec('keep'))); await settle();
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'something_else', storageArea: window.localStorage })); });
    expect(inputs(tab.api.entries)).toEqual(['keep']);
  });
});
