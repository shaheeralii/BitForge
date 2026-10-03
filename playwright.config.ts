import { defineConfig } from '@playwright/test';

/**
 * Browser smoke suite (e2e/). Deliberately small: it drives the *production
 * build* in a real Chromium to catch what unit tests cannot — routing,
 * theme switching without a reload, real clipboard, real input limits and
 * responsive layout.
 *
 *   npx playwright install chromium     # once
 *   npm run test:e2e
 *
 * Point it at any deployment instead of a local build with
 *   BITFORGE_E2E_URL=https://bitforge-tool.vercel.app npm run test:e2e
 *
 * BITFORGE_CHROMIUM_PATH lets constrained environments (containers with no
 * Playwright browser download) use an existing Chromium binary.
 */
const externalUrl = process.env.BITFORGE_E2E_URL;
const chromiumPath = process.env.BITFORGE_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: externalUrl ?? 'http://localhost:4173',
    browserName: 'chromium',
    launchOptions: chromiumPath
      ? {
          executablePath: chromiumPath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
            '--in-process-gpu',
          ],
        }
      : {},
  },
  webServer: externalUrl
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
