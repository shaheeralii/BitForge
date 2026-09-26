import { AppMode } from './components/Header';

const APP_MODES: readonly AppMode[] = ['converter', 'bit_representation', 'ascii', 'operations', 'floating_point'];

function isAppMode(value: string): value is AppMode {
  return (APP_MODES as readonly string[]).includes(value);
}

export interface Route {
  view: 'landing' | 'app';
  mode?: AppMode;
  openChat?: boolean;
}

/**
 * BitForge is a small SPA, so pulling in a routing library for a handful of
 * screens would be a lot of new surface for very little gained. AppRoot.tsx
 * owns the current route as React state — the ONE source of truth for which
 * view, tool mode and chat state are displayed — and this module is the pure
 * translation layer between that state and `location.hash`. Nothing else
 * holds a second copy of the route: App.tsx is a controlled component that
 * receives its mode/chat state as props and asks AppRoot to navigate.
 * This reads/writes only `location.hash`, which needs no server-side
 * rewrite rule to work: unlike a path-based route (e.g. '/app'), the hash
 * portion of a URL is never sent to the server, so a direct visit or a
 * refresh on any hash always serves index.html and resolves client-side.
 * That property is exactly what "don't break on refresh/deploy" requires
 * here, and it holds regardless of which host this ends up deployed on.
 *
 * Routes recognized:
 *   '' | '#' | '#/'              -> landing page
 *   '#/app'                      -> the tool, default mode
 *   '#/app/mode/<mode>'          -> the tool, with <mode> already selected
 *   '#/app/chat'                 -> the tool, with BitForge AI already open
 * Anything else returns null rather than forcing a view change. This
 * matters for the hashchange/popstate listener in AppRoot.tsx, not just the
 * initial load: if anything ever adds an in-page anchor (the landing page's
 * own '#tools'/'#why' links, e.g.) while a route change here treated every
 * unrecognized hash as "go to landing", that anchor would silently eject
 * someone from the middle of using the tool. Only a hash that actually
 * names a known destination is allowed to change the view; AppRoot's
 * initial-load call site is the only place an unrecognized hash falls back
 * to landing.
 *
 * The landing page's own About/Help/Privacy/Terms/Disclaimer no longer
 * route through here at all — it renders its own InfoDialog directly (see
 * LandingPage.tsx) rather than entering the tool to show one, which is what
 * used to make clicking "Privacy" on the landing page flash the Number
 * Converter behind the dialog.
 */
export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, ''); // '#/app/mode/ascii' -> 'app/mode/ascii'
  if (path === '') return { view: 'landing' };
  if (path === 'app') return { view: 'app' };
  if (path === 'app/chat') return { view: 'app', openChat: true };
  const modeMatch = path.match(/^app\/mode\/([a-z_]+)$/);
  if (modeMatch && isAppMode(modeMatch[1])) return { view: 'app', mode: modeMatch[1] };
  return null;
}

export interface AppDisplayState {
  mode: AppMode;
  chatOpen: boolean;
}

/**
 * Maps a parsed route's mode/chat fields to the app's resulting display
 * state. The property this exists to guarantee, and to let be tested
 * directly without a DOM: a route naming no mode or chat (bare '#/app')
 * resolves to the *default* state (converter, chat closed) — not "leave
 * whatever was already displayed alone". Navigating from '#/app/mode/ascii'
 * back to bare '#/app', or from '#/app/chat' to '#/app/mode/ascii' (which
 * needs chat to close), must reset the tool rather than leave it showing
 * stale state.
 *
 * AppRoot.tsx calls this for every route that arrives from outside the app
 * (initial load, Back/Forward, a pasted link, a hash edited by hand).
 */
export function resolveAppDisplayState(route: Pick<Route, 'mode' | 'openChat'>): AppDisplayState {
  return {
    mode: route.mode ?? 'converter',
    chatOpen: route.openChat ?? false,
  };
}

/**
 * The inverse of `parseHash`'s 'app' routes: given what's displayed inside
 * the tool, produces the hash path that belongs in the URL bar. Chat wins
 * over mode ('#/app/chat' means "converter + chat" when loaded cold), which
 * is why the URL is a lossy projection of the route state — AppRoot keeps
 * the underlying mode while chat is open so closing the panel returns to the
 * tool the person was actually using.
 *
 * Kept here, next to `parseHash`, so the round-trip between the two is
 * directly testable (see routing.test.ts).
 */
export function appRouteToHashPath(mode: AppMode, chatOpen: boolean): string {
  if (chatOpen) return '/app/chat';
  return mode === 'converter' ? '/app' : `/app/mode/${mode}`;
}

/**
 * Everything AppRoot needs to render: the fully-resolved route. Unlike
 * `Route` (what a URL can express — optional fields, chat XOR mode), this is
 * total: an 'app' state always has a concrete mode and chat flag.
 */
export type RouteState =
  | { view: 'landing' }
  | { view: 'app'; mode: AppMode; chatOpen: boolean };

export const LANDING_STATE: RouteState = { view: 'landing' };

export function routeStateFromRoute(route: Route): RouteState {
  if (route.view === 'landing') return LANDING_STATE;
  const { mode, chatOpen } = resolveAppDisplayState(route);
  return { view: 'app', mode, chatOpen };
}

/** The hash path ('/', '/app', '/app/mode/x', '/app/chat') a state projects to. */
export function routeStateToHashPath(state: RouteState): string {
  return state.view === 'landing' ? '/' : appRouteToHashPath(state.mode, state.chatOpen);
}

export function routeStatesEqual(a: RouteState, b: RouteState): boolean {
  if (a.view === 'landing' || b.view === 'landing') return a.view === b.view;
  return a.mode === b.mode && a.chatOpen === b.chatOpen;
}

/**
 * Normalizes a raw `location.hash` ('', '#', '#/', '#/app/...') into the same
 * path form `routeStateToHashPath` produces, so "is the URL already showing
 * this route?" is a plain string comparison. Empty/bare hashes are landing.
 */
export function hashToPath(hash: string): string {
  const path = hash.replace(/^#/, '');
  return path === '' ? '/' : path;
}
