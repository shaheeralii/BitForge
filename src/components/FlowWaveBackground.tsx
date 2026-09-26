import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { FlowWaveScene } from '../three/FlowWaveScene';
import { useTheme } from '../context/ThemeContext';

/**
 * Full-viewport animated particle-wave backdrop, in two layers:
 *
 *  1. `#bf-base-bg` — a static, always-mounted layer painted with the theme's
 *     `--bf-app-bg`. It is the page's base surface under EVERY theme, so what
 *     the person sees never depends on whether a canvas has finished being
 *     created or torn down.
 *  2. `#flow-wave-scene` — the WebGL canvas, an enhancement stacked above the
 *     base layer for Emerald/Premium only.
 *
 * Plain has no animated backdrop at all: this component never constructs a
 * FlowWaveScene — no WebGL context, no render loop, no Three.js work of any
 * kind — while theme === 'plain', and the canvas element itself is not
 * rendered. Switching into Plain unmounts the canvas and disposes the scene;
 * switching out of Plain mounts a fresh canvas and builds a fresh scene;
 * switching between Emerald and Premium re-tints the running scene in place
 * (no rebuild).
 *
 * Belt and braces for the Plain switch: index.css also hides
 * `#flow-wave-scene` under `html[data-theme="plain"]`. ThemeProvider sets that
 * attribute in the same commit that unmounts the canvas, so the last WebGL
 * frame can never remain visible even if React's passive-effect cleanup runs
 * a frame later.
 *
 * Fixed behind all app content (z-index: 0), pointer-events disabled so it
 * never intercepts clicks. App surfaces sit on top using translucent /
 * backdrop-blurred "glass" panels so the wave reads through them (except
 * under Plain, where index.css turns those panels solid instead).
 */
export const FlowWaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FlowWaveScene | null>(null);
  const { theme } = useTheme();
  const isPlain = theme === 'plain';

  // Always holds the *current* theme. The lifecycle effect below is keyed on
  // `isPlain` only (so Emerald <-> Premium does not rebuild the scene), which
  // means anything it defines closes over the theme from when it last ran.
  // WebGL context restoration happens long after that — so `create()` must
  // read the theme from this ref at call time, not from a closure, or a
  // restored Premium scene would be rebuilt with Emerald's palette (or vice
  // versa). Layout effect: updated before any passive effect or event can
  // observe it.
  const themeRef = useRef(theme);
  useLayoutEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Scene lifecycle: exists exactly while a canvas is mounted (non-Plain).
  useEffect(() => {
    if (isPlain) return; // Plain: no canvas is rendered, so nothing to build.
    const canvas = canvasRef.current;
    if (!canvas) return;

    const create = () => {
      const current = themeRef.current;
      if (current === 'plain') return; // Never build WebGL for Plain.
      try {
        sceneRef.current = new FlowWaveScene(canvas, current);
      } catch (e) {
        // Fail silently to the static base layer if WebGL is unavailable.
        console.warn('FlowWaveScene failed to initialize:', e);
        sceneRef.current = null;
      }
    };

    // Mobile browsers (iOS Safari and Android Chrome especially) can kill a
    // page's WebGL context under memory pressure or when a tab is
    // backgrounded, well after the scene has already started rendering fine.
    // Calling preventDefault() is required for the browser to attempt
    // restoration at all; on restore the scene is rebuilt from scratch (the
    // old context's GPU resources are gone) using the CURRENT theme.
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    const handleContextRestored = () => {
      sceneRef.current?.dispose(); // defensive: never leave two scenes alive
      sceneRef.current = null;
      create();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    create();

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [isPlain]);

  // Re-tint the already-running scene when switching between the two
  // FlowWave variants. No-op under Plain, where sceneRef is always null.
  useEffect(() => {
    if (theme === 'plain') return;
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <>
      <div
        id="bf-base-bg"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'var(--bf-app-bg)',
        }}
      />
      {!isPlain && (
        <canvas
          ref={canvasRef}
          id="flow-wave-scene"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            pointerEvents: 'none',
            background: 'var(--bf-app-bg)',
          }}
        />
      )}
    </>
  );
};
