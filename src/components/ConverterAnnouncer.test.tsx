// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ConverterAnnouncer } from './ConverterAnnouncer';
import { ANNOUNCE_DELAY_MS, buildConverterAnnouncement } from '../utils/converterAnnouncement';
import { autoDetectBase, convertNumber, convertTypedInput, isBinaryDecimalAmbiguous } from '../utils/converter';

const convert = (text: string, base: '2' | '8' | '10' | '16' = '10', target: '2' | '8' | '10' | '16' = '2') =>
  convertNumber(text, base, target, 12);

describe('buildConverterAnnouncement', () => {
  it('summarises a valid result in one sentence', () => {
    const m = buildConverterAnnouncement({ conversion: convert('255'), targetBase: '2', customRadix: 12, inputText: '255', ambiguous: false });
    expect(m.result).toBe('Converted result: 255 decimal equals 11111111 binary.');
    expect(m.error).toBe('');
  });

  it('reports the target the person selected', () => {
    const m = buildConverterAnnouncement({ conversion: convert('255', '10', '16'), targetBase: '16', customRadix: 12, inputText: '255', ambiguous: false });
    expect(m.result).toBe('Converted result: 255 decimal equals FF hexadecimal.');
  });

  it('routes errors to the assertive channel and clears the result channel', () => {
    const m = buildConverterAnnouncement({ conversion: convert('12', '2'), targetBase: '10', customRadix: 12, inputText: '12', ambiguous: false });
    expect(m.result).toBe('');
    expect(m.error.length).toBeGreaterThan(0);
  });

  it('says nothing for an empty field', () => {
    const m = buildConverterAnnouncement({ conversion: convert(''), targetBase: '2', customRadix: 12, inputText: '', ambiguous: false });
    expect(m).toEqual({ result: '', error: '' });
  });

  it('mentions the binary/decimal ambiguity when there is one', () => {
    const detect = autoDetectBase('10');
    const m = buildConverterAnnouncement({
      conversion: convert('10', '2', '10'), targetBase: '10', customRadix: 12, inputText: '10',
      ambiguous: isBinaryDecimalAmbiguous(detect),
    });
    expect(m.result).toContain('equals 2 decimal');
    expect(m.result).toContain('also valid as decimal');
  });

  it.each(['.', '-', '0.', '-0.', '+.', '0x'])('announces incomplete %j politely, never as an error', (text) => {
    const base = text === '0x' ? '16' : '10';
    const m = buildConverterAnnouncement({
      conversion: convertTypedInput(text, base, '2', 12), targetBase: '2', customRadix: 12, inputText: text, ambiguous: false,
    });
    expect(m.error).toBe('');
    expect(m.result).toMatch(/^Waiting for digits/);
    expect(m.result).not.toMatch(/invalid|error|characters/i);
  });

  it('still routes a genuine error to the assertive channel', () => {
    const m = buildConverterAnnouncement({
      conversion: convertTypedInput('G.', '10', '2', 12), targetBase: '2', customRadix: 12, inputText: 'G.', ambiguous: false,
    });
    expect(m.result).toBe('');
    expect(m.error).toMatch(/invalid/);
  });

  it('announces the ambiguity for ".1" too', () => {
    const detect = autoDetectBase('.1');
    const m = buildConverterAnnouncement({
      conversion: convertTypedInput('.1', '2', '10', 12), targetBase: '10', customRadix: 12, inputText: '.1',
      ambiguous: isBinaryDecimalAmbiguous(detect),
    });
    expect(m.result).toContain('equals 0.5 decimal');
    expect(m.result).toContain('also valid as decimal');
  });

  it('shortens very long values instead of reading a thousand digits aloud', () => {
    const long = '9'.repeat(1000);
    const m = buildConverterAnnouncement({ conversion: convert(long), targetBase: '10', customRadix: 12, inputText: long, ambiguous: false });
    expect(m.result.length).toBeLessThan(200);
    expect(m.result).toContain('1000 characters');
  });
});

describe('ConverterAnnouncer live regions', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders two small, always-mounted, visually hidden regions with the right roles', () => {
    render(<ConverterAnnouncer conversion={convert('')} targetBase="2" customRadix={12} inputText="" ambiguous={false} />);
    const status = screen.getByTestId('converter-status');
    const alert = screen.getByTestId('converter-alert');
    // (jest-dom is not a dependency of this project, so plain DOM properties are asserted.)
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(status.className).toContain('sr-only');
    expect(alert.className).toContain('sr-only');
  });

  it('does not announce every keystroke: only the value that survives the pause is announced', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ConverterAnnouncer conversion={convert('')} targetBase="2" customRadix={12} inputText="" ambiguous={false} />);
    const status = screen.getByTestId('converter-status');

    for (const partial of ['2', '25', '255']) {
      rerender(<ConverterAnnouncer conversion={convert(partial)} targetBase="2" customRadix={12} inputText={partial} ambiguous={false} />);
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS - 100); }); // typing faster than the pause
      expect(status.textContent).toBe('');
    }
    act(() => { vi.advanceTimersByTime(200); });
    expect(status.textContent).toBe('Converted result: 255 decimal equals 11111111 binary.');
  });

  it('announces an invalid digit through the alert region after the pause, and clears it once corrected', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ConverterAnnouncer conversion={convert('102', '2')} targetBase="10" customRadix={12} inputText="102" ambiguous={false} />);
    const alert = screen.getByTestId('converter-alert');
    const status = screen.getByTestId('converter-status');
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS + 50); });
    expect(alert.textContent).toMatch(/invalid|digit|character/i);
    expect(status.textContent).toBe('');

    rerender(<ConverterAnnouncer conversion={convert('101', '2', '10')} targetBase="10" customRadix={12} inputText="101" ambiguous={false} />);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS + 50); });
    expect(alert.textContent).toBe('');
    expect(status.textContent).toBe('Converted result: 101 binary equals 5 decimal.');
  });
});
