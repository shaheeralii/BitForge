// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ConversionInput } from './ConversionInput';
import { ShortcutTargetProvider } from '../context/ShortcutTargetContext';
import { autoDetectBase, MAX_CONVERTER_INPUT_LENGTH } from '../utils/converter';
import { BaseType } from '../types';

function setup(overrides: Partial<React.ComponentProps<typeof ConversionInput>> = {}) {
  const props: React.ComponentProps<typeof ConversionInput> = {
    inputVal: '10',
    onInputChange: vi.fn(),
    sourceBase: '2' as BaseType,
    onSourceBaseChange: vi.fn(),
    autoDetect: autoDetectBase(overrides.inputVal ?? '10'),
    isLocked: false,
    onToggleLock: vi.fn(),
    customRadix: 12,
    onCustomRadixChange: vi.fn(),
    ...overrides,
  };
  render(
    <ShortcutTargetProvider>
      <ConversionInput {...props} />
    </ShortcutTargetProvider>
  );
  return props;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ConversionInput — binary/decimal ambiguity notice', () => {
  it.each(['10', '100', '101', '1111', '0010', '10.0', '0.1', '.1', '-.1', '+.1', '-0.1'])('shows "Read as Binary · Also valid as Decimal" for %s', (text) => {
    setup({ inputVal: text, autoDetect: autoDetectBase(text) });
    const notice = screen.getByTestId('ambiguity-notice');
    expect(notice.textContent).toMatch(/Read as\s*Binary/);
    expect(notice.textContent).toMatch(/Also valid as\s*Decimal/);
    expect(screen.getByRole('button', { name: 'Use Decimal' })).toBeTruthy();
  });

  it.each(['255', '999', 'FF', 'dead', '0x10', '0b10', '0b.1', '-0b10', '1', '0', '.0', '00', '000', '0000', '01', '000001', '0.0', '1.0', '00.0'])('shows no notice when both readings are the same value (or the input is unambiguous): %s', (text) => {
    setup({ inputVal: text, autoDetect: autoDetectBase(text) });
    expect(screen.queryByTestId('ambiguity-notice')).toBeNull();
  });

  it('the one-tap "Use Decimal" button switches the source base to Decimal', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Use Decimal' }));
    expect(props.onSourceBaseChange).toHaveBeenCalledTimes(1);
    expect(props.onSourceBaseChange).toHaveBeenCalledWith('10');
  });

  it('the notice disappears once a base is locked (the person has decided)', () => {
    setup({ isLocked: true });
    expect(screen.queryByTestId('ambiguity-notice')).toBeNull();
  });

  it.each(['10', '.1', '-.1', '+.1', '0.1'])('an explicitly locked Binary base shows no notice for %s', (text) => {
    setup({ inputVal: text, autoDetect: autoDetectBase(text), isLocked: true, sourceBase: '2' as BaseType });
    expect(screen.queryByTestId('ambiguity-notice')).toBeNull();
  });

  it('".1" offers the one-tap Decimal switch and the notice names both readings', () => {
    const props = setup({ inputVal: '.1', autoDetect: autoDetectBase('.1') });
    expect(screen.getByTestId('ambiguity-notice').textContent).toMatch(/Read as\s*Binary.*Also valid as\s*Decimal/);
    fireEvent.click(screen.getByRole('button', { name: 'Use Decimal' }));
    expect(props.onSourceBaseChange).toHaveBeenCalledWith('10');
  });

  it('is a real, keyboard-focusable <button> with a visible-size hit area and a described-by link from the input', () => {
    setup();
    const btn = screen.getByRole('button', { name: 'Use Decimal' }) as HTMLButtonElement;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.type).toBe('button');
    expect(btn.tabIndex).toBeGreaterThanOrEqual(0);
    expect(btn.className).toContain('min-h-9'); // 36px; mobile-friendly tap target
    const input = screen.getByRole('textbox', { name: /.*/ , hidden: false }) as HTMLInputElement;
    expect((input.getAttribute('aria-describedby') ?? '').split(' ')).toContain('bitforge-main-ambiguity');
  });
});

describe('ConversionInput — 1,024-character limit', () => {
  const mainInput = () => document.querySelector('input[type="text"]') as HTMLInputElement;

  it('passes ordinary text through untouched and shows no notice', () => {
    const props = setup({ inputVal: '', autoDetect: autoDetectBase('') });
    fireEvent.change(mainInput(), { target: { value: '255' } });
    expect(props.onInputChange).toHaveBeenCalledWith('255');
    expect(screen.queryByText(/limit for this tool/)).toBeNull();
  });

  it('accepts exactly 1,024 characters without a notice', () => {
    const props = setup({ inputVal: '', autoDetect: autoDetectBase('') });
    const exact = '7'.repeat(MAX_CONVERTER_INPUT_LENGTH);
    fireEvent.change(mainInput(), { target: { value: exact } });
    expect(props.onInputChange).toHaveBeenCalledWith(exact);
    expect(screen.queryByText(/limit for this tool/)).toBeNull();
  });

  it('trims a 1,025-character paste to 1,024 and says so in a status region', () => {
    const props = setup({ inputVal: '', autoDetect: autoDetectBase('') });
    fireEvent.change(mainInput(), { target: { value: '7'.repeat(MAX_CONVERTER_INPUT_LENGTH + 1) } });
    const passed = (props.onInputChange as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(passed.length).toBe(MAX_CONVERTER_INPUT_LENGTH);
    const notice = screen.getByText(/limit for this tool/);
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toContain('1,024');
  });

  it('trims a huge accidental paste (200,000 characters) instantly', () => {
    const props = setup({ inputVal: '', autoDetect: autoDetectBase('') });
    const t = performance.now();
    fireEvent.change(mainInput(), { target: { value: '9'.repeat(200_000) } });
    expect(performance.now() - t).toBeLessThan(1000);
    expect(((props.onInputChange as ReturnType<typeof vi.fn>).mock.calls[0][0] as string).length).toBe(MAX_CONVERTER_INPUT_LENGTH);
  });

  it('the trim notice clears itself after a few seconds', () => {
    vi.useFakeTimers();
    setup({ inputVal: '', autoDetect: autoDetectBase('') });
    fireEvent.change(mainInput(), { target: { value: '7'.repeat(MAX_CONVERTER_INPUT_LENGTH + 5) } });
    expect(screen.queryByText(/limit for this tool/)).not.toBeNull();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText(/limit for this tool/)).toBeNull();
  });
});

describe('ConversionInput — base pills', () => {
  it('renders all five base pills; Custom Base spans the full row on the 2-column mobile grid only', () => {
    setup({ inputVal: '255', autoDetect: autoDetectBase('255') });
    const pills = Array.from(document.querySelectorAll('button')).filter(b => /^(Decimal|Binary|Octal|Hexadecimal|Custom)/i.test(b.textContent ?? '') || /BIN|OCT|DEC|HEX|CUSTOM/i.test(b.textContent ?? ''));
    const custom = pills.find(b => /custom/i.test(b.textContent ?? ''));
    expect(custom).toBeTruthy();
    expect(custom!.className).toContain('col-span-2');
    expect(custom!.className).toContain('sm:col-span-1');
    const others = pills.filter(b => b !== custom && /(bin|oct|dec|hex)/i.test(b.textContent ?? ''));
    for (const b of others) expect(b.className).not.toContain('col-span-2');
  });
});

describe('ConversionInput — temporarily incomplete input is a hint, not an error', () => {
  it('shows a neutral hint with no alert semantics and no aria-invalid', () => {
    setup({ inputVal: '0.', autoDetect: autoDetectBase('0.'), incompleteHint: 'Waiting for digits after the point.' });
    const hint = screen.getByTestId('incomplete-notice');
    expect(hint.textContent).toBe('Waiting for digits after the point.');
    expect(hint.getAttribute('role')).toBeNull();
    expect(hint.getAttribute('aria-live')).toBeNull();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect((input.getAttribute('aria-describedby') ?? '').split(' ')).toContain('bitforge-main-incomplete');
    expect(document.getElementById('bitforge-main-error')).toBeNull();
  });

  it('shows no hint for ordinary or erroneous input', () => {
    setup({ inputVal: '12', autoDetect: autoDetectBase('12') });
    expect(screen.queryByTestId('incomplete-notice')).toBeNull();
  });

  it('a real error still renders as an error', () => {
    setup({ inputVal: 'G.', autoDetect: autoDetectBase('G.'), errorMessage: 'Input "G." contains characters invalid for Base 10.' });
    expect(document.getElementById('bitforge-main-error')?.textContent).toContain('invalid');
    expect(screen.queryByTestId('incomplete-notice')).toBeNull();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
