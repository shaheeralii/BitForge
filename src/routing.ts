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
 * BitForge is otherwise a single-view SPA (App.tsx switches "modes" with
 * plain useState, not a route each), so pulling in a routing library for
 * one more screen would be a lot of new surface for very little gained.
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
 * matters for the hashchange listener in AppRoot.tsx, not just the initial
 * load: if anything ever adds an in-page anchor (the landing page's own
 * '#tools'/'#why' links, e.g.) while a route change here treated every
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
 * whatever was already displayed alone". That distinction was the actual
 * routing-consistency bug: App.tsx's first version of its reverse-sync
 * effects checked `if (initialMode && initialMode !== activeMode)`, so for
 * a route with no mode at all, the condition was simply false and nothing
 * happened. Navigating from '#/app/mode/ascii' back to bare '#/app' — or
 * from '#/app/chat' to '#/app/mode/ascii', which needs chat to close —
 * left the tool showing stale state instead of resetting.
 *
 * App.tsx's two reverse-sync effects both call this and only update React
 * state when the result disagrees with what's currently displayed.
 */
export function resolveAppDisplayState(route: Pick<Route, 'mode' | 'openChat'>): AppDisplayState {
  return {
    mode: route.mode ?? 'converter',
    chatOpen: route.openChat ?? false,
  };
}

/**
 * The inverse of `parseHash`'s 'app' routes: given what's currently
 * displayed inside the tool, produces the hash path that should be in the
 * URL bar. App.tsx's forward-sync effect (state -> URL, via
 * `history.replaceState`) calls this on every mode/chat change so the URL
 * never goes stale after the initial navigation — the bug this whole
 * routing module addresses was that switching modes inside the tool left
 * the address bar frozen on whatever mode/chat state the tool happened to
 * start on, and conversely that a hash change arriving from outside
 * (Back/Forward, a pasted link) had no effect on what App.tsx displayed,
 * because it only ever consumed `initialMode`/`initialChatOpen` once, at
 * mount. App.tsx now also reacts to those props changing after mount — see
 * its two effects — closing both directions.
 *
 * Kept here, next to `parseHash`, specifically so the round-trip between
 * the two is directly testable (see routing.test.ts) rather than only
 * indirectly through App.tsx's effects, which need a real DOM to exercise.
 */
export function appRouteToHashPath(mode: AppMode, chatOpen: boolean): string {
  if (chatOpen) return '/app/chat';
  return mode === 'converter' ? '/app' : `/app/mode/${mode}`;
}
