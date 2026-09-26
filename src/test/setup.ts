/**
 * Shared helpers for jsdom-based tests. Imported explicitly by the tests that
 * need them (rather than a global setupFile) so node-environment suites stay
 * untouched.
 */
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/** Resets DOM, storage and location between tests so files/cases can't leak state into each other. */
export function installDomIsolation(): void {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    window.history.replaceState(null, '', '/');
  });
  afterEach(async () => {
    cleanup();
    // jsdom performs history traversals (back/forward) asynchronously; let any
    // still-pending one land *after* unmount so it can't fire into the next test.
    await flush(30);
  });
}

/** Lets pending promises and timers flush (Web-Lock style async work, hashchange dispatch). */
export const flush = (ms = 0) => new Promise<void>(resolve => setTimeout(resolve, ms));
