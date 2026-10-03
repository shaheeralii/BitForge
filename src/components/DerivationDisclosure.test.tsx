// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DerivationDisclosure } from './DerivationDisclosure';
import { StepByStepBreakdown } from './StepByStepBreakdown';
import { convertTypedInput } from '../utils/converter';
import { installDomIsolation } from '../test/setup';

installDomIsolation();

// Long enough for the collapse animation's grace period (300ms + margin).
const PAST_COLLAPSE_MS = 400;
const elementCount = (root: HTMLElement) => root.querySelectorAll('*').length;
const toggle = () => screen.getByRole('button', { name: /toggle/i });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DerivationDisclosure (lazy-mounted body)', () => {
  const renderDisclosure = (props: Partial<React.ComponentProps<typeof DerivationDisclosure>> = {}) =>
    render(
      <DerivationDisclosure toggleLabel="Toggle body" bar={<span>Bar</span>} {...props}>
        <p data-testid="body">Expensive body</p>
      </DerivationDisclosure>
    );

  it('does not mount the body while closed (default)', () => {
    renderDisclosure();
    expect(screen.queryByTestId('body')).toBeNull();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the controlled region in the DOM so aria-controls always resolves', () => {
    const { container } = renderDisclosure();
    const controls = toggle().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    const region = container.querySelector(`[id="${controls}"]`);
    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('region');
  });

  it('mounts the body immediately on open and reports aria-expanded', () => {
    renderDisclosure();
    fireEvent.click(toggle());
    expect(screen.getByTestId('body')).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('opens and closes from the keyboard (Enter, then Space) with focus staying on the toggle', async () => {
    // user-event and Testing Library's async helpers need real timers; the
    // unmount grace period is ~350ms of real time here.
    vi.useRealTimers();
    const user = userEvent.setup();
    renderDisclosure();
    await user.tab();
    expect(document.activeElement).toBe(toggle());

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('body')).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(toggle());

    await user.keyboard(' ');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByTestId('body')).toBeNull());
    expect(document.activeElement).toBe(toggle());
  });

  it('keeps the body through the collapse animation, then unmounts it', () => {
    renderDisclosure({ defaultOpen: true });
    expect(screen.getByTestId('body')).toBeTruthy();

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false'); // intent is reflected at once
    expect(screen.getByTestId('body')).toBeTruthy(); // ...but content survives the animation

    act(() => {
      vi.advanceTimersByTime(PAST_COLLAPSE_MS);
    });
    expect(screen.queryByTestId('body')).toBeNull();
  });

  it('re-opening during the collapse animation cancels the unmount', () => {
    renderDisclosure({ defaultOpen: true });
    fireEvent.click(toggle()); // close
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(toggle()); // re-open before the grace period ends
    act(() => {
      vi.advanceTimersByTime(PAST_COLLAPSE_MS);
    });
    expect(screen.getByTestId('body')).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('can open again after a full close', () => {
    renderDisclosure();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    act(() => {
      vi.advanceTimersByTime(PAST_COLLAPSE_MS);
    });
    expect(screen.queryByTestId('body')).toBeNull();
    fireEvent.click(toggle());
    expect(screen.getByTestId('body')).toBeTruthy();
  });

  it('unmounts without waiting when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    renderDisclosure({ defaultOpen: true });
    fireEvent.click(toggle());
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('body')).toBeNull();
  });

  it('keeps the visual collapse classes and the toggle chevron state unchanged', () => {
    const { container } = renderDisclosure();
    const region = container.querySelector('[role="region"]') as HTMLElement;
    expect(region.className).toContain('grid-rows-[0fr]');
    expect(region.className).toContain('transition-[grid-template-rows]');
    expect(region.className).toContain('motion-reduce:transition-none');
    fireEvent.click(toggle());
    expect(region.className).toContain('grid-rows-[1fr]');
  });
});

describe('Number Converter derivation (StepByStepBreakdown)', () => {
  const convert = (text: string, base: '2' | '10' = '10') => convertTypedInput(text, base, '2', 12);
  const renderBreakdown = (text: string, base: '2' | '10' = '10') =>
    render(<StepByStepBreakdown conversion={convert(text, base)} targetBase="2" customRadix={12} />);

  it('ordinary input: closed shows only the bar, open shows the steps, closed again removes them', () => {
    const { container } = renderBreakdown('255.625');
    expect(screen.getByText('Step-by-Step Derivation')).toBeTruthy(); // bar content is unchanged
    expect(screen.queryByText('Step Outcome:')).toBeNull();
    expect(screen.queryByText('BitForge Engine Logic verified')).toBeNull();
    const closedCount = elementCount(container);

    fireEvent.click(toggle());
    expect(screen.getAllByText('Step Outcome:').length).toBeGreaterThan(0);
    expect(screen.getByText('BitForge Engine Logic verified')).toBeTruthy();
    expect(elementCount(container)).toBeGreaterThan(closedCount);

    fireEvent.click(toggle());
    act(() => {
      vi.advanceTimersByTime(PAST_COLLAPSE_MS);
    });
    expect(screen.queryByText('Step Outcome:')).toBeNull();
    expect(elementCount(container)).toBe(closedCount);
  });

  it('1,024-digit input: no derivation DOM while closed, full derivation when opened, gone when closed again', () => {
    const digits = '7'.repeat(1024);
    const { container } = renderBreakdown(digits);

    // Closed: only the toggle bar and the empty region — a few dozen nodes, not the ~20,000 the
    // always-mounted body produced for this exact input.
    const closedCount = elementCount(container);
    expect(closedCount).toBeLessThan(100);
    expect(container.querySelectorAll('table, tr, td').length).toBe(0);

    fireEvent.click(toggle());
    const openCount = elementCount(container);
    expect(openCount).toBeGreaterThan(5_000);
    expect(container.querySelectorAll('table').length).toBeGreaterThan(0);

    fireEvent.click(toggle());
    act(() => {
      vi.advanceTimersByTime(PAST_COLLAPSE_MS);
    });
    expect(elementCount(container)).toBe(closedCount);
    expect(container.querySelectorAll('table, tr, td').length).toBe(0);
  });

  it('changing the input while closed never builds derivation DOM', () => {
    const { container, rerender } = renderBreakdown('255.625');
    const baseline = elementCount(container);
    for (const text of ['1'.repeat(300), '9'.repeat(1024), '42', '3'.repeat(700)]) {
      rerender(<StepByStepBreakdown conversion={convert(text)} targetBase="2" customRadix={12} />);
      expect(elementCount(container), text.slice(0, 8)).toBeLessThan(baseline + 20);
      expect(container.querySelectorAll('table, tr, td').length).toBe(0);
    }
  });

  it('while open, the derivation follows the input (live re-render is preserved)', () => {
    const { container, rerender } = renderBreakdown('10');
    fireEvent.click(toggle());
    const small = elementCount(container);
    rerender(<StepByStepBreakdown conversion={convert('7'.repeat(200))} targetBase="2" customRadix={12} />);
    expect(elementCount(container)).toBeGreaterThan(small);
  });

  it('still shows the dashed "no derivation" panel for an invalid input', () => {
    renderBreakdown('xyz');
    expect(screen.getByText('No mathematical derivation available')).toBeTruthy();
  });
});
