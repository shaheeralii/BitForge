import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HistoryProvider } from './context/HistoryContext';
import { ShortcutTargetProvider } from './context/ShortcutTargetContext';
import { getPerfTier } from './utils/devicePerf';
import './index.css';

// Set before first paint (not inside a component) so there's no flash of
// full-fat blur effects that then have to be stripped back out a frame
// later. CSS in index.css keys off this attribute to disable the heaviest
// backdrop-filter blur on lower-powered devices.
document.documentElement.dataset.fx = getPerfTier() === 'low' ? 'reduced' : 'full';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HistoryProvider>
      <ShortcutTargetProvider>
        <App />
      </ShortcutTargetProvider>
    </HistoryProvider>
  </StrictMode>,
);
