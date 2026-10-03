/**
 * Build-time version stamping for index.html.
 *
 * `src/version.ts` is the single source of truth for the release version.
 * index.html carries the placeholder below in two places — the
 * `data-app-version` attribute on <html> (a stable, production-verifiable
 * marker: `document.documentElement.dataset.appVersion`, or a plain `curl`)
 * and the JSON-LD `version` — and the Vite plugin in vite.config.ts replaces
 * it with APP_VERSION when the page is served or built. Nothing is duplicated
 * by hand, so the marker cannot drift from the visible version badge.
 */
export const APP_VERSION_PLACEHOLDER = '__APP_VERSION__';

export function injectAppVersion(html: string, version: string): string {
  return html.split(APP_VERSION_PLACEHOLDER).join(version);
}
