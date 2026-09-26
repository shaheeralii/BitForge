// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { FlowWaveBackground } from './FlowWaveBackground';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { Theme, THEME_STORAGE_KEY } from '../context/themeCore';
import { installDomIsolation } from '../test/setup';
import { FakeFlowWaveScene, liveScenes, resetScenes, scenes } from '../test/fakeFlowWave';

// The factory is hoisted above the imports, so it must load the fake lazily.
vi.mock('../three/FlowWaveScene', async () => (await import('../test/fakeFlowWave')).mockFlowWaveModule());

installDomIsolation();
beforeEach(resetScenes);

let api!: ReturnType<typeof useTheme>;
const Harness: React.FC = () => { api = useTheme(); return <FlowWaveBackground />; };
const mount = (initial: Theme) => {
  localStorage.setItem(THEME_STORAGE_KEY, initial);
  return render(<ThemeProvider><Harness /></ThemeProvider>);
};
const canvas = () => document.getElementById('flow-wave-scene') as HTMLCanvasElement | null;
const base = () => document.getElementById('bf-base-bg');
const setTheme = (t: Theme) => act(() => api.setTheme(t));

describe('FlowWaveBackground — theme transitions (no reload)', () => {
  it('Emerald -> Premium re-tints in place: same canvas, same scene, no rebuild', () => {
    mount('emerald');
    const c = canvas();
    const [scene] = liveScenes();
    expect(scenes).toHaveLength(1);

    setTheme('premium');

    expect(canvas()).toBe(c);
    expect(scenes).toHaveLength(1);
    expect(liveScenes()).toEqual([scene]);
    // (FlowWaveScene.setTheme is a no-op when the theme is unchanged, so the
    // mount-time call with the same theme is harmless; what matters is the last one.)
    expect(scene.setThemeCalls.at(-1)).toBe('premium');
    expect(scene.theme).toBe('premium');
  });

  it('Premium -> Emerald re-tints in place, in reverse', () => {
    mount('premium');
    const [scene] = liveScenes();
    setTheme('emerald');
    expect(scenes).toHaveLength(1);
    expect(scene.theme).toBe('emerald');
  });

  for (const from of ['emerald', 'premium'] as Theme[]) {
    it(`${from} -> Plain: canvas gone immediately, scene disposed, nothing left alive`, () => {
      mount(from);
      expect(canvas()).not.toBeNull();
      const [scene] = liveScenes();

      setTheme('plain');

      expect(canvas()).toBeNull();
      expect(document.querySelectorAll('canvas')).toHaveLength(0);
      expect(scene.disposed).toBe(true);
      expect(liveScenes()).toHaveLength(0);
      expect(document.documentElement.getAttribute('data-theme')).toBe('plain');
      // The static base layer stays mounted and is what shows under Plain.
      expect(base()).not.toBeNull();
    });
  }

  for (const to of ['emerald', 'premium'] as Theme[]) {
    it(`Plain -> ${to}: a NEW canvas and exactly one NEW scene, built with ${to}'s palette`, () => {
      mount('plain');
      expect(canvas()).toBeNull();
      expect(scenes).toHaveLength(0); // Plain never builds WebGL

      setTheme(to);

      expect(canvas()).not.toBeNull();
      expect(scenes).toHaveLength(1);
      expect(liveScenes()).toHaveLength(1);
      expect(scenes[0].theme).toBe(to);
      expect(scenes[0].canvas).toBe(canvas());
    });
  }

  it('Premium -> Plain -> Premium: old scene disposed, exactly one fresh scene, no stale Premium reuse', () => {
    mount('premium');
    const first = liveScenes()[0];
    setTheme('plain');
    setTheme('premium');
    expect(first.disposed).toBe(true);
    expect(liveScenes()).toHaveLength(1);
    expect(liveScenes()[0]).not.toBe(first);
    expect(scenes).toHaveLength(2);
  });

  it('Emerald -> Plain -> Premium builds Premium, not a reused Emerald scene', () => {
    mount('emerald');
    setTheme('plain');
    setTheme('premium');
    expect(liveScenes()).toHaveLength(1);
    expect(liveScenes()[0].theme).toBe('premium');
  });

  it('many rapid toggles never leak scenes or canvases', () => {
    mount('emerald');
    const order: Theme[] = ['plain', 'premium', 'emerald', 'plain', 'emerald', 'premium', 'plain', 'premium'];
    for (const t of order) {
      setTheme(t);
      expect(liveScenes().length).toBe(t === 'plain' ? 0 : 1);
      expect(document.querySelectorAll('#flow-wave-scene').length).toBe(t === 'plain' ? 0 : 1);
    }
  });

  it('unmounting the component disposes the scene', () => {
    const { unmount } = mount('emerald');
    unmount();
    expect(liveScenes()).toHaveLength(0);
  });

  it('the static base layer is present under every theme', () => {
    mount('emerald');
    for (const t of ['premium', 'plain', 'emerald'] as Theme[]) {
      setTheme(t);
      expect(base()).not.toBeNull();
    }
  });
});

describe('FlowWaveBackground — WebGL context loss / restore uses the CURRENT theme', () => {
  const lose = (c: HTMLCanvasElement) => act(() => { c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); });
  const restore = (c: HTMLCanvasElement) => act(() => { c.dispatchEvent(new Event('webglcontextrestored')); });

  it('context lost disposes the scene and calls preventDefault (required for restoration)', () => {
    mount('premium');
    const ev = new Event('webglcontextlost', { cancelable: true });
    act(() => { canvas()!.dispatchEvent(ev); });
    expect(ev.defaultPrevented).toBe(true);
    expect(liveScenes()).toHaveLength(0);
  });

  it('Premium active -> lose -> restore: restored scene is Premium', () => {
    mount('premium');
    const c = canvas()!;
    lose(c);
    restore(c);
    expect(liveScenes()).toHaveLength(1);
    expect(liveScenes()[0].theme).toBe('premium');
  });

  it('Emerald active -> lose -> restore: restored scene is Emerald', () => {
    mount('emerald');
    const c = canvas()!;
    lose(c);
    restore(c);
    expect(liveScenes()).toHaveLength(1);
    expect(liveScenes()[0].theme).toBe('emerald');
  });

  it('REGRESSION (stale closure): mounted as Emerald, switched to Premium, then lose+restore -> restored scene is Premium', () => {
    // The lifecycle effect is keyed on `theme === 'plain'` only, so it does
    // NOT re-run on Emerald -> Premium. A restore handler that closed over
    // the theme from mount time would rebuild with Emerald's palette here.
    mount('emerald');
    setTheme('premium');
    const c = canvas()!;
    lose(c);
    restore(c);
    expect(liveScenes()).toHaveLength(1);
    expect(liveScenes()[0].theme).toBe('premium');
  });

  it('same regression in reverse: mounted as Premium, switched to Emerald, lose+restore -> Emerald', () => {
    mount('premium');
    setTheme('emerald');
    const c = canvas()!;
    lose(c);
    restore(c);
    expect(liveScenes()[0].theme).toBe('emerald');
  });

  it('a restore event never leaves two live scenes', () => {
    mount('emerald');
    const c = canvas()!;
    restore(c); // restore without a preceding loss
    expect(liveScenes()).toHaveLength(1);
  });

  it('after switching to Plain, stray context events on the old canvas do nothing', () => {
    mount('premium');
    const old = canvas()!;
    setTheme('plain');
    act(() => { old.dispatchEvent(new Event('webglcontextrestored')); });
    expect(liveScenes()).toHaveLength(0);
  });
});

describe('FakeFlowWaveScene sanity', () => {
  it('records construction', () => {
    const s = new FakeFlowWaveScene(document.createElement('canvas'), 'premium');
    expect(scenes).toContain(s);
  });
});
