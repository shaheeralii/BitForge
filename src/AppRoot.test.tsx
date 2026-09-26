// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import AppRoot from './AppRoot';
import { HistoryProvider } from './context/HistoryContext';
import { ShortcutTargetProvider } from './context/ShortcutTargetContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { THEME_STORAGE_KEY } from './context/themeCore';
import { installDomIsolation, flush } from './test/setup';
import { liveScenes, resetScenes } from './test/fakeFlowWave';

vi.mock('./three/FlowWaveScene', async () => (await import('./test/fakeFlowWave')).mockFlowWaveModule());

installDomIsolation();
beforeEach(() => {
  resetScenes();
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  }
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  // jsdom has no Element.scrollTo (the chat panel auto-scrolls its log).
  Element.prototype.scrollTo = Element.prototype.scrollTo || (() => {});
});

const MODES = [
  { id: 'converter', tab: 'Number Converter', path: '/app' },
  { id: 'bit_representation', tab: 'Bit Representation', path: '/app/mode/bit_representation' },
  { id: 'ascii', tab: 'Text & ASCII', path: '/app/mode/ascii' },
  { id: 'operations', tab: 'Binary Operations', path: '/app/mode/operations' },
  { id: 'floating_point', tab: 'Floating Point', path: '/app/mode/floating_point' },
] as const;

const mountAt = (hash: string) => {
  window.history.replaceState(null, '', '/' + hash);
  return render(
    <ThemeProvider>
      <HistoryProvider>
        <ShortcutTargetProvider>
          <ChatProvider>
            <AppRoot />
          </ChatProvider>
        </ShortcutTargetProvider>
      </HistoryProvider>
    </ThemeProvider>,
  );
};

// --- observation helpers: what is ACTUALLY rendered, and what the URL says ---
// The landing hero headline splits across spans, so match on the h1's full text.
const onLanding = () => [...document.querySelectorAll('h1')].some(h => /See how computers actually count/i.test(h.textContent ?? ''));
const activeTab = () => document.querySelector('header nav button[aria-current="page"]')?.textContent?.trim() ?? null;
const chatOpen = () => !!screen.queryByRole('dialog', { name: /BitForge AI learning assistant/i });
const hash = () => window.location.hash;
const canvasCount = () => document.querySelectorAll('#flow-wave-scene').length;
// Scoped to the header nav: WelcomeBanner repeats the same labels as buttons.
const clickTab = (label: string) => act(() => {
  const nav = document.querySelector('header nav') as HTMLElement;
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(label, 'i') }));
});
const clickLogo = () => act(() => { fireEvent.click(screen.getByRole('link', { name: /back to the bitforge landing page/i })); });
const go = async (fn: () => void) => { await act(async () => { fn(); await flush(20); }); };

describe('initial load / deep links', () => {
  it('no hash -> landing', () => { mountAt(''); expect(onLanding()).toBe(true); });
  it('"#/" -> landing', () => { mountAt('#/'); expect(onLanding()).toBe(true); });
  it('"#/app" -> converter, chat closed', () => {
    mountAt('#/app');
    expect(onLanding()).toBe(false);
    expect(activeTab()).toBe('Number Converter');
    expect(chatOpen()).toBe(false);
  });
  for (const m of MODES) {
    it(`deep link ${m.path} -> ${m.tab}`, () => {
      mountAt('#' + m.path);
      expect(activeTab()).toBe(m.tab);
      expect(chatOpen()).toBe(false);
    });
  }
  it('"#/app/chat" -> converter with chat open', () => {
    mountAt('#/app/chat');
    expect(activeTab()).toBe('Number Converter');
    expect(chatOpen()).toBe(true);
  });
  it('landing-page anchors ("#tools", "#why") on first load are landing, not app routes', () => {
    for (const h of ['#tools', '#why', '#top', '#/nonsense', '#/app/mode/bogus']) {
      const { unmount } = mountAt(h);
      expect(onLanding()).toBe(true);
      unmount();
    }
  });
});

describe('landing -> tool navigation (centralized, URL + UI together)', () => {
  it('a tool tile opens that tool and the URL matches in the same tick', () => {
    mountAt('#/');
    act(() => { fireEvent.click(screen.getByText('Text & UTF-8').closest('button')!); });
    expect(hash()).toBe('#/app/mode/ascii');
    expect(activeTab()).toBe('Text & ASCII');
    expect(onLanding()).toBe(false);
  });
  it('the BitForge AI tile opens the tool with chat open', () => {
    mountAt('#/');
    act(() => { fireEvent.click(screen.getByText('BitForge AI').closest('button')!); });
    expect(hash()).toBe('#/app/chat');
    expect(chatOpen()).toBe(true);
  });
});

describe('REPORTED PROBLEM: logo -> landing, no refresh, from every tool', () => {
  for (const m of MODES) {
    it(`from ${m.tab}: landing is shown immediately, URL is "#/", no tool/canvas/chat left behind`, () => {
      mountAt('#' + m.path);
      expect(canvasCount()).toBe(1);
      expect(liveScenes()).toHaveLength(1);

      clickLogo(); // synchronous: no waiting on hashchange, no refresh

      expect(onLanding()).toBe(true);
      expect(hash()).toBe('#/');
      expect(document.querySelector('header nav button[aria-current="page"]')).toBeNull();
      expect(canvasCount()).toBe(0);
      expect(liveScenes()).toHaveLength(0); // FlowWave torn down, not leaked
      expect(chatOpen()).toBe(false);
    });
  }

  it('from the chat route: chat/modal state does not leak into the landing page', () => {
    mountAt('#/app/chat');
    expect(chatOpen()).toBe(true);
    clickLogo();
    expect(onLanding()).toBe(true);
    expect(chatOpen()).toBe(false);
    expect(hash()).toBe('#/');
  });

  it('from a tool after the mode was changed via tabs (URL rewritten in place)', () => {
    mountAt('#/app');
    clickTab('Floating Point');
    clickTab('Bit Representation');
    clickLogo();
    expect(onLanding()).toBe(true);
    expect(hash()).toBe('#/');
  });

  it('opening History / Shortcuts / Info first, then the logo, still lands cleanly', () => {
    mountAt('#/app/mode/ascii');
    act(() => { fireEvent.click(screen.getByRole('button', { name: /activity history/i })); });
    clickLogo();
    expect(onLanding()).toBe(true);
    expect(hash()).toBe('#/');
  });

  it('a modified click (ctrl) is left to the browser and does not navigate in-app', () => {
    mountAt('#/app');
    act(() => { fireEvent.click(screen.getByRole('link', { name: /back to the bitforge landing page/i }), { ctrlKey: true }); });
    expect(onLanding()).toBe(false);
  });

  it('the logo is still a real link to the landing route', () => {
    mountAt('#/app');
    expect(screen.getByRole('link', { name: /back to the bitforge landing page/i }).getAttribute('href')).toBe('#/');
  });
});

describe('in-tool navigation: URL and UI change together, without extra history entries', () => {
  it('mode A -> mode B updates the URL in place (no new history entry)', () => {
    mountAt('#/app');
    const before = window.history.length;
    clickTab('Text & ASCII');
    expect(activeTab()).toBe('Text & ASCII');
    expect(hash()).toBe('#/app/mode/ascii');
    clickTab('Binary Operations');
    expect(hash()).toBe('#/app/mode/operations');
    expect(window.history.length).toBe(before);
  });

  it('every mode can reach every other mode and back to the converter, URL always matching', () => {
    mountAt('#/app');
    for (const from of MODES) {
      for (const to of MODES) {
        clickTab(from.tab);
        clickTab(to.tab);
        expect(activeTab()).toBe(to.tab);
        expect(hash()).toBe('#' + to.path);
      }
      clickTab('Number Converter');
      expect(hash()).toBe('#/app');
    }
  });

  it('landing -> tool pushes exactly one history entry', () => {
    mountAt('#/');
    const before = window.history.length;
    act(() => { fireEvent.click(screen.getByText('Number Converter').closest('button')!); });
    expect(window.history.length).toBe(before + 1);
  });

  it('opening History while chat is open closes chat and rewrites the URL to the mode route', () => {
    mountAt('#/app/mode/ascii');
    act(() => { fireEvent.click(screen.getByRole('button', { name: /open bitforge ai learning assistant/i })); });
    expect(chatOpen()).toBe(true);
    expect(hash()).toBe('#/app/chat');
    act(() => { fireEvent.click(screen.getByRole('button', { name: /activity history/i })); });
    expect(chatOpen()).toBe(false);
    expect(hash()).toBe('#/app/mode/ascii'); // mode preserved under chat, restored on close
    expect(activeTab()).toBe('Text & ASCII');
  });
});

describe('browser Back / Forward and externally-changed hashes', () => {
  it('Back from the tool returns to landing; Forward returns to the same tool', async () => {
    mountAt('#/');
    act(() => { fireEvent.click(screen.getByText('Text & UTF-8').closest('button')!); });
    expect(activeTab()).toBe('Text & ASCII');

    await go(() => window.history.back());
    expect(onLanding()).toBe(true);
    expect(hash()).toBe('#/');

    await go(() => window.history.forward());
    expect(onLanding()).toBe(false);
    expect(activeTab()).toBe('Text & ASCII');
    expect(hash()).toBe('#/app/mode/ascii');
  });

  it('logo then Back returns to the tool', async () => {
    mountAt('#/');
    act(() => { fireEvent.click(screen.getByText('Number Converter').closest('button')!); });
    clickTab('Floating Point');
    clickLogo();
    expect(onLanding()).toBe(true);
    await go(() => window.history.back());
    expect(onLanding()).toBe(false);
    expect(activeTab()).toBe('Floating Point');
  });

  it('REGRESSION: re-navigating to a mode URL the router already "had" still switches the display', async () => {
    // Old bug: App mirrored the route into its own state, so once the tab
    // moved to the converter (URL rewritten to #/app), a hash edit back to
    // "#/app/mode/ascii" produced a prop that looked unchanged to App's
    // effect and the display stayed on the converter while the URL said ascii.
    mountAt('#/');
    await go(() => { window.location.hash = '/app/mode/ascii'; });
    expect(activeTab()).toBe('Text & ASCII');
    clickTab('Number Converter');
    expect(hash()).toBe('#/app');
    await go(() => { window.location.hash = '/app/mode/ascii'; });
    expect(activeTab()).toBe('Text & ASCII');
    expect(hash()).toBe('#/app/mode/ascii');
  });

  it('REGRESSION: re-navigating to #/app/chat after closing chat reopens it', async () => {
    mountAt('#/app/chat');
    expect(chatOpen()).toBe(true);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /close bitforge ai/i })); });
    expect(chatOpen()).toBe(false);
    expect(hash()).toBe('#/app');
    await go(() => { window.location.hash = '/app/chat'; });
    expect(chatOpen()).toBe(true);
  });

  it('#/app/mode/X -> bare #/app resets to converter (a route naming no mode means the default)', async () => {
    mountAt('#/app/mode/ascii');
    await go(() => { window.location.hash = '/app'; });
    expect(activeTab()).toBe('Number Converter');
  });

  it('#/app/chat -> #/app/mode/ascii closes chat and switches mode in one transition', async () => {
    mountAt('#/app/chat');
    await go(() => { window.location.hash = '/app/mode/ascii'; });
    expect(chatOpen()).toBe(false);
    expect(activeTab()).toBe('Text & ASCII');
  });

  it('an in-page anchor hash while using the tool does not eject the user', async () => {
    mountAt('#/app/mode/ascii');
    for (const h of ['tools', 'why', 'top', '/nonsense']) {
      await go(() => { window.location.hash = h; });
      expect(onLanding()).toBe(false);
      expect(activeTab()).toBe('Text & ASCII');
    }
  });

  it('from an anchor-only landing URL ("#tools"), entering the app still works', async () => {
    mountAt('#/');
    await go(() => { window.location.hash = 'tools'; });
    expect(onLanding()).toBe(true);
    act(() => { fireEvent.click(screen.getByText('Binary Operations').closest('button')!); });
    expect(hash()).toBe('#/app/mode/operations');
    expect(activeTab()).toBe('Binary Operations');
  });
});

describe('REPORTED PROBLEM: theme switch to Plain from inside the tool, no refresh', () => {
  const pick = (label: string) => {
    act(() => { fireEvent.click(screen.getByTitle('Switch background theme')); });
    act(() => { fireEvent.click(screen.getByRole('menuitemradio', { name: new RegExp(label, 'i') })); });
  };
  it('Emerald -> Plain -> Premium -> Plain -> Emerald through the real header control', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'emerald');
    mountAt('#/app');
    const html = document.documentElement;
    expect(html.getAttribute('data-theme')).toBe('emerald');
    expect(canvasCount()).toBe(1);

    pick('Plain');
    expect(html.getAttribute('data-theme')).toBe('plain');
    expect(canvasCount()).toBe(0);
    expect(liveScenes()).toHaveLength(0);

    pick('Premium');
    expect(html.getAttribute('data-theme')).toBe('premium');
    expect(canvasCount()).toBe(1);
    expect(liveScenes()).toHaveLength(1);

    pick('Plain');
    expect(canvasCount()).toBe(0);
    expect(liveScenes()).toHaveLength(0);

    pick('Emerald');
    expect(html.getAttribute('data-theme')).toBe('emerald');
    expect(canvasCount()).toBe(1);
    expect(liveScenes()).toHaveLength(1);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('emerald');
  });

  it('a theme change made in another tab is reflected here without reload', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'emerald');
    mountAt('#/app');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'plain', storageArea: window.localStorage }));
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('plain');
    expect(canvasCount()).toBe(0);
    expect(liveScenes()).toHaveLength(0);
  });
});
