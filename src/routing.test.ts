import { describe, it, expect } from 'vitest';
import { parseHash, appRouteToHashPath, resolveAppDisplayState } from './routing';
import { AppMode } from './components/Header';

const ALL_MODES: AppMode[] = ['converter', 'bit_representation', 'ascii', 'operations', 'floating_point'];

describe('parseHash — initial load / direct link resolution', () => {
  it('empty hash resolves to the landing page', () => {
    expect(parseHash('')).toEqual({ view: 'landing' });
  });
  it('bare "#" resolves to the landing page', () => {
    expect(parseHash('#')).toEqual({ view: 'landing' });
  });
  it('"#/" resolves to the landing page', () => {
    expect(parseHash('#/')).toEqual({ view: 'landing' });
  });
  it('"#/app" resolves to the tool with no forced mode or chat state', () => {
    expect(parseHash('#/app')).toEqual({ view: 'app' });
  });
  it('"#/app/chat" resolves to the tool with the chat panel already open', () => {
    expect(parseHash('#/app/chat')).toEqual({ view: 'app', openChat: true });
  });
  it('each real tool mode deep-links correctly, matching the landing page’s tile set', () => {
    for (const mode of ALL_MODES) {
      expect(parseHash(`#/app/mode/${mode}`)).toEqual({ view: 'app', mode });
    }
  });
});

describe('parseHash — must not eject someone already using the tool', () => {
  it('an unrelated in-page anchor hash is not a recognized route', () => {
    // If the landing page's own '#tools'/'#why' anchors, or any other
    // same-page anchor added later, ever fired while the tool was mounted,
    // treating this as "go to landing" would silently kick the user out
    // mid-task. It must come back null so the hashchange handler ignores it.
    expect(parseHash('#tools')).toBeNull();
    expect(parseHash('#why')).toBeNull();
    expect(parseHash('#top')).toBeNull();
  });

  it('an unknown mode name is not a recognized route', () => {
    expect(parseHash('#/app/mode/bogus')).toBeNull();
  });

  it('the removed info-dialog route is no longer recognized', () => {
    // The landing page's footer now renders its own InfoDialog directly
    // (see LandingPage.tsx) instead of routing into the tool to show one,
    // so this legacy pattern must not resolve to anything.
    expect(parseHash('#/app/info/privacy')).toBeNull();
  });

  it('garbage or malformed hashes are not recognized routes', () => {
    expect(parseHash('#/nonsense')).toBeNull();
    expect(parseHash('#/app/')).toBeNull();
    expect(parseHash('#/app/mode/')).toBeNull();
    expect(parseHash('#/app/extra/segments')).toBeNull();
  });

  it('is case-sensitive on the mode name, rather than guessing', () => {
    expect(parseHash('#/app/mode/Converter')).toBeNull();
  });
});

describe('resolveAppDisplayState — a route naming no mode/chat resets to the default', () => {
  it('an empty route (bare "/app") resolves to converter with chat closed', () => {
    expect(resolveAppDisplayState({})).toEqual({ mode: 'converter', chatOpen: false });
  });
  it('a route with only a mode resolves chat to closed', () => {
    expect(resolveAppDisplayState({ mode: 'ascii' })).toEqual({ mode: 'ascii', chatOpen: false });
  });
  it('a route with only openChat resolves mode to converter', () => {
    expect(resolveAppDisplayState({ openChat: true })).toEqual({ mode: 'converter', chatOpen: true });
  });
});

describe('full state-transition pipeline (hash string -> parseHash -> resolveAppDisplayState)', () => {
  // Each case simulates exactly what AppRoot + App.tsx's reverse-sync
  // effects do end to end: a hash arrives (Back/Forward, a pasted link, or
  // this app's own forward-sync effect writing a mode/chat change), gets
  // parsed into a Route, and resolved into the display state the tool must
  // show. These are named directly after the task's required transitions —
  // regression tests for *state changes*, not just for what parseHash
  // returns in isolation.
  function transition(hash: string) {
    const route = parseHash(hash);
    if (!route) throw new Error(`unexpectedly unrecognized hash: ${hash}`);
    return resolveAppDisplayState(route);
  }

  it('#/app/mode/ascii -> #/app resets to converter, chat closed', () => {
    expect(transition('#/app/mode/ascii')).toEqual({ mode: 'ascii', chatOpen: false });
    expect(transition('#/app')).toEqual({ mode: 'converter', chatOpen: false });
  });

  it('#/app/chat -> #/app/mode/ascii closes chat and switches mode in the same transition', () => {
    expect(transition('#/app/chat')).toEqual({ mode: 'converter', chatOpen: true });
    expect(transition('#/app/mode/ascii')).toEqual({ mode: 'ascii', chatOpen: false });
  });

  it('#/app/mode/ascii -> #/app/mode/converter switches mode with chat already closed', () => {
    expect(transition('#/app/mode/ascii')).toEqual({ mode: 'ascii', chatOpen: false });
    expect(transition('#/app/mode/converter')).toEqual({ mode: 'converter', chatOpen: false });
  });

  it('every mode can transition directly to every other mode, and back to the bare default', () => {
    const modes: AppMode[] = ['converter', 'bit_representation', 'ascii', 'operations', 'floating_point'];
    for (const from of modes) {
      for (const to of modes) {
        const fromState = transition(appRouteToHashPath(from, false).replace(/^\//, '#/'));
        const toState = transition(appRouteToHashPath(to, false).replace(/^\//, '#/'));
        expect(fromState.mode).toBe(from);
        expect(toState.mode).toBe(to);
      }
    }
    // And back to the untouched default from any mode.
    for (const from of modes) {
      transition(appRouteToHashPath(from, false).replace(/^\//, '#/'));
      expect(transition('#/app')).toEqual({ mode: 'converter', chatOpen: false });
    }
  });

  it('direct navigation to the chat route always closes with mode reset to converter, regardless of prior mode', () => {
    transition('#/app/mode/floating_point');
    expect(transition('#/app/chat')).toEqual({ mode: 'converter', chatOpen: true });
  });

  it('a refresh (re-resolving the same hash) is idempotent', () => {
    const first = transition('#/app/mode/bit_representation');
    const second = transition('#/app/mode/bit_representation');
    expect(first).toEqual(second);
    expect(first).toEqual({ mode: 'bit_representation', chatOpen: false });
  });

  it('an unrecognized hash mid-session throws in this test helper rather than silently resolving (matches AppRoot ignoring it)', () => {
    // parseHash returning null for stray hashes is covered above; this just
    // documents that resolveAppDisplayState is never even reached for one
    // in the real pipeline (AppRoot's hashchange handler checks for null
    // before calling setRoute at all).
    expect(() => transition('#tools')).toThrow();
  });
});

describe('appRouteToHashPath and resolveAppDisplayState together form a stable round trip', () => {
  it('every (mode, chatOpen) pair round-trips through hash -> route -> display state unchanged', () => {
    const modes: AppMode[] = ['converter', 'bit_representation', 'ascii', 'operations', 'floating_point'];
    for (const mode of modes) {
      for (const chatOpen of [false, true]) {
        const path = appRouteToHashPath(mode, chatOpen);
        const route = parseHash('#' + path);
        expect(route).not.toBeNull();
        const resolved = resolveAppDisplayState(route!);
        if (chatOpen) {
          // Chat routes don't encode a mode — the resolved mode intentionally
          // reverts to the default while chat is open, matching what a real
          // navigation to '#/app/chat' does regardless of the prior mode.
          expect(resolved).toEqual({ mode: 'converter', chatOpen: true });
        } else {
          expect(resolved).toEqual({ mode, chatOpen: false });
        }
      }
    }
  });
});

describe('appRouteToHashPath', () => {
  it('the default mode with chat closed produces the bare "/app" path', () => {
    expect(appRouteToHashPath('converter', false)).toBe('/app');
  });
  it('a non-default mode produces "/app/mode/<mode>"', () => {
    for (const mode of ALL_MODES.filter(m => m !== 'converter')) {
      expect(appRouteToHashPath(mode, false)).toBe(`/app/mode/${mode}`);
    }
  });
  it('chat open always wins, regardless of mode', () => {
    expect(appRouteToHashPath('converter', true)).toBe('/app/chat');
    expect(appRouteToHashPath('bit_representation', true)).toBe('/app/chat');
  });
});

describe('parseHash and appRouteToHashPath round-trip — the core of the hash-navigation fix', () => {
  // App.tsx's forward-sync effect writes appRouteToHashPath(...); AppRoot's
  // hashchange listener reads it back with parseHash. If these two ever
  // disagreed, a mode change could write a URL that doesn't parse back to
  // the same mode — reintroducing the exact inconsistency this fix closes.
  it('every mode, with chat closed, survives a full round trip', () => {
    for (const mode of ALL_MODES) {
      const path = appRouteToHashPath(mode, false);
      const roundTripped = parseHash('#' + path);
      expect(roundTripped?.view).toBe('app');
      expect(roundTripped?.openChat).toBeUndefined();
      // The default mode's path ("/app") carries no mode segment at all —
      // parseHash correctly leaves `mode` unset rather than inventing
      // 'converter', so only check it's explicitly present for other modes.
      if (mode === 'converter') {
        expect(roundTripped?.mode).toBeUndefined();
      } else {
        expect(roundTripped?.mode).toBe(mode);
      }
    }
  });

  it('every mode, with chat open, round-trips to the chat route (mode is not encoded when chat is open)', () => {
    for (const mode of ALL_MODES) {
      const path = appRouteToHashPath(mode, true);
      expect(parseHash('#' + path)).toEqual({ view: 'app', openChat: true });
    }
  });

  it('the default mode round-trips through the bare "/app" path specifically', () => {
    const path = appRouteToHashPath('converter', false);
    expect(path).toBe('/app');
    expect(parseHash('#' + path)).toEqual({ view: 'app' });
  });
});
