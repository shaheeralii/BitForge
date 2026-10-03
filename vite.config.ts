import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {APP_VERSION} from './src/version';
import {injectAppVersion} from './src/utils/htmlVersion';

// Stamps the release version from src/version.ts into index.html (see
// src/utils/htmlVersion.ts). `order: 'pre'` runs before Vite's own %ENV%
// substitution so the placeholder is never mistaken for an env variable.
const appVersionPlugin = (): Plugin => ({
  name: 'bitforge-app-version',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => injectAppVersion(html, APP_VERSION),
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), appVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
