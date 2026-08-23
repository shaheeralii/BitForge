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
    let scene: FlowWaveScene | null = null;
    try {
      scene = new FlowWaveScene(canvasRef.current);
    } catch (e) {
      // Fail silently to a plain gradient background if WebGL is unavailable.
      console.warn('FlowWaveScene failed to initialize:', e);
    }
    return () => scene?.dispose();
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
