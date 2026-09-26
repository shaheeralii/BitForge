import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic tests run in plain Node. Tests that need a DOM (React
    // components, providers, routing integration) opt in per file with a
    // `// @vitest-environment jsdom` docblock, so the fast utility suites
    // don't pay for jsdom startup.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  },
  esbuild: {
    // Component tests are .tsx; use the automatic JSX runtime like the app.
    jsx: 'automatic',
  },
});
