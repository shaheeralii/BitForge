// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { THEME_CHROME, THEME_STORAGE_KEY, Theme } from './themeCore';
import { installDomIsolation } from '../test/setup';

installDomIsolation();

let api!: ReturnType<typeof useTheme>;
const Probe: React.FC = () => {
  api = useTheme();
  return <span data-testid="theme">{api.theme}</span>;
};
const mount = () => render(<ThemeProvider><Probe /></ThemeProvider>);
const dataTheme = () => document.documentElement.getAttribute('data-theme');
const shown = () => screen.getByTestId('theme').textContent;

function storageEvent(newValue: string | null, key = THEME_STORAGE_KEY) {
  return new StorageEvent('storage', { key, newValue, storageArea: window.localStorage });
}

describe('ThemeProvider — one authoritative theme, one DOM write path', () => {
  const ALL: Theme[] = ['emerald', 'premium', 'plain'];
  for (const from of ALL) {
    for (const to of ALL) {
      if (from === to) continue;
      it(`${from} -> ${to}: React state, data-theme, and persistence all change in the same act()`, () => {
        localStorage.setItem(THEME_STORAGE_KEY, from);
        mount();
        expect(shown()).toBe(from);
        expect(dataTheme()).toBe(from);

        act(() => api.setTheme(to));

        expect(shown()).toBe(to);
        expect(dataTheme()).toBe(to);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(to);
      });
    }
  }

  it('initial DOM attribute follows the initial React state (saved choice)', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'premium');
    mount();
    expect(dataTheme()).toBe('premium');
  });

  it('theme-color follows the active theme', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000">';
    mount();
    for (const t of ['premium', 'plain', 'emerald'] as Theme[]) {
      act(() => api.setTheme(t));
      expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(THEME_CHROME[t].background);
    }
    document.head.innerHTML = '';
  });

  it('setTheme ignores an invalid value at runtime', () => {
    mount();
    act(() => api.setTheme('bogus' as Theme));
    expect(shown()).toBe('emerald');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('toggleTheme cycles emerald -> premium -> plain -> emerald', () => {
    mount();
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) { act(() => api.toggleTheme()); seen.push(shown()!); }
    expect(seen).toEqual(['premium', 'plain', 'emerald']);
  });
});

describe('ThemeProvider — multi-tab synchronization via the storage event', () => {
  it("Tab A's change updates Tab B with no reload (state AND data-theme)", () => {
    mount(); // this is "Tab B"
    expect(shown()).toBe('emerald');
    act(() => { window.dispatchEvent(storageEvent('plain')); });
    expect(shown()).toBe('plain');
    expect(dataTheme()).toBe('plain');
    act(() => { window.dispatchEvent(storageEvent('premium')); });
    expect(shown()).toBe('premium');
    expect(dataTheme()).toBe('premium');
  });

  it('ignores invalid, removed, or unrelated storage changes', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'premium');
    mount();
    act(() => { window.dispatchEvent(storageEvent('neon')); });
    act(() => { window.dispatchEvent(storageEvent(null)); });
    act(() => { window.dispatchEvent(storageEvent('plain', 'some_other_key')); });
    expect(shown()).toBe('premium');
    expect(dataTheme()).toBe('premium');
  });

  it('ignores sessionStorage events for the same key', () => {
    mount();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'plain', storageArea: window.sessionStorage }));
    });
    expect(shown()).toBe('emerald');
  });

  it('never writes back what it received (no ping-pong between tabs)', () => {
    mount();
    const original = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (...args: [string, string]) { writes++; return original.apply(this, args); };
    try {
      act(() => { window.dispatchEvent(storageEvent('plain')); });
      expect(writes).toBe(0);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it("stays responsive to the current tab's own choices after receiving a remote one", () => {
    mount();
    act(() => { window.dispatchEvent(storageEvent('plain')); });
    act(() => api.setTheme('emerald'));
    expect(shown()).toBe('emerald');
    expect(dataTheme()).toBe('emerald');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('emerald');
  });

  it('removes its storage listener on unmount', () => {
    const { unmount } = mount();
    unmount();
    document.documentElement.setAttribute('data-theme', 'emerald');
    act(() => { window.dispatchEvent(storageEvent('plain')); });
    expect(dataTheme()).toBe('emerald');
  });
});
