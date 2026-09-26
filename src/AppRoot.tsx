import React, { useCallback, useEffect, useRef, useState } from 'react';
import App from './App';
import { LandingPage } from './components/LandingPage';
import { AppMode } from './components/Header';
import {
  LANDING_STATE,
  RouteState,
  hashToPath,
  parseHash,
  routeStateFromRoute,
  routeStateToHashPath,
  routeStatesEqual,
} from './routing';

type HistoryMode = 'push' | 'replace';

function readInitialRoute(): RouteState {
  // The one place an unrecognized hash (e.g. '#tools') falls back to landing.
  const parsed = parseHash(window.location.hash);
  return parsed ? routeStateFromRoute(parsed) : LANDING_STATE;
}

/**
 * Owns the route — the single source of truth for what is displayed (landing
 * vs. tool, which tool mode, whether the chat panel is open).
 *
 * Every navigation, wherever it comes from (landing tiles, the header logo,
 * mode tabs, the chat launcher, overlays closing chat), goes through
 * `commit`, which updates React state and the URL in the same synchronous
 * call — the UI never waits for an effect or an event to catch up with the
 * URL, or vice versa. `history.pushState`/`replaceState` never fire
 * `hashchange`, so our own writes cannot loop back through the listener.
 *
 * Only navigation that originates *outside* the app arrives via the
 * `hashchange`/`popstate` listener: Back/Forward, a pasted link, a hand-edited
 * hash. Those are compared against what the current state already projects to
 * and ignored if identical, so re-firing the same URL is harmless.
 *
 * History semantics (unchanged from before this refactor): landing <-> app
 * transitions push an entry (Back works); switching mode/chat inside the tool
 * replaces the current entry, so every tab click doesn't add a Back stop.
 */
export default function AppRoot() {
  const [route, setRoute] = useState<RouteState>(readInitialRoute);
  // Mirrors `route` synchronously so `commit` (called from event handlers and
  // from native listeners) always compares against the latest committed state
  // rather than a value captured at render time.
  const routeRef = useRef(route);

  const commit = useCallback((next: RouteState, how: HistoryMode) => {
    const path = routeStateToHashPath(next);
    // Write the URL only if it isn't already showing this route. A same-URL
    // pushState would add a duplicate Back stop; a same-URL write is a no-op
    // for the browser anyway.
    if (hashToPath(window.location.hash) !== path) {
      const url = '#' + path;
      try {
        if (how === 'push') window.history.pushState(null, '', url);
        else window.history.replaceState(null, '', url);
      } catch {
        // history API unavailable/blocked (e.g. sandboxed frame): fall back
        // to plain hash assignment, whose hashchange the listener ignores
        // because state below already matches.
        window.location.hash = url;
      }
    }
    if (routeStatesEqual(routeRef.current, next)) return;
    routeRef.current = next;
    setRoute(next);
  }, []);

  // External navigation only: Back/Forward, pasted links, hand-edited hashes.
  // Both events are listened to (Back/Forward fires both; they resolve to the
  // same comparison and the second is a no-op).
  useEffect(() => {
    const syncFromLocation = () => {
      const parsed = parseHash(window.location.hash);
      // Unrecognized hashes (in-page anchors like '#tools'/'#why') never
      // change the view.
      if (!parsed) return;
      const incoming = routeStateFromRoute(parsed);
      // Already showing exactly what this URL means (including the case where
      // our own state is richer than the URL, e.g. chat open over a mode).
      if (routeStateToHashPath(routeRef.current) === routeStateToHashPath(incoming)) return;
      routeRef.current = incoming;
      setRoute(incoming);
    };
    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncFromLocation);
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  // --- Landing-page navigation (push: Back returns to the landing page) ---
  const enterApp = useCallback(
    () => commit({ view: 'app', mode: 'converter', chatOpen: false }, 'push'),
    [commit],
  );
  const openTool = useCallback(
    (mode: AppMode) => commit({ view: 'app', mode, chatOpen: false }, 'push'),
    [commit],
  );
  const openChatFromLanding = useCallback(
    () => commit({ view: 'app', mode: 'converter', chatOpen: true }, 'push'),
    [commit],
  );
  const goHome = useCallback(() => commit(LANDING_STATE, 'push'), [commit]);

  // --- In-tool navigation (replace: no Back stop per tab click) ---
  // Both read the latest state from the ref so the callbacks handed to App
  // are referentially stable for the life of the component.
  const changeMode = useCallback(
    (mode: AppMode) => {
      // A mode change is a non-chat route, so it also closes chat.
      if (routeRef.current.view !== 'app') return;
      commit({ view: 'app', mode, chatOpen: false }, 'replace');
    },
    [commit],
  );
  const setChatOpen = useCallback(
    (chatOpen: boolean) => {
      const current = routeRef.current;
      if (current.view !== 'app') return;
      // Keep the underlying mode: closing chat returns to the same tool.
      commit({ view: 'app', mode: current.mode, chatOpen }, 'replace');
    },
    [commit],
  );

  if (route.view === 'app') {
    return (
      <App
        mode={route.mode}
        chatOpen={route.chatOpen}
        onModeChange={changeMode}
        onChatOpenChange={setChatOpen}
        onGoHome={goHome}
      />
    );
  }

  return <LandingPage onEnterApp={enterApp} onOpenTool={openTool} onOpenChat={openChatFromLanding} />;
}
