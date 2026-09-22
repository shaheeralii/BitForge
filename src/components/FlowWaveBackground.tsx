import React, { useEffect, useRef } from 'react';
import { FlowWaveScene } from '../three/FlowWaveScene';
import { useTheme } from '../context/ThemeContext';

/**
 * Full-viewport animated particle-wave backdrop. Its color palette follows
 * the selected app theme (see ThemeContext) — bright emerald for the
 * original theme, a restrained neutral tint for Premium Dark — via
 * FlowWaveScene.setTheme(), which re-tints in place without rebuilding the
 * WebGL scene.
 *
 * Plain is the exception: it has no animated backdrop at all. This
 * component never constructs a FlowWaveScene — no WebGL context, no
 * render loop, no Three.js work of any kind — while theme === 'plain'
 * (not just a hidden canvas), so Plain carries none of FlowWave's runtime
 * cost. Switching into or out of Plain creates or tears down the scene;
 * switching between Emerald and Premium re-tints the already-running one,
 * exactly as before.
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

  useEffect(() => {
    if (!canvasRef.current) return;

    if (theme === 'plain') {
      // Normally unreachable: under Plain this component renders null, so
      // canvasRef.current is already null and the guard above returns first.
      // Kept as a belt-and-braces teardown in case that render path ever
      // changes back to keeping a mounted-but-inactive canvas.
      sceneRef.current?.dispose();
      sceneRef.current = null;
      return;
    }

    const canvas = canvasRef.current;

    const create = () => {
      try {
        sceneRef.current = new FlowWaveScene(canvas, theme);
      } catch (e) {
        // Fail silently to a plain gradient background if WebGL is unavailable.
        console.warn('FlowWaveScene failed to initialize:', e);
        sceneRef.current = null;
      }
    };

    // Mobile browsers (iOS Safari and Android Chrome especially) can kill a
    // page's WebGL context under memory pressure or when a tab is
    // backgrounded, well after the scene has already started rendering
    // fine. Without handling this, the canvas silently stops updating and
    // just shows its flat background color instead of the animated scene.
    // Calling preventDefault() here is required for the browser to attempt
    // restoration at all; on restore, the whole scene is rebuilt from
    // scratch since the old context's GPU resources are gone.
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };

    const handleContextRestored = () => {
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
    // Deliberately keyed on whether theme IS Plain, not the exact theme
    // value: entering/leaving Plain needs a full create/teardown, but an
    // Emerald <-> Premium change should re-tint the running scene in place
    // (handled by the effect below) rather than rebuild it from scratch.
  }, [theme === 'plain']); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-tint the already-running scene when switching between the two
  // FlowWave variants. No-op under Plain, where sceneRef is always null.
  useEffect(() => {
    if (theme === 'plain') return;
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  // Under Plain the <canvas> is removed from the DOM entirely rather than
  // left mounted and blanked. A canvas that has ever had a WebGL context
  // keeps showing its last drawing-buffer contents until something repaints
  // it, and disposing the scene (stopping the loop, freeing GPU resources)
  // does not itself repaint anything — which is why switching into Plain
  // could strand the final FlowWave frame on screen until a refresh.
  // Clearing the buffer during dispose was not a reliable fix: it depends on
  // the GL context still being valid at teardown, and a throw there happens
  // inside an effect cleanup, which takes the React tree down with it.
  // Unmounting sidesteps all of that — no element, no context, no stale
  // pixels, nothing to clear. The backdrop is not lost: html/body/#root all
  // carry `background: var(--bf-app-bg)` (index.css), so the themed
  // background keeps painting via CSS the moment data-theme changes.
  if (theme === 'plain') return null;

  return (
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
  );
};
