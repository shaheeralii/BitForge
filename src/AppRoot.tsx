import React, { useCallback, useEffect, useState } from 'react';
import App from './App';
import { LandingPage } from './components/LandingPage';
import { AppMode } from './components/Header';
import { Route, parseHash } from './routing';

export default function AppRoot() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash) ?? { view: 'landing' });

  useEffect(() => {
    const onHashChange = () => {
      const next = parseHash(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);

  const enterApp = useCallback(() => navigate('/app'), [navigate]);
  const openTool = useCallback((mode: AppMode) => navigate(`/app/mode/${mode}`), [navigate]);
  const openChat = useCallback(() => navigate('/app/chat'), [navigate]);

  if (route.view === 'app') {
    // App owns activeMode/isChatOpen as real state, not these props directly
    // — but it does react to them changing after mount (a genuine external
    // hashchange, e.g. Back/Forward or a fresh link), and separately keeps
    // the URL in sync with its own state via history.replaceState. See the
    // two effects in App.tsx, and routing.ts's appRouteToHashPath, for how
    // those stay consistent without fighting each other or the user's own
    // clicks.
    return <App initialMode={route.mode} initialChatOpen={route.openChat} />;
  }

  return <LandingPage onEnterApp={enterApp} onOpenTool={openTool} onOpenChat={openChat} />;
}
