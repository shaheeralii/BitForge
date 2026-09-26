import { vi } from 'vitest';

/**
 * Stand-in for FlowWaveScene in jsdom (which has no WebGL). It records what a
 * real scene would cost — each instance stands for one WebGL context + one
 * render loop — so tests can assert "exactly one live scene", "disposed on
 * Plain", "restored with the right palette".
 */
export interface FakeScene {
  canvas: HTMLCanvasElement;
  theme: string;
  disposed: boolean;
  setThemeCalls: string[];
}

export const scenes: FakeScene[] = [];
export const liveScenes = () => scenes.filter(s => !s.disposed);
export const resetScenes = () => { scenes.length = 0; };

export class FakeFlowWaveScene implements FakeScene {
  canvas: HTMLCanvasElement;
  theme: string;
  disposed = false;
  setThemeCalls: string[] = [];
  constructor(canvas: HTMLCanvasElement, theme: string = 'emerald') {
    this.canvas = canvas;
    this.theme = theme;
    scenes.push(this);
  }
  setTheme(theme: string) {
    this.theme = theme;
    this.setThemeCalls.push(theme);
  }
  dispose() {
    this.disposed = true;
  }
}

export const mockFlowWaveModule = () => ({ FlowWaveScene: FakeFlowWaveScene });
export { vi };
