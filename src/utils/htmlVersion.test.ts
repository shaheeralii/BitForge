import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_VERSION } from '../version';
import { APP_VERSION_PLACEHOLDER, injectAppVersion } from './htmlVersion';

const root = resolve(__dirname, '../..');
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string };

describe('production-verifiable version marker', () => {
  it('index.html carries the placeholder on <html data-app-version> and in JSON-LD, never a hard-coded number', () => {
    expect(indexHtml).toMatch(new RegExp(`<html[^>]*data-app-version="${APP_VERSION_PLACEHOLDER}"`));
    expect(indexHtml).toContain(`"version": "${APP_VERSION_PLACEHOLDER}"`);
    // A literal version here would be able to drift from src/version.ts.
    expect(indexHtml).not.toContain(`data-app-version="${APP_VERSION}"`);
  });

  it('injectAppVersion stamps every occurrence with the single source of truth', () => {
    const out = injectAppVersion(indexHtml, APP_VERSION);
    expect(out).not.toContain(APP_VERSION_PLACEHOLDER);
    expect(out).toContain(`data-app-version="${APP_VERSION}"`);
    expect(out).toContain(`"version": "${APP_VERSION}"`);
  });

  it('src/version.ts and package.json stay in sync', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
});
