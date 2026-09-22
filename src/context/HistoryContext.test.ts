import { describe, it, expect } from 'vitest';
import { parseStoredHistoryPayload, serializeHistoryPayload, isHistoryEntry } from './HistoryContext';
import { HistoryEntry } from '../types';

const validEntry: HistoryEntry = {
  id: 'abc123',
  timestamp: 1700000000000,
  mode: 'converter',
  operation: 'Decimal to Binary',
  input: '42',
  inputLabel: 'Decimal',
  output: '101010',
  outputLabel: 'Binary',
};

describe('isHistoryEntry — runtime validation of stored data', () => {
  it('accepts a well-formed entry', () => {
    expect(isHistoryEntry(validEntry)).toBe(true);
  });

  it('accepts a well-formed entry with optional fields present', () => {
    expect(isHistoryEntry({ ...validEntry, sourceBase: '16', customRadix: 20 })).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isHistoryEntry(null)).toBe(false);
    expect(isHistoryEntry(undefined)).toBe(false);
    expect(isHistoryEntry('a string')).toBe(false);
    expect(isHistoryEntry(42)).toBe(false);
    expect(isHistoryEntry([])).toBe(false);
  });

  it('rejects an entry missing a required field', () => {
    const { operation, ...withoutOperation } = validEntry;
    void operation;
    expect(isHistoryEntry(withoutOperation)).toBe(false);
  });

  it('rejects an entry with a wrong-typed field', () => {
    expect(isHistoryEntry({ ...validEntry, timestamp: 'not a number' })).toBe(false);
    expect(isHistoryEntry({ ...validEntry, id: 42 })).toBe(false);
  });

  it('rejects an unrecognized mode rather than trusting it blindly', () => {
    expect(isHistoryEntry({ ...validEntry, mode: 'some_future_mode' })).toBe(false);
  });

  it('rejects a malformed optional field even though the field itself is optional', () => {
    expect(isHistoryEntry({ ...validEntry, sourceBase: 'not-a-real-base' })).toBe(false);
    expect(isHistoryEntry({ ...validEntry, customRadix: 'twelve' })).toBe(false);
    expect(isHistoryEntry({ ...validEntry, customRadix: NaN })).toBe(false);
  });

  it('rejects an empty id', () => {
    expect(isHistoryEntry({ ...validEntry, id: '' })).toBe(false);
  });
});

describe('parseStoredHistoryPayload — robustness against corrupt/outdated storage', () => {
  it('returns an empty list for null (nothing stored yet)', () => {
    expect(parseStoredHistoryPayload(null)).toEqual([]);
  });

  it('returns an empty list for an empty string', () => {
    expect(parseStoredHistoryPayload('')).toEqual([]);
  });

  it('returns an empty list for invalid JSON rather than throwing', () => {
    expect(parseStoredHistoryPayload('{not valid json')).toEqual([]);
  });

  it('returns an empty list for well-formed JSON of an unrecognized shape', () => {
    expect(parseStoredHistoryPayload('{"foo":"bar"}')).toEqual([]);
    expect(parseStoredHistoryPayload('42')).toEqual([]);
    expect(parseStoredHistoryPayload('"just a string"')).toEqual([]);
  });

  it('reads the pre-versioning bare-array format for backward compatibility', () => {
    const raw = JSON.stringify([validEntry]);
    expect(parseStoredHistoryPayload(raw)).toEqual([validEntry]);
  });

  it('reads the current versioned wrapper format', () => {
    const raw = serializeHistoryPayload([validEntry]);
    expect(parseStoredHistoryPayload(raw)).toEqual([validEntry]);
  });

  it('discards individually malformed entries without rejecting the whole list', () => {
    const raw = JSON.stringify([validEntry, { garbage: true }, { ...validEntry, id: 'second-valid' }]);
    const result = parseStoredHistoryPayload(raw);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['abc123', 'second-valid']);
  });

  it('round-trips through serializeHistoryPayload exactly', () => {
    const entries = [validEntry, { ...validEntry, id: 'second', mode: 'ascii' as const }];
    expect(parseStoredHistoryPayload(serializeHistoryPayload(entries))).toEqual(entries);
  });

  it('a versioned payload with an empty entries array round-trips to an empty list', () => {
    expect(parseStoredHistoryPayload(serializeHistoryPayload([]))).toEqual([]);
  });
});
