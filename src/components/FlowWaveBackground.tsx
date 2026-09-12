import React, { useEffect, useRef } from 'react';
import { FlowWaveScene } from '../three/FlowWaveScene';
import { useTheme } from '../context/ThemeContext';

/**
 * Full-viewport animated particle-wave backdrop. Its color palette follows
 * the selected app theme (see ThemeContext) — bright emerald for the
 * original theme, a restrained neutral tint for Premium Dark — via
 * FlowWaveScene.setTheme(), which re-tints in place without rebuilding the
 * WebGL scene.
 * Fixed behind all app content (z-index: 0), pointer-events disabled so it
 * never intercepts clicks. App surfaces sit on top using translucent /
 * backdrop-blurred "glass" panels so the wave reads through them.
 */
export const FlowWaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FlowWaveScene | null>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const create = () => {
      try {
        sceneRef.current = new FlowWaveScene(canvas, themeRef.current);
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
  }, []);

  // Re-tint the already-running scene when the theme changes, instead of
  // tearing down and recreating the whole WebGL scene.
  useEffect(() => {
    sceneRef.current?.setTheme(theme);
  }, [theme]);

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
