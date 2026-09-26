import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoot from './AppRoot.tsx';
import { HistoryProvider } from './context/HistoryContext';
import { ShortcutTargetProvider } from './context/ShortcutTargetContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { applyThemeToDocument, getInitialTheme } from './context/themeCore';
import { APP_VERSION } from './version';
import { getPerfTier } from './utils/devicePerf';
import './index.css';

// Set before first paint (not inside a component) so there's no flash of
// full-fat blur effects that then have to be stripped back out a frame
// later. CSS in index.css keys off this attribute to disable the heaviest
// backdrop-filter blur on lower-powered devices.
document.documentElement.dataset.fx = getPerfTier() === 'low' ? 'reduced' : 'full';

// Same idea, for the selected color theme: applied synchronously so the
// persisted choice renders immediately instead of flashing the default
// theme for a frame. ThemeProvider reads the same stored value for its own
// initial state and re-applies it through the same function, so the two
// never disagree.
applyThemeToDocument(getInitialTheme());

// Lets a deployed build be identified from DevTools (`<html data-app-version>`)
// without digging through hashed asset names.
document.documentElement.dataset.appVersion = APP_VERSION;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <HistoryProvider>
        <ShortcutTargetProvider>
          <ChatProvider>
            <AppRoot />
          </ChatProvider>
        </ShortcutTargetProvider>
      </HistoryProvider>
    </ThemeProvider>
  </StrictMode>,
);
