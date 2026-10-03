// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { THEME_STORAGE_KEY } from '../context/themeCore';
import { ThemeSwitcher } from './ThemeSwitcher';
import { installDomIsolation } from '../test/setup';

installDomIsolation();

const trigger = () => screen.getByRole('button', { name: /^Current theme/ });
const items = () => screen.getAllByRole('menuitemradio');
const focusedLabel = () => (document.activeElement?.textContent ?? '').trim();
const key = (el: Element, k: string) => act(() => { fireEvent.keyDown(el, { key: k }); });

function mount(theme: 'emerald' | 'premium' | 'plain' = 'emerald') {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  render(
    <ThemeProvider>
      <button>before</button>
      <ThemeSwitcher />
      <button>after</button>
    </ThemeProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ThemeSwitcher — WAI-ARIA menu-button keyboard behaviour', () => {
  it('opening with a click/Enter moves focus to the checked item', () => {
    mount('premium');
    act(() => { fireEvent.click(trigger()); });
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).toBe(items()[1]);
    expect(items()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('items are focusable by script but are not separate Tab stops', () => {
    mount();
    act(() => { fireEvent.click(trigger()); });
    for (const item of items()) expect(item.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown / ArrowUp move between items and wrap around', () => {
    mount('emerald');
    act(() => { fireEvent.click(trigger()); });
    const menu = screen.getByRole('menu');
    expect(focusedLabel()).toContain('Emerald');
    key(menu, 'ArrowDown'); expect(focusedLabel()).toContain('Premium');
    key(menu, 'ArrowDown'); expect(focusedLabel()).toContain('Plain');
    key(menu, 'ArrowDown'); expect(focusedLabel()).toContain('Emerald'); // wraps to first
    key(menu, 'ArrowUp'); expect(focusedLabel()).toContain('Plain'); // wraps to last
  });

  it('Home and End jump to the first and last item', () => {
    mount('premium');
    act(() => { fireEvent.click(trigger()); });
    const menu = screen.getByRole('menu');
    key(menu, 'End'); expect(focusedLabel()).toContain('Plain');
    key(menu, 'Home'); expect(focusedLabel()).toContain('Emerald');
  });

  it('ArrowDown on the closed trigger opens the menu on the first item; ArrowUp on the last', () => {
    mount('premium');
    key(trigger(), 'ArrowDown');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(focusedLabel()).toContain('Emerald');
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('menu')).toBeNull();

    key(trigger(), 'ArrowUp');
    expect(focusedLabel()).toContain('Plain');
  });

  it('Escape closes the menu and returns focus to the trigger', () => {
    mount();
    act(() => { fireEvent.click(trigger()); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('choosing an item applies the theme, closes the menu and returns focus to the trigger', () => {
    mount('emerald');
    act(() => { fireEvent.click(trigger()); });
    act(() => { fireEvent.click(items()[2]); }); // Enter/Space on a <button> is a click
    expect(document.documentElement.getAttribute('data-theme')).toBe('plain');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('plain');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('tabbing away from the open menu closes it', () => {
    mount();
    act(() => { fireEvent.click(trigger()); });
    const after = screen.getByRole('button', { name: 'after' });
    act(() => { (document.activeElement as HTMLElement).blur(); after.focus(); });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('focus moving between the trigger and its own items does not close the menu', () => {
    mount();
    act(() => { fireEvent.click(trigger()); });
    act(() => { trigger().focus(); });
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});
