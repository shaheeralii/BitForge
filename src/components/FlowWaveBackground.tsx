import React, { useEffect, useRef } from 'react';
import { FlowWaveScene } from '../three/FlowWaveScene';

/**
 * Full-viewport animated emerald/mint particle-wave backdrop.
 * Fixed behind all app content (z-index: 0), pointer-events disabled so it
 * never intercepts clicks. App surfaces sit on top using translucent /
 * backdrop-blurred "glass" panels so the wave reads through them.
 */
export const FlowWaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let scene: FlowWaveScene | null = null;

    const create = () => {
      try {
        scene = new FlowWaveScene(canvas);
      } catch (e) {
        // Fail silently to a plain gradient background if WebGL is unavailable.
        console.warn('FlowWaveScene failed to initialize:', e);
        scene = null;
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
      scene?.dispose();
      scene = null;
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
      scene?.dispose();
    };
  }, []);

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
        background: '#02160c',
      }}
    />
  );
};
